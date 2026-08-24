-- Production booking command boundary. This RPC is intentionally executable only
-- by the server's service-role client; browser clients continue to be subject to RLS.

create extension if not exists btree_gist;

-- Until capacity is modelled per crew/team, bookings are conservatively exclusive
-- across the operation. The [) range permits a job ending exactly when another begins.
alter table public.bookings
  add constraint bookings_no_active_schedule_overlap
  exclude using gist (
    tstzrange(scheduled_start_at, scheduled_end_at, '[)') with &&
  ) where (status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS'));

create unique index customers_email_lower_key
  on public.customers (lower(email)) where email is not null;

create or replace function public.create_booking_from_request(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_key text := nullif(trim(request ->> 'idempotencyKey'), '');
  source_value text := coalesce(nullif(trim(request ->> 'source'), ''), 'WEBSITE');
  service_value uuid;
  full_name_value text;
  phone_value text;
  email_value text;
  location_value text;
  subtotal_value numeric(12,2);
  discount_value numeric(12,2);
  quote_currency_value char(3);
  quote_expires_at_value timestamptz;
  start_value timestamptz;
  end_value timestamptz;
  address_value text;
  location_note_value text;
  booking_currency_value char(3);
  booking_total_value numeric(12,2);
  customer_value uuid;
  lead_value uuid;
  quote_value uuid;
  booking_value public.bookings%rowtype;
  existing_customer_ids uuid[];
  answer jsonb;
  answer_question_id uuid;
  answer_label text;
  answer_value jsonb;
begin
  if request is null or jsonb_typeof(request) <> 'object' then
    raise exception 'Booking request must be an object' using errcode = '22023';
  end if;
  if request_key is null or char_length(request_key) < 16 or char_length(request_key) > 200 then
    raise exception 'A 16-200 character idempotencyKey is required' using errcode = '22023';
  end if;

  select * into booking_value
    from public.bookings
   where idempotency_key = request_key;
  if found then
    return jsonb_build_object(
      'bookingId', booking_value.id,
      'bookingNumber', booking_value.booking_number,
      'status', booking_value.status,
      'idempotentReplay', true
    );
  end if;

  begin
    service_value := (request ->> 'serviceId')::uuid;
    start_value := (request #>> '{booking,scheduledStartAt}')::timestamptz;
    end_value := (request #>> '{booking,scheduledEndAt}')::timestamptz;
    subtotal_value := coalesce((request #>> '{quote,subtotal}')::numeric(12,2), 0);
    discount_value := coalesce((request #>> '{quote,discount}')::numeric(12,2), 0);
    booking_total_value := (request #>> '{booking,total}')::numeric(12,2);
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Booking request contains an invalid identifier, timestamp, or amount' using errcode = '22023';
  end;

  full_name_value := nullif(trim(request #>> '{customer,fullName}'), '');
  phone_value := nullif(trim(request #>> '{customer,phone}'), '');
  email_value := nullif(lower(trim(request #>> '{customer,email}')), '');
  location_value := nullif(trim(request #>> '{customer,location}'), '');
  address_value := nullif(trim(request #>> '{booking,address}'), '');
  location_note_value := nullif(trim(request #>> '{booking,locationNote}'), '');
  quote_currency_value := upper(coalesce(nullif(trim(request #>> '{quote,currency}'), ''), 'NGN'))::char(3);
  booking_currency_value := upper(coalesce(nullif(trim(request #>> '{booking,currency}'), ''), 'NGN'))::char(3);
  quote_expires_at_value := nullif(request #>> '{quote,expiresAt}', '')::timestamptz;

  if phone_value is null or char_length(phone_value) > 50
    or email_value is null or email_value !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or full_name_value is null or char_length(full_name_value) > 240 then
    raise exception 'A customer full name, phone number, and valid email are required' using errcode = '22023';
  end if;
  if address_value is null or char_length(address_value) < 5 or char_length(address_value) > 1000
    or start_value is null or end_value is null or end_value <= start_value
    or subtotal_value < 0 or discount_value < 0 or discount_value > subtotal_value
    or booking_total_value is null or booking_total_value < 0
    or quote_currency_value !~ '^[A-Z]{3}$' or booking_currency_value !~ '^[A-Z]{3}$' then
    raise exception 'Booking request has invalid scheduling, address, currency, or pricing data' using errcode = '22023';
  end if;
  if not exists (select 1 from public.services where id = service_value and is_active) then
    raise exception 'The requested service is unavailable' using errcode = '23503';
  end if;

  -- Locks make identity resolution race-safe even when a new phone and email are
  -- submitted concurrently in opposite orders.
  perform pg_advisory_xact_lock(hashtextextended('phone:' || phone_value, 0));
  perform pg_advisory_xact_lock(hashtextextended('email:' || email_value, 0));
  select array_agg(id order by id) into existing_customer_ids
    from public.customers
   where phone = phone_value or lower(email) = email_value;
  if coalesce(array_length(existing_customer_ids, 1), 0) > 1 then
    raise exception 'Phone number and email belong to different customer records' using errcode = '23505';
  end if;

  customer_value := existing_customer_ids[1];
  if customer_value is null then
    insert into public.customers (full_name, phone, email, location)
    values (full_name_value, phone_value, email_value, location_value)
    returning id into customer_value;
  else
    update public.customers
       set full_name = full_name_value,
           phone = phone_value,
           email = email_value,
           location = coalesce(location_value, location)
     where id = customer_value;
  end if;

  insert into public.leads (customer_id, service_id, source, status, notes)
  values (customer_value, service_value, source_value, 'QUALIFIED', nullif(trim(request ->> 'notes'), ''))
  returning id into lead_value;

  insert into public.quotes (lead_id, customer_id, service_id, status, currency, subtotal, discount, expires_at, idempotency_key)
  values (lead_value, customer_value, service_value, 'DRAFT', quote_currency_value, subtotal_value, discount_value, quote_expires_at_value, request_key || ':quote')
  returning id into quote_value;

  if request ? 'answers' then
    if jsonb_typeof(request -> 'answers') <> 'array' then
      raise exception 'answers must be an array' using errcode = '22023';
    end if;
    for answer in select value from jsonb_array_elements(request -> 'answers') loop
      if jsonb_typeof(answer) <> 'object' then
        raise exception 'Each answer must be an object' using errcode = '22023';
      end if;
      begin
        answer_question_id := nullif(answer ->> 'serviceQuestionId', '')::uuid;
      exception when invalid_text_representation then
        raise exception 'Answer serviceQuestionId must be a UUID' using errcode = '22023';
      end;
      answer_label := nullif(trim(answer ->> 'questionLabel'), '');
      answer_value := answer -> 'answer';
      if answer_label is null or answer_value is null then
        raise exception 'Each answer requires questionLabel and answer' using errcode = '22023';
      end if;
      insert into public.quote_answers (quote_id, service_question_id, question_label, answer)
      values (quote_value, answer_question_id, answer_label, answer_value);
    end loop;
  end if;

  insert into public.bookings (
    quote_id, lead_id, customer_id, service_id, status, scheduled_start_at,
    scheduled_end_at, address, location_note, currency, total, idempotency_key
  ) values (
    quote_value, lead_value, customer_value, service_value, 'PENDING', start_value,
    end_value, address_value, location_note_value, booking_currency_value, booking_total_value, request_key
  ) returning * into booking_value;

  insert into public.automation_outbox (event_type, aggregate_type, aggregate_id, payload, idempotency_key)
  values (
    'booking.requested', 'booking', booking_value.id,
    jsonb_build_object(
      'version', 1,
      'bookingId', booking_value.id,
      'bookingNumber', booking_value.booking_number,
      'leadId', lead_value,
      'customerId', customer_value,
      'quoteId', quote_value,
      'serviceId', service_value,
      'scheduledStartAt', booking_value.scheduled_start_at,
      'scheduledEndAt', booking_value.scheduled_end_at
    ),
    request_key || ':booking.requested'
  );

  return jsonb_build_object(
    'bookingId', booking_value.id,
    'bookingNumber', booking_value.booking_number,
    'quoteId', quote_value,
    'leadId', lead_value,
    'status', booking_value.status,
    'idempotentReplay', false
  );
exception when exclusion_violation then
  raise exception 'The requested time is no longer available' using errcode = '23P01';
end;
$$;

revoke all on function public.create_booking_from_request(jsonb) from public, anon, authenticated;
grant execute on function public.create_booking_from_request(jsonb) to service_role;
