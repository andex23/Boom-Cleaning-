create or replace function public.prepare_flutterwave_payment(booking_number_value bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.bookings%rowtype; p public.payments%rowtype; email_value text;
begin
 select * into b from public.bookings where booking_number=booking_number_value for update;
 if not found or b.status not in ('PENDING','CONFIRMED') or b.currency<>'NGN' or b.total<=0 then raise exception 'Booking is unavailable for payment.' using errcode='22023'; end if;
 if exists(select 1 from public.quotes where id=b.quote_id and requires_review) then raise exception 'This selection has no final published price.' using errcode='22023'; end if;
 select email into email_value from public.customers where id=b.customer_id;
 if email_value is null then raise exception 'Customer email is required.' using errcode='22023'; end if;
 if exists(select 1 from public.payments where booking_id=b.id and status='PAID') then raise exception 'This booking already has a recorded payment.' using errcode='22023'; end if;
 select * into p from public.payments where booking_id=b.id and provider='flutterwave' and status='PENDING' order by created_at limit 1;
 if not found then
  insert into public.payments(booking_id,provider,provider_reference,currency,amount,status)
   values(b.id,'flutterwave','BOOM-flw-'||gen_random_uuid()::text,'NGN',b.total,'PENDING') returning * into p;
 end if;
 if p.amount<>b.total then raise exception 'Booking price changed after checkout was created. Contact BOOM.' using errcode='22023'; end if;
 return jsonb_build_object('reference',p.provider_reference,'url',p.provider_payload->>'authorization_url','amount',p.amount,'email',email_value);
end $$;
revoke all on function public.prepare_flutterwave_payment(bigint) from public,anon,authenticated;
grant execute on function public.prepare_flutterwave_payment(bigint) to service_role;

create or replace function public.settle_flutterwave_payment(reference_value text, amount_minor bigint, currency_value text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.payments%rowtype; b public.bookings%rowtype;
begin
 -- Match creation lock order: booking, then payment.
 select b0.* into b from public.bookings b0 join public.payments p0 on p0.booking_id=b0.id where p0.provider='flutterwave' and p0.provider_reference=reference_value for update of b0;
 select * into p from public.payments where provider='flutterwave' and provider_reference=reference_value for update;
 if not found then raise exception 'Unknown payment'; end if;
 if round(p.amount*100)<>amount_minor or p.currency<>currency_value then raise exception 'Payment mismatch'; end if;
 if p.status='PAID' then return jsonb_build_object('status','PAID'); end if;
 if b.status='PENDING' and b.total=p.amount and b.currency=p.currency then
  update public.bookings set status='CONFIRMED',updated_at=now() where id=b.id;
 end if;
 update public.payments set status='PAID',paid_at=now(),updated_at=now() where id=p.id;
 return jsonb_build_object('status','PAID');
end $$;

create or replace function public.queue_flutterwave_receipt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.provider='flutterwave' and new.status='PAID' and old.status<>'PAID' and exists(select 1 from public.bookings where id=new.booking_id and status='CONFIRMED' and total=new.amount and currency=new.currency) then
  insert into public.automation_outbox(event_type,aggregate_type,aggregate_id,payload,idempotency_key)
  values('booking.payment_confirmed','booking',new.booking_id,jsonb_build_object('testMode',false,'paymentProvider','Flutterwave','paymentAmount',new.amount),'flutterwave-receipt:'||new.id::text)
  on conflict(idempotency_key) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.queue_flutterwave_receipt() from public,anon,authenticated;
create trigger flutterwave_receipt after update of status on public.payments for each row execute function public.queue_flutterwave_receipt();
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
    'mode', case when claimed.payload->>'testMode'='false' then 'live' else 'test' end,
    'paymentProvider', coalesce(claimed.payload->>'paymentProvider','Paystack'),
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

