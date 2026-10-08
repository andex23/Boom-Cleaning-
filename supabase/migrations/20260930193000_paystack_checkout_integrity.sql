create or replace function public.prepare_paystack_test_payment(booking_number_value bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.bookings%rowtype; p public.payments%rowtype; email_value text;
begin
 select * into b from public.bookings where booking_number=booking_number_value for update;
 if not found or b.status not in ('PENDING','CONFIRMED') or b.currency<>'NGN' or b.total<=0 then raise exception 'Booking is unavailable for payment.' using errcode='22023'; end if;
 if exists(select 1 from public.quotes where id=b.quote_id and requires_review) then raise exception 'This selection has no final published price.' using errcode='22023'; end if;
 select email into email_value from public.customers where id=b.customer_id;
 if email_value is null then raise exception 'Customer email is required.' using errcode='22023'; end if;
 if exists(select 1 from public.payments where booking_id=b.id and status='PAID') then raise exception 'This booking already has a recorded payment.' using errcode='22023'; end if;
 select * into p from public.payments where booking_id=b.id and provider='paystack_test' and status='PENDING' order by created_at limit 1;
 if not found then
  insert into public.payments(booking_id,provider,provider_reference,currency,amount,status)
   values(b.id,'paystack_test','BOOM-test-'||gen_random_uuid()::text,'NGN',b.total,'PENDING') returning * into p;
 end if;
 if p.amount<>b.total then raise exception 'Booking price changed after checkout was created. Contact BOOM.' using errcode='22023'; end if;
 return jsonb_build_object('reference',p.provider_reference,'url',p.provider_payload->>'authorization_url','amount',p.amount,'email',email_value);
end $$;
revoke all on function public.prepare_paystack_test_payment(bigint) from public,anon,authenticated;
grant execute on function public.prepare_paystack_test_payment(bigint) to service_role;

create or replace function public.settle_paystack_test_payment(reference_value text, amount_minor bigint, currency_value text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.payments%rowtype; b public.bookings%rowtype;
begin
 -- Match creation lock order: booking, then payment.
 select b0.* into b from public.bookings b0 join public.payments p0 on p0.booking_id=b0.id where p0.provider='paystack_test' and p0.provider_reference=reference_value for update of b0;
 select * into p from public.payments where provider='paystack_test' and provider_reference=reference_value for update;
 if not found then raise exception 'Unknown payment'; end if;
 if round(p.amount*100)<>amount_minor or p.currency<>currency_value then raise exception 'Payment mismatch'; end if;
 if p.status='PAID' then return jsonb_build_object('status','PAID'); end if;
 if b.status='PENDING' and b.total=p.amount and b.currency=p.currency then
  update public.bookings set status='CONFIRMED',updated_at=now() where id=b.id;
 end if;
 update public.payments set status='PAID',paid_at=now(),updated_at=now() where id=p.id;
 return jsonb_build_object('status','PAID');
end $$;
create or replace function public.queue_paystack_test_receipt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.provider='paystack_test' and new.status='PAID' and old.status<>'PAID' and exists(select 1 from public.bookings where id=new.booking_id and status='CONFIRMED' and total=new.amount and currency=new.currency) then
  insert into public.automation_outbox(event_type,aggregate_type,aggregate_id,payload,idempotency_key)
   values('booking.payment_confirmed','booking',new.booking_id,jsonb_build_object('testMode',true,'paymentAmount',new.amount),'paystack-test-receipt:'||new.id::text)
   on conflict(idempotency_key) do nothing;
 end if;
 return new;
end $$;
