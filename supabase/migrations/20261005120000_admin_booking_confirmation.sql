create or replace function public.recover_payment_email_locks() returns void language sql security definer set search_path='' as $$
 update public.automation_outbox set status='FAILED',locked_at=null,available_at=now(),last_error='Retrying interrupted email delivery'
 where event_type in ('booking.payment_confirmed','booking.admin_confirmed') and status='PROCESSING' and locked_at<now()-interval '5 minutes';
$$;
revoke all on function public.recover_payment_email_locks() from public,anon,authenticated;
grant execute on function public.recover_payment_email_locks() to service_role;

create or replace function public.claim_payment_confirmation_email(outbox_id_value uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  with claimed as (
    update public.automation_outbox
       set status = 'PROCESSING',
           attempts = attempts + 1,
           locked_at = now(),
           last_error = null
     where id = outbox_id_value
       and event_type in ('booking.payment_confirmed','booking.admin_confirmed')
       and status in ('PENDING', 'FAILED')
       and available_at <= now()
     returning id, aggregate_id, attempts, payload, event_type
  ), delivery as (
    insert into public.email_deliveries (outbox_id, booking_id, recipient_email, status, attempts)
    select claimed.id, booking.id, case when claimed.event_type='booking.admin_confirmed' then 'boomcleaninfo@gmail.com' else customer.email end, 'SENDING', claimed.attempts
      from claimed
      join public.bookings booking on booking.id = claimed.aggregate_id
      join public.customers customer on customer.id = booking.customer_id
     where customer.email is not null or claimed.event_type='booking.admin_confirmed'
    on conflict (outbox_id) do update
      set status = 'SENDING', attempts = excluded.attempts, last_error = null
    returning outbox_id
  )
  select case when delivery.outbox_id is null then
    jsonb_build_object('outboxId', claimed.id, 'failure', 'Booking confirmation has no recipient email')
  else jsonb_build_object(
    'outboxId', claimed.id,
    'bookingId', booking.id,
    'bookingNumber', booking.booking_number,
    'recipientName', customer.full_name,
    'recipientEmail', case when claimed.event_type='booking.admin_confirmed' then 'boomcleaninfo@gmail.com' else customer.email end,
    'audience', case when claimed.event_type='booking.admin_confirmed' then 'admin' else 'customer' end,
    'customerEmail', customer.email,
    'customerPhone', customer.phone,
    'serviceName', service.name,
    'scheduledStartAt', booking.scheduled_start_at,
    'scheduledEndAt', booking.scheduled_end_at,
    'address', booking.address,
    'currency', booking.currency,
    'total', coalesce((claimed.payload->>'paymentAmount')::numeric, booking.total)
  ) end into result
    from claimed
    left join delivery on delivery.outbox_id = claimed.id
    join public.bookings booking on booking.id = claimed.aggregate_id
    join public.customers customer on customer.id = booking.customer_id
    join public.services service on service.id = booking.service_id;

  if result is not null and result ? 'failure' then
    -- A claimed event without a usable recipient must not remain locked forever.
    update public.automation_outbox
       set status = 'FAILED', last_error = 'Booking confirmation has no recipient email', locked_at = null
     where id = outbox_id_value and status = 'PROCESSING';
  end if;
  return result;
end;
$$;

create or replace function public.complete_payment_confirmation_email(
  outbox_id_value uuid,
  was_sent boolean,
  provider_value text,
  provider_message_id_value text default null,
  error_value text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed boolean := false;
begin
  if provider_value is null or char_length(trim(provider_value)) < 2 or char_length(trim(provider_value)) > 80 then
    raise exception 'A valid email provider is required' using errcode = '22023';
  end if;

  if was_sent then
    update public.automation_outbox
       set status = 'DELIVERED', delivered_at = now(), locked_at = null, last_error = null
     where id = outbox_id_value and event_type in ('booking.payment_confirmed','booking.admin_confirmed') and status = 'PROCESSING'
     returning true into completed;
  else
    update public.automation_outbox
       set status = 'FAILED',
           locked_at = null,
           last_error = left(coalesce(nullif(trim(error_value), ''), 'Email provider rejected delivery'), 2000),
           available_at = now() + make_interval(secs => (60 * (1::bigint << least(attempts, 6)))::double precision)
     where id = outbox_id_value and event_type in ('booking.payment_confirmed','booking.admin_confirmed') and status = 'PROCESSING'
     returning true into completed;
  end if;

  if not coalesce(completed, false) then
    return false;
  end if;

  update public.email_deliveries
     set provider = trim(provider_value),
         provider_message_id = nullif(trim(provider_message_id_value), ''),
         status = case when was_sent then 'SENT'::public.email_delivery_status else 'FAILED'::public.email_delivery_status end,
         sent_at = case when was_sent then now() else null end,
         last_error = case when was_sent then null else left(coalesce(nullif(trim(error_value), ''), 'Email provider rejected delivery'), 2000) end
   where outbox_id = outbox_id_value;
  return true;
end;
$$;

revoke all on function public.claim_payment_confirmation_email(uuid) from public, anon, authenticated;
revoke all on function public.complete_payment_confirmation_email(uuid, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_payment_confirmation_email(uuid) to service_role;
grant execute on function public.complete_payment_confirmation_email(uuid, boolean, text, text, text) to service_role;


-- Independent durable delivery: customer suppression cannot block the admin alert.
create or replace function public.queue_admin_booking_confirmation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.event_type='booking.payment_confirmed' then
  insert into public.automation_outbox(event_type,aggregate_type,aggregate_id,payload,idempotency_key)
  values('booking.admin_confirmed','booking',new.aggregate_id,new.payload,'admin-confirmation:'||new.id::text)
  on conflict(idempotency_key) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.queue_admin_booking_confirmation() from public,anon,authenticated;
create trigger admin_booking_confirmation after insert on public.automation_outbox
for each row execute function public.queue_admin_booking_confirmation();
