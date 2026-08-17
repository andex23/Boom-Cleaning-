-- BOOM space-based pricing — migrations 006, 007 and 008 combined.
--
-- Paste this whole file into the Supabase SQL Editor and run it.
-- Safe to run more than once: tables, columns and indexes are created only if missing,
-- RLS policies are dropped and recreated, functions use CREATE OR REPLACE, and reference
-- data uses ON CONFLICT so prices you have edited in the admin console are preserved.
--
-- Requires migrations 001, 002 and the booking RPC to be applied first. The guard below
-- stops with a clear message instead of failing halfway.

do $$
begin
  if to_regclass('public.services') is null
     or to_regclass('public.quotes') is null
     or to_regclass('public.bookings') is null then
    raise exception 'Apply supabase/migrations 001 through 005 before running this file.';
  end if;
end;
$$;


-- ======================================================================
-- 006_space_based_pricing.sql
-- ======================================================================

-- Space-based pricing.
--
-- Replaces the frontend's hardcoded bedroom formula with a database-owned model so a
-- property can be described as what it actually is: a count of priced spaces (bedrooms,
-- bathrooms, boys' quarters, gazebo, terrace, pool area) inside a property type that
-- carries its own multiplier and minimum charge (penthouse, duplex, bungalow).
--
-- The price is computed by public.calculate_quote and is called by
-- public.create_booking_from_request inside the booking transaction. The browser never
-- supplies an amount, so a tampered request cannot change what a customer is charged,
-- and a price edit mid-checkout cannot be exploited.

-- Services previously had no price at all; the amounts lived in src/data/public-demo.ts.
alter table public.services
  add column if not exists base_price numeric(12,2) not null default 0 check (base_price >= 0),
  add column if not exists minimum_charge numeric(12,2) not null default 0 check (minimum_charge >= 0),
  add column if not exists requires_review boolean not null default false,
  add column if not exists duration_minutes integer not null default 180 check (duration_minutes between 30 and 1440);

-- A property characteristic that scales the whole job (access, height, finish quality),
-- with a floor so a small job in a demanding property still clears a profitable minimum.
create table if not exists public.property_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  base_multiplier numeric(6,3) not null default 1.000 check (base_multiplier > 0 and base_multiplier <= 10),
  minimum_charge numeric(12,2) not null default 0 check (minimum_charge >= 0),
  requires_review boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The countable vocabulary of a property. A customer says "3 bedrooms and a gazebo" by
-- sending counts against these slugs.
create table if not exists public.space_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  max_count integer not null default 20 check (max_count between 1 and 100),
  requires_review boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-unit price varies by service: a gazebo costs one amount for a deep clean and
-- another after construction. included_count lets a base price absorb the first N units.
create table if not exists public.service_space_prices (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  space_type_id uuid not null references public.space_types(id) on delete cascade,
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  included_count integer not null default 0 check (included_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, space_type_id)
);

-- Travel surcharge by area, previously hardcoded as central/nearby/outer in the browser.
create table if not exists public.service_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  surcharge numeric(12,2) not null default 0 check (surcharge >= 0),
  requires_review boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The priced line items frozen at the moment of quoting. Editing a price next month must
-- not silently rewrite what a customer already agreed to, and staff need to see why a
-- total is what it is.
create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  kind text not null check (kind in ('BASE', 'SPACE', 'AREA_SURCHARGE', 'PROPERTY_MULTIPLIER', 'MINIMUM_ADJUSTMENT', 'MANUAL_ADJUSTMENT')),
  label text not null check (char_length(label) between 1 and 240),
  space_type_id uuid references public.space_types(id) on delete set null,
  quantity numeric(10,2) not null default 1 check (quantity >= 0),
  unit_amount numeric(12,2) not null default 0,
  amount numeric(12,2) not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

alter table public.quotes
  add column if not exists property_type_id uuid references public.property_types(id) on delete set null,
  add column if not exists service_area_id uuid references public.service_areas(id) on delete set null,
  add column if not exists requires_review boolean not null default false;

create index if not exists service_space_prices_service_id_idx on public.service_space_prices (service_id);
create index if not exists service_space_prices_space_type_id_idx on public.service_space_prices (space_type_id);
create index if not exists quote_items_quote_id_idx on public.quote_items (quote_id);
create index if not exists quote_items_space_type_id_idx on public.quote_items (space_type_id);
create index if not exists quotes_property_type_id_idx on public.quotes (property_type_id);
create index if not exists quotes_service_area_id_idx on public.quotes (service_area_id);

alter table public.property_types enable row level security;
alter table public.space_types enable row level security;
alter table public.service_space_prices enable row level security;
alter table public.service_areas enable row level security;
alter table public.quote_items enable row level security;

-- Consistent with the rest of the schema: no anon access. The public catalogue is served
-- by server code through the service-role client.
drop policy if exists "staff read property types" on public.property_types;
create policy "staff read property types" on public.property_types for select to authenticated using (public.is_staff());
drop policy if exists "admins manage property types" on public.property_types;
create policy "admins manage property types" on public.property_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "staff read space types" on public.space_types;
create policy "staff read space types" on public.space_types for select to authenticated using (public.is_staff());
drop policy if exists "admins manage space types" on public.space_types;
create policy "admins manage space types" on public.space_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "staff read service space prices" on public.service_space_prices;
create policy "staff read service space prices" on public.service_space_prices for select to authenticated using (public.is_staff());
drop policy if exists "admins manage service space prices" on public.service_space_prices;
create policy "admins manage service space prices" on public.service_space_prices for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "staff read service areas" on public.service_areas;
create policy "staff read service areas" on public.service_areas for select to authenticated using (public.is_staff());
drop policy if exists "admins manage service areas" on public.service_areas;
create policy "admins manage service areas" on public.service_areas for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "staff read quote items" on public.quote_items;
create policy "staff read quote items" on public.quote_items for select to authenticated using (public.is_staff());

-- The single source of truth for money.
--
-- total = greatest(
--   (base + Σ chargeable spaces + area surcharge) × property multiplier,
--   greatest(service minimum, property type minimum)
-- )
--
-- Returns requiresReview instead of a total when the scope cannot be priced safely.
-- Selecting a space the service has no active price for is a review trigger, never a
-- silent zero, so an unpriced extra can never be given away.
create or replace function public.calculate_quote(request jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  service_row public.services%rowtype;
  property_row public.property_types%rowtype;
  area_row public.service_areas%rowtype;
  space_entry jsonb;
  space_slug text;
  space_count integer;
  space_row public.space_types%rowtype;
  price_row public.service_space_prices%rowtype;
  chargeable_count integer;
  line_amount numeric(12,2);
  running_subtotal numeric(12,2) := 0;
  multiplied_subtotal numeric(12,2);
  minimum_value numeric(12,2);
  total_value numeric(12,2);
  review_required boolean := false;
  review_reasons text[] := array[]::text[];
  items jsonb := '[]'::jsonb;
  item_order integer := 0;
  seen_slugs text[] := array[]::text[];
begin
  if request is null or jsonb_typeof(request) <> 'object' then
    raise exception 'Quote request must be an object' using errcode = '22023';
  end if;

  select * into service_row
    from public.services
   where slug = nullif(trim(request ->> 'serviceSlug'), '') and is_active;
  if not found then
    raise exception 'The requested service is unavailable' using errcode = '23503';
  end if;

  select * into property_row
    from public.property_types
   where slug = nullif(trim(request ->> 'propertyTypeSlug'), '') and is_active;
  if not found then
    raise exception 'The requested property type is unavailable' using errcode = '23503';
  end if;

  select * into area_row
    from public.service_areas
   where slug = nullif(trim(request ->> 'areaSlug'), '') and is_active;
  if not found then
    raise exception 'The requested service area is unavailable' using errcode = '23503';
  end if;

  if request ? 'spaces' and jsonb_typeof(request -> 'spaces') <> 'array' then
    raise exception 'spaces must be an array' using errcode = '22023';
  end if;

  if service_row.requires_review then
    review_required := true;
    -- The cast is required: an untyped literal makes Postgres resolve `||` to
    -- anyarray || anyarray and try to parse the sentence as an array literal.
    review_reasons := review_reasons || 'This service is always quoted by our team.'::text;
  end if;
  if property_row.requires_review then
    review_required := true;
    review_reasons := review_reasons || format('%s properties are quoted by our team.', property_row.name);
  end if;
  if area_row.requires_review then
    review_required := true;
    review_reasons := review_reasons || format('%s is outside our instant-quote area.', area_row.name);
  end if;

  running_subtotal := service_row.base_price;
  items := items || jsonb_build_object(
    'kind', 'BASE', 'label', service_row.name || ' base', 'spaceTypeSlug', null,
    'quantity', 1, 'unitAmount', service_row.base_price, 'amount', service_row.base_price, 'sortOrder', item_order
  );
  item_order := item_order + 1;

  for space_entry in select value from jsonb_array_elements(coalesce(request -> 'spaces', '[]'::jsonb)) loop
    if jsonb_typeof(space_entry) <> 'object' then
      raise exception 'Each space must be an object' using errcode = '22023';
    end if;
    space_slug := nullif(trim(space_entry ->> 'slug'), '');
    begin
      space_count := (space_entry ->> 'count')::integer;
    exception when invalid_text_representation then
      raise exception 'Space count must be an integer' using errcode = '22023';
    end;
    if space_slug is null or space_count is null or space_count < 0 then
      raise exception 'Each space requires a slug and a non-negative count' using errcode = '22023';
    end if;
    if space_slug = any (seen_slugs) then
      raise exception 'Duplicate space slug in request' using errcode = '22023';
    end if;
    seen_slugs := seen_slugs || space_slug;
    continue when space_count = 0;

    select * into space_row from public.space_types where slug = space_slug and is_active;
    if not found then
      raise exception 'Unknown space type' using errcode = '23503';
    end if;
    if space_count > space_row.max_count then
      raise exception 'Space count exceeds the permitted maximum' using errcode = '22023';
    end if;

    if space_row.requires_review then
      review_required := true;
      review_reasons := review_reasons || format('%s needs a site assessment.', space_row.name);
    end if;

    select * into price_row
      from public.service_space_prices
     where service_id = service_row.id and space_type_id = space_row.id and is_active;
    if not found then
      -- Never charge zero for something we have not priced for this service.
      review_required := true;
      review_reasons := review_reasons || format('%s is not covered by the standard %s price.', space_row.name, service_row.name);
      continue;
    end if;

    chargeable_count := greatest(0, space_count - price_row.included_count);
    line_amount := chargeable_count * price_row.unit_price;
    running_subtotal := running_subtotal + line_amount;
    items := items || jsonb_build_object(
      'kind', 'SPACE',
      'label', case when price_row.included_count > 0
                 then format('%s × %s (%s included)', space_row.name, space_count, price_row.included_count)
                 else format('%s × %s', space_row.name, space_count) end,
      'spaceTypeSlug', space_row.slug,
      'quantity', chargeable_count, 'unitAmount', price_row.unit_price, 'amount', line_amount, 'sortOrder', item_order
    );
    item_order := item_order + 1;
  end loop;

  if area_row.surcharge > 0 then
    running_subtotal := running_subtotal + area_row.surcharge;
    items := items || jsonb_build_object(
      'kind', 'AREA_SURCHARGE', 'label', format('%s travel', area_row.name), 'spaceTypeSlug', null,
      'quantity', 1, 'unitAmount', area_row.surcharge, 'amount', area_row.surcharge, 'sortOrder', item_order
    );
    item_order := item_order + 1;
  end if;

  multiplied_subtotal := round(running_subtotal * property_row.base_multiplier, 2);
  if property_row.base_multiplier <> 1 then
    items := items || jsonb_build_object(
      'kind', 'PROPERTY_MULTIPLIER',
      'label', format('%s adjustment (×%s)', property_row.name, trim(trailing '.' from trim(trailing '0' from property_row.base_multiplier::text))),
      'spaceTypeSlug', null,
      'quantity', 1, 'unitAmount', multiplied_subtotal - running_subtotal, 'amount', multiplied_subtotal - running_subtotal, 'sortOrder', item_order
    );
    item_order := item_order + 1;
  end if;

  minimum_value := greatest(service_row.minimum_charge, property_row.minimum_charge);
  total_value := greatest(multiplied_subtotal, minimum_value);
  if total_value > multiplied_subtotal then
    items := items || jsonb_build_object(
      'kind', 'MINIMUM_ADJUSTMENT', 'label', 'Minimum charge adjustment', 'spaceTypeSlug', null,
      'quantity', 1, 'unitAmount', total_value - multiplied_subtotal, 'amount', total_value - multiplied_subtotal, 'sortOrder', item_order
    );
    item_order := item_order + 1;
  end if;

  if review_required then
    total_value := null;
    items := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'serviceId', service_row.id,
    'serviceName', service_row.name,
    'propertyTypeId', property_row.id,
    'serviceAreaId', area_row.id,
    'durationMinutes', service_row.duration_minutes,
    'currency', 'NGN',
    'requiresReview', review_required,
    'reviewReasons', to_jsonb(review_reasons),
    'subtotal', total_value,
    'total', total_value,
    'depositAmount', case when total_value is null then null else ceil(total_value * 0.3 / 500) * 500 end,
    'items', items
  );
end;
$$;

revoke all on function public.calculate_quote(jsonb) from public, anon, authenticated;
grant execute on function public.calculate_quote(jsonb) to service_role;

-- ======================================================================
-- 007_booking_uses_server_pricing.sql
-- ======================================================================

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

-- ======================================================================
-- 008_pricing_reference_data.sql
-- ======================================================================

-- Pricing reference data.
--
-- These are operating prices, not development fixtures, so they live in a migration
-- rather than seed.sql. Every statement is re-runnable: prices staff have since edited in
-- the console are preserved by only inserting rows that do not exist yet, while structural
-- fields (name, ordering, review flags) are kept in sync.
--
-- Amounts are carried over from the previous hardcoded browser formula in
-- src/data/public-demo.ts so this migration does not silently change what customers pay.
-- The one modelling change is that property adjustments become multipliers with a floor
-- rather than flat add-ons, per the agreed pricing model.

-- The bookable catalogue. seed.sql also inserts these for local development, but it runs
-- after the migrations, so this file cannot rely on those rows existing: on a fresh
-- database the price updates below would otherwise match nothing.
insert into public.services (name, slug, description, pricing_model, sort_order) values
  ('Post-construction cleaning', 'post-construction-cleaning', 'A detailed reset after construction work.', 'MANUAL_QUOTE', 10),
  ('Post-renovation cleaning', 'post-renovation-cleaning', 'Fine-dust and finish cleaning after renovations.', 'MANUAL_QUOTE', 20),
  ('Deep cleaning', 'deep-cleaning', 'A thorough, room-by-room clean for lived-in spaces.', 'BEDROOM_BASED', 30),
  ('Move-in apartment cleaning', 'move-in-apartment-cleaning', 'Prepare a new home before you settle in.', 'BEDROOM_BASED', 40),
  ('Upholstery cleaning', 'upholstery-cleaning', 'Fabric care for sofas, chairs and mattresses.', 'QUANTITY_BASED', 50),
  ('Office cleaning', 'office-cleaning', 'Reliable care for productive workspaces.', 'PROPERTY_SIZE', 60),
  ('Fumigation', 'fumigation', 'Practical pest-control support for homes and offices.', 'LOCATION_BASED', 70),
  ('Laundry', 'laundry', 'Collection-ready garment and linen care.', 'QUANTITY_BASED', 80)
on conflict (slug) do nothing;

insert into public.property_types (slug, name, description, base_multiplier, minimum_charge, requires_review, sort_order) values
  ('apartment',  'Apartment',        'A flat or apartment within a shared building.',        1.000, 35000, false, 10),
  ('terrace',    'Terrace',          'A terraced or semi-detached home.',                    1.150, 45000, false, 20),
  ('bungalow',   'Bungalow',         'A single-storey detached home.',                       1.200, 45000, false, 30),
  ('detached',   'Detached home',    'A standalone house on its own grounds.',               1.300, 55000, false, 40),
  ('duplex',     'Duplex',           'A two-storey home, including semi and fully detached.', 1.350, 60000, false, 50),
  ('penthouse',  'Penthouse',        'A top-floor residence, typically with terrace access.', 1.600, 90000, false, 60),
  ('office',     'Office / commercial', 'A workplace or commercial premises.',               1.200, 50000, false, 70),
  ('estate',     'Estate / compound', 'Multiple buildings or extensive grounds.',             1.000,     0, true,  80)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description,
  requires_review = excluded.requires_review, sort_order = excluded.sort_order, updated_at = now();

insert into public.space_types (slug, name, description, max_count, requires_review, sort_order) values
  ('bedroom',            'Bedroom',            'Bedrooms, including the master.',                  20, false, 10),
  ('bathroom',           'Bathroom',           'Bathrooms, toilets and guest cloakrooms.',         20, false, 20),
  ('living-room',        'Living room',        'Sitting rooms, lounges and family rooms.',         10, false, 30),
  ('kitchen',            'Kitchen',            'Kitchens and pantries.',                            5, false, 40),
  ('dining-room',        'Dining room',        'Formal or informal dining areas.',                  5, false, 50),
  ('study',              'Study / home office','Studies, offices and libraries.',                    5, false, 60),
  ('boys-quarters',      'Boys'' quarters',    'Self-contained staff or guest quarters (BQ).',      5, false, 70),
  ('balcony',            'Balcony / terrace',  'Open balconies and terraces.',                     10, false, 80),
  ('gazebo',             'Gazebo',             'A garden gazebo, pergola or outdoor shelter.',      5, false, 90),
  ('external-staircase', 'External staircase', 'Outdoor stairs and landings.',                      5, false, 100),
  ('garage',             'Garage / carport',   'Enclosed garages and covered parking.',             5, false, 110),
  ('store-room',         'Store room',         'Stores, utility rooms and box rooms.',             10, false, 120),
  ('pool-area',          'Pool area',          'Swimming pool surrounds and pool houses.',          3, true,  130),
  ('rooftop',            'Rooftop area',       'Rooftop terraces, decks and entertainment areas.',  3, true,  140)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, max_count = excluded.max_count,
  requires_review = excluded.requires_review, sort_order = excluded.sort_order, updated_at = now();

-- Surcharges preserved exactly from the previous browser formula.
insert into public.service_areas (slug, name, surcharge, requires_review, sort_order) values
  ('central', 'Central Abuja',   5000, false, 10),
  ('nearby',  'Greater Abuja',      0, false, 20),
  ('outer',   'Outer Abuja',    10000, false, 30),
  ('outside', 'Outside Abuja',      0, true,  40)
on conflict (slug) do update set
  name = excluded.name, requires_review = excluded.requires_review,
  sort_order = excluded.sort_order, updated_at = now();

-- Base prices and minimums for instantly-quotable services. MANUAL_QUOTE services are
-- flagged so calculate_quote always routes them to a person.
update public.services set base_price = 45000, minimum_charge = 45000, duration_minutes = 300, requires_review = false where slug = 'deep-cleaning';
update public.services set base_price = 50000, minimum_charge = 50000, duration_minutes = 360, requires_review = false where slug = 'move-in-apartment-cleaning';
update public.services set base_price = 25000, minimum_charge = 25000, duration_minutes = 180, requires_review = false where slug = 'upholstery-cleaning';
update public.services set base_price = 15000, minimum_charge = 15000, duration_minutes = 120, requires_review = false where slug = 'laundry';
update public.services set requires_review = true, duration_minutes = 240 where slug in ('post-construction-cleaning', 'post-renovation-cleaning', 'office-cleaning', 'fumigation');

-- Per-unit prices. A gazebo is priced differently per service, and a service with no row
-- for a space type routes that scope to manual review rather than charging nothing.
--
-- included_count absorbs what the base price already covers: a deep clean's base includes
-- one bedroom, one bathroom, one living room and one kitchen.
insert into public.service_space_prices (service_id, space_type_id, unit_price, included_count)
select s.id, t.id, v.unit_price, v.included_count
  from (values
    ('deep-cleaning', 'bedroom',             7500, 1),
    ('deep-cleaning', 'bathroom',            5000, 1),
    ('deep-cleaning', 'living-room',         6000, 1),
    ('deep-cleaning', 'kitchen',             7000, 1),
    ('deep-cleaning', 'dining-room',         4500, 0),
    ('deep-cleaning', 'study',               4500, 0),
    ('deep-cleaning', 'boys-quarters',      12000, 0),
    ('deep-cleaning', 'balcony',             3500, 0),
    ('deep-cleaning', 'gazebo',              8000, 0),
    ('deep-cleaning', 'external-staircase',  4000, 0),
    ('deep-cleaning', 'garage',              6000, 0),
    ('deep-cleaning', 'store-room',          3000, 0),

    ('move-in-apartment-cleaning', 'bedroom',             7500, 1),
    ('move-in-apartment-cleaning', 'bathroom',            6000, 1),
    ('move-in-apartment-cleaning', 'living-room',         6500, 1),
    ('move-in-apartment-cleaning', 'kitchen',             9000, 1),
    ('move-in-apartment-cleaning', 'dining-room',         5000, 0),
    ('move-in-apartment-cleaning', 'study',               5000, 0),
    ('move-in-apartment-cleaning', 'boys-quarters',      14000, 0),
    ('move-in-apartment-cleaning', 'balcony',             4000, 0),
    ('move-in-apartment-cleaning', 'gazebo',              9000, 0),
    ('move-in-apartment-cleaning', 'external-staircase',  4500, 0),
    ('move-in-apartment-cleaning', 'garage',              7000, 0),
    ('move-in-apartment-cleaning', 'store-room',          3500, 0),

    ('upholstery-cleaning', 'living-room',  2500, 1),
    ('upholstery-cleaning', 'bedroom',      2500, 0),
    ('upholstery-cleaning', 'study',        2500, 0),

    ('laundry', 'bedroom', 2500, 1)
  ) as v(service_slug, space_slug, unit_price, included_count)
  join public.services s on s.slug = v.service_slug
  join public.space_types t on t.slug = v.space_slug
on conflict (service_id, space_type_id) do nothing;
