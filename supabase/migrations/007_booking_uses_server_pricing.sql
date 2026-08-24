-- Move booking pricing inside the transaction.
--
-- Before this migration the browser posted an `amount` and the RPC wrote it straight to
-- quotes.subtotal and bookings.total, so a crafted request could book any service for
-- zero. The request now carries only pricing *inputs* (service, property type, area,
-- space counts); public.calculate_quote produces the money, and the resulting line items
-- are frozen into quote_items in the same transaction.

create or replace function public.create_booking_from_request(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_key text := nullif(trim(request ->> 'idempotencyKey'), '');
  source_value text := coalesce(nullif(trim(request ->> 'source'), ''), 'WEBSITE');
  quote_result jsonb;
  service_value uuid;
  property_type_value uuid;
  service_area_value uuid;
  requires_review_value boolean;
  full_name_value text;
  phone_value text;
  email_value text;
  location_value text;
  subtotal_value numeric(12,2);
  quote_currency_value char(3);
  quote_expires_at_value timestamptz;
  start_value timestamptz;
  end_value timestamptz;
  address_value text;
  location_note_value text;
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
  item jsonb;
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
      'total', booking_value.total,
      'requiresReview', (select q.requires_review from public.quotes q where q.id = booking_value.quote_id),
      'idempotentReplay', true
    );
  end if;

  -- Authoritative pricing. Anything the caller sent about money is ignored.
  quote_result := public.calculate_quote(jsonb_build_object(
    'serviceSlug', request ->> 'serviceSlug',
    'propertyTypeSlug', request ->> 'propertyTypeSlug',
    'areaSlug', request ->> 'areaSlug',
    'spaces', coalesce(request -> 'spaces', '[]'::jsonb)
  ));

  service_value := (quote_result ->> 'serviceId')::uuid;
  property_type_value := (quote_result ->> 'propertyTypeId')::uuid;
  service_area_value := (quote_result ->> 'serviceAreaId')::uuid;
  requires_review_value := (quote_result ->> 'requiresReview')::boolean;
  -- A scope we cannot price safely still reserves the slot, but records no revenue until
  -- staff quote it. The attention queue surfaces these.
  subtotal_value := coalesce((quote_result ->> 'total')::numeric(12,2), 0);
  booking_total_value := subtotal_value;

  begin
    start_value := (request #>> '{booking,scheduledStartAt}')::timestamptz;
  exception when invalid_text_representation then
    raise exception 'Booking request contains an invalid timestamp' using errcode = '22023';
  end;
  end_value := start_value + make_interval(mins => (quote_result ->> 'durationMinutes')::integer);

  full_name_value := nullif(trim(request #>> '{customer,fullName}'), '');
  phone_value := nullif(trim(request #>> '{customer,phone}'), '');
  email_value := nullif(lower(trim(request #>> '{customer,email}')), '');
  location_value := nullif(trim(request #>> '{customer,location}'), '');
  address_value := nullif(trim(request #>> '{booking,address}'), '');
  location_note_value := nullif(trim(request #>> '{booking,locationNote}'), '');
  quote_currency_value := upper(coalesce(nullif(trim(quote_result ->> 'currency'), ''), 'NGN'))::char(3);
  quote_expires_at_value := nullif(request #>> '{quote,expiresAt}', '')::timestamptz;

  if phone_value is null or char_length(phone_value) > 50
    or email_value is null or email_value !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or full_name_value is null or char_length(full_name_value) > 240 then
    raise exception 'A customer full name, phone number, and valid email are required' using errcode = '22023';
  end if;
  if address_value is null or char_length(address_value) < 5 or char_length(address_value) > 1000
    or start_value is null or end_value is null or end_value <= start_value then
    raise exception 'Booking request has invalid scheduling or address data' using errcode = '22023';
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

  insert into public.quotes (
    lead_id, customer_id, service_id, property_type_id, service_area_id, requires_review,
    status, currency, subtotal, discount, expires_at, idempotency_key
  ) values (
    lead_value, customer_value, service_value, property_type_value, service_area_value, requires_review_value,
    'DRAFT', quote_currency_value, subtotal_value, 0, quote_expires_at_value, request_key || ':quote'
  ) returning id into quote_value;

  -- Freeze the breakdown so a later price change cannot rewrite an agreed quote.
  for item in select value from jsonb_array_elements(coalesce(quote_result -> 'items', '[]'::jsonb)) loop
    insert into public.quote_items (quote_id, kind, label, space_type_id, quantity, unit_amount, amount, sort_order)
    values (
      quote_value,
      item ->> 'kind',
      item ->> 'label',
      (select st.id from public.space_types st where st.slug = item ->> 'spaceTypeSlug'),
      (item ->> 'quantity')::numeric(10,2),
      (item ->> 'unitAmount')::numeric(12,2),
      (item ->> 'amount')::numeric(12,2),
      (item ->> 'sortOrder')::integer
    );
  end loop;

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
    end_value, address_value, location_note_value, quote_currency_value, booking_total_value, request_key
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
      'requiresReview', requires_review_value,
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
    'total', booking_value.total,
    'requiresReview', requires_review_value,
    'idempotentReplay', false
  );
exception when exclusion_violation then
  raise exception 'The requested time is no longer available' using errcode = '23P01';
end;
$$;

revoke all on function public.create_booking_from_request(jsonb) from public, anon, authenticated;
grant execute on function public.create_booking_from_request(jsonb) to service_role;
