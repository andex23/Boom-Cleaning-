create or replace function public.recover_payment_email_locks() returns void language sql security definer set search_path='' as $$
 update public.automation_outbox set status='FAILED',locked_at=null,available_at=now(),last_error='Retrying interrupted email delivery'
 where event_type='booking.payment_confirmed' and status='PROCESSING' and locked_at<now()-interval '5 minutes';
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
       and event_type = 'booking.payment_confirmed'
       and status in ('PENDING', 'FAILED')
       and available_at <= now()
     returning id, aggregate_id, attempts, payload
  ), delivery as (
    insert into public.email_deliveries (outbox_id, booking_id, recipient_email, status, attempts)
    select claimed.id, booking.id, customer.email, 'SENDING', claimed.attempts
      from claimed
      join public.bookings booking on booking.id = claimed.aggregate_id
      join public.customers customer on customer.id = booking.customer_id
     where customer.email is not null
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
    'recipientEmail', customer.email,
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

