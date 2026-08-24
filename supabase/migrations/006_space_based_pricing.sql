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
