-- Crews, real capacity, and a booking lifecycle.
--
-- Two problems this fixes.
--
-- First, capacity. The schedule constraint was business-wide: any two bookings that
-- overlapped in time conflicted, regardless of who was doing the work. A single five-hour
-- deep clean therefore closed most of a day for every other customer. Work is now assigned
-- to a crew, and the constraint applies per crew, so BOOM can run as many simultaneous jobs
-- as it has crews.
--
-- Second, bookings had no life after they were created. Every booking sat at PENDING
-- forever with no supported way to confirm, start, finish, cancel or move it.

create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  notes text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crews enable row level security;
drop policy if exists "staff read crews" on public.crews;
create policy "staff read crews" on public.crews for select to authenticated using (public.is_staff());
drop policy if exists "admins manage crews" on public.crews;
create policy "admins manage crews" on public.crews for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- One crew to begin with; staff add more in the console as the team grows.
insert into public.crews (name, sort_order) values ('Team 1', 10)
on conflict (name) do nothing;

alter table public.bookings
  add column if not exists crew_id uuid references public.crews(id) on delete restrict;

create index if not exists bookings_crew_id_idx on public.bookings (crew_id);

-- Existing bookings predate crews; put them on the first crew so the new constraint has
-- something to work with.
update public.bookings
   set crew_id = (select id from public.crews where is_active order by sort_order limit 1)
 where crew_id is null;

-- Replace the business-wide constraint with a per-crew one. Two crews may now work the
-- same hours; one crew still cannot be in two places at once.
alter table public.bookings drop constraint if exists bookings_no_active_schedule_overlap;
alter table public.bookings drop constraint if exists bookings_no_crew_schedule_overlap;
alter table public.bookings
  add constraint bookings_no_crew_schedule_overlap
  exclude using gist (
    crew_id with =,
    tstzrange(scheduled_start_at, scheduled_end_at, '[)') with &&
  ) where (status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS'));

-- Availability now means "is any crew free", not "is the whole business free".
create or replace function public.get_availability(request jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  from_date date;
  to_date date;
  service_row public.services%rowtype;
  duration_minutes integer;
  crew_total integer;
  day_value date;
  slot record;
  slot_start timestamptz;
  slot_end timestamptz;
  busy_crews integer;
  free_crews integer;
  is_open boolean;
  reason text;
  day_slots jsonb;
  open_count integer;
  days jsonb := '[]'::jsonb;
begin
  if request is null or jsonb_typeof(request) <> 'object' then
    raise exception 'Request must be an object' using errcode = '22023';
  end if;

  begin
    from_date := (request ->> 'from')::date;
    to_date := (request ->> 'to')::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'from and to must be ISO dates' using errcode = '22023';
  end;
  if from_date is null or to_date is null or to_date < from_date then
    raise exception 'A valid from and to date range is required' using errcode = '22023';
  end if;
  if to_date - from_date > 120 then
    raise exception 'Date range must be 120 days or fewer' using errcode = '22023';
  end if;

  select * into service_row
    from public.services
   where slug = nullif(trim(request ->> 'serviceSlug'), '') and is_active;
  if not found then
    raise exception 'The requested service is unavailable' using errcode = '23503';
  end if;
  duration_minutes := service_row.duration_minutes;

  select count(*) into crew_total from public.crews where is_active;
  if crew_total = 0 then
    raise exception 'No active crews are configured' using errcode = '23503';
  end if;

  day_value := from_date;
  while day_value <= to_date loop
    day_slots := '[]'::jsonb;
    open_count := 0;

    for slot in
      select start_time, label from public.booking_slots where is_active order by sort_order
    loop
      slot_start := (day_value + slot.start_time) at time zone 'Africa/Lagos';
      slot_end := slot_start + make_interval(mins => duration_minutes);
      is_open := true;
      reason := null;
      free_crews := 0;

      if slot_start <= now() then
        is_open := false;
        reason := 'Past';
      elsif not exists (
        select 1 from public.availability_rules r
         where r.is_active
           and r.weekday = extract(dow from day_value)::smallint
           and slot_start >= (day_value + r.starts_at) at time zone 'Africa/Lagos'
           and slot_end <= (day_value + r.ends_at) at time zone 'Africa/Lagos'
      ) then
        is_open := false;
        reason := 'Closed';
      elsif exists (
        select 1 from public.availability_blackouts b
         where tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(slot_start, slot_end, '[)')
      ) then
        is_open := false;
        reason := 'Unavailable';
      else
        select count(distinct bk.crew_id) into busy_crews
          from public.bookings bk
         where bk.crew_id is not null
           and bk.status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
           and tstzrange(bk.scheduled_start_at, bk.scheduled_end_at, '[)') && tstzrange(slot_start, slot_end, '[)');
        free_crews := crew_total - coalesce(busy_crews, 0);
        if free_crews <= 0 then
          is_open := false;
          reason := 'Booked';
        end if;
      end if;

      if is_open then open_count := open_count + 1; end if;
      day_slots := day_slots || jsonb_build_object(
        'time', to_char(slot.start_time, 'HH24:MI'),
        'label', slot.label,
        'available', is_open,
        'reason', reason,
        'crewsFree', greatest(free_crews, 0)
      );
    end loop;

    days := days || jsonb_build_object(
      'date', to_char(day_value, 'YYYY-MM-DD'),
      'openCount', open_count,
      'slots', day_slots
    );
    day_value := day_value + 1;
  end loop;

  return jsonb_build_object(
    'serviceSlug', service_row.slug,
    'durationMinutes', duration_minutes,
    'crewCount', crew_total,
    'days', days
  );
end;
$$;

revoke all on function public.get_availability(jsonb) from public, anon, authenticated;
grant execute on function public.get_availability(jsonb) to service_role;

-- Booking creation now picks the first free crew rather than assuming the business is idle.
create or replace function public.assign_free_crew(start_value timestamptz, end_value timestamptz)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
    from public.crews c
   where c.is_active
     and not exists (
       select 1 from public.bookings b
        where b.crew_id = c.id
          and b.status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
          and tstzrange(b.scheduled_start_at, b.scheduled_end_at, '[)')
              && tstzrange(start_value, end_value, '[)')
     )
   order by c.sort_order, c.name
   limit 1;
$$;

revoke all on function public.assign_free_crew(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.assign_free_crew(timestamptz, timestamptz) to service_role;

-- Moves a booking through its lifecycle. Only sensible transitions are allowed, and the
-- timestamps the table's CHECK constraints require are written for you.
create or replace function public.update_booking_status(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_number_value bigint;
  next_status public.booking_status;
  note_value text;
  booking_row public.bookings%rowtype;
  allowed public.booking_status[];
begin
  if request is null or jsonb_typeof(request) <> 'object' then
    raise exception 'Request must be an object' using errcode = '22023';
  end if;

  begin
    booking_number_value := (request ->> 'bookingNumber')::bigint;
    next_status := (request ->> 'status')::public.booking_status;
  exception when invalid_text_representation then
    raise exception 'bookingNumber must be an integer and status a valid booking status' using errcode = '22023';
  end;
  note_value := nullif(trim(request ->> 'note'), '');
  if booking_number_value is null or next_status is null then
    raise exception 'bookingNumber and status are required' using errcode = '22023';
  end if;

  select * into booking_row from public.bookings where booking_number = booking_number_value for update;
  if not found then
    raise exception 'Booking not found' using errcode = '23503';
  end if;

  allowed := case booking_row.status
    when 'PENDING' then array['CONFIRMED', 'CANCELLED', 'NO_SHOW']::public.booking_status[]
    when 'CONFIRMED' then array['IN_PROGRESS', 'CANCELLED', 'NO_SHOW']::public.booking_status[]
    when 'IN_PROGRESS' then array['COMPLETED', 'CANCELLED']::public.booking_status[]
    else array[]::public.booking_status[]
  end;
  if not (next_status = any (allowed)) then
    raise exception 'A % booking cannot become %', lower(booking_row.status::text), lower(next_status::text) using errcode = '22023';
  end if;

  update public.bookings
     set status = next_status,
         cancelled_at = case when next_status = 'CANCELLED' then now() else cancelled_at end,
         completed_at = case when next_status = 'COMPLETED' then now() else completed_at end
   where id = booking_row.id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'booking.status_changed', 'booking', booking_row.id,
    jsonb_build_object('bookingNumber', booking_number_value, 'from', booking_row.status, 'to', next_status, 'note', note_value));

  return jsonb_build_object('bookingNumber', booking_number_value, 'from', booking_row.status, 'status', next_status);
end;
$$;

revoke all on function public.update_booking_status(jsonb) from public, anon, authenticated;
grant execute on function public.update_booking_status(jsonb) to service_role;

-- Moves a booking to a new time, re-deriving the end from the service duration and finding
-- a crew that is free then. Optionally moves it to a specific crew.
create or replace function public.reschedule_booking(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_number_value bigint;
  new_start timestamptz;
  requested_crew uuid;
  booking_row public.bookings%rowtype;
  duration_value integer;
  new_end timestamptz;
  crew_value uuid;
begin
  if request is null or jsonb_typeof(request) <> 'object' then
    raise exception 'Request must be an object' using errcode = '22023';
  end if;

  begin
    booking_number_value := (request ->> 'bookingNumber')::bigint;
    new_start := (request ->> 'scheduledStartAt')::timestamptz;
    requested_crew := nullif(request ->> 'crewId', '')::uuid;
  exception when invalid_text_representation or invalid_datetime_format then
    raise exception 'bookingNumber, scheduledStartAt and crewId must be valid' using errcode = '22023';
  end;
  if booking_number_value is null or new_start is null then
    raise exception 'bookingNumber and scheduledStartAt are required' using errcode = '22023';
  end if;

  select * into booking_row from public.bookings where booking_number = booking_number_value for update;
  if not found then
    raise exception 'Booking not found' using errcode = '23503';
  end if;
  if booking_row.status in ('CANCELLED', 'COMPLETED') then
    raise exception 'A % booking cannot be rescheduled', lower(booking_row.status::text) using errcode = '22023';
  end if;

  -- Aliased: an unqualified variable of the same name as the column is ambiguous.
  select s.duration_minutes into duration_value from public.services s where s.id = booking_row.service_id;
  new_end := new_start + make_interval(mins => coalesce(duration_value, 180));

  if requested_crew is not null then
    crew_value := requested_crew;
  else
    -- Prefer keeping the same crew when they are free at the new time.
    if not exists (
      select 1 from public.bookings b
       where b.crew_id = booking_row.crew_id and b.id <> booking_row.id
         and b.status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
         and tstzrange(b.scheduled_start_at, b.scheduled_end_at, '[)') && tstzrange(new_start, new_end, '[)')
    ) then
      crew_value := booking_row.crew_id;
    else
      crew_value := public.assign_free_crew(new_start, new_end);
    end if;
  end if;
  if crew_value is null then
    raise exception 'No crew is free at that time' using errcode = '23P01';
  end if;

  update public.bookings
     set scheduled_start_at = new_start, scheduled_end_at = new_end, crew_id = crew_value
   where id = booking_row.id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (null, 'booking.rescheduled', 'booking', booking_row.id,
    jsonb_build_object('bookingNumber', booking_number_value, 'from', booking_row.scheduled_start_at, 'to', new_start, 'crewId', crew_value));

  return jsonb_build_object('bookingNumber', booking_number_value, 'scheduledStartAt', new_start, 'scheduledEndAt', new_end, 'crewId', crew_value);
exception when exclusion_violation then
  raise exception 'That crew is already booked at that time' using errcode = '23P01';
end;
$$;

revoke all on function public.reschedule_booking(jsonb) from public, anon, authenticated;
grant execute on function public.reschedule_booking(jsonb) to service_role;

-- Booking creation assigns a free crew instead of assuming the whole business is idle.
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
  crew_value uuid;
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

  -- Capacity is per crew now, so a booking needs one that is free for this window.
  crew_value := public.assign_free_crew(start_value, end_value);
  if crew_value is null then
    raise exception 'The requested time is no longer available' using errcode = '23P01';
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
    quote_id, lead_id, customer_id, service_id, crew_id, status, scheduled_start_at,
    scheduled_end_at, address, location_note, currency, total, idempotency_key
  ) values (
    quote_value, lead_value, customer_value, service_value, crew_value, 'PENDING', start_value,
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
    'crewId', crew_value,
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
