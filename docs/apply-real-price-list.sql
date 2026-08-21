-- BOOM's actual published price list.
--
-- Two pricing shapes now coexist.
--
-- Deep cleaning is sold as four packages, each priced by bedroom count from a fixed table.
-- Those numbers are not a formula: the step from one to two bedrooms is NGN 21,500 while
-- every step after is NGN 53,750, and the package premiums move around too. Forcing them
-- through base + per-room arithmetic would quietly quote the wrong price, so the published
-- figures are stored exactly as published.
--
-- Post-construction stays per-unit, because that is genuinely how it is quoted: so much a
-- bedroom, so much a living room, so much a storey.
--
-- The published list carries no property-type uplift, so services priced from a tier table
-- opt out of property multipliers and property minimums entirely.

create table if not exists public.service_bedroom_tiers (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  bedrooms integer not null check (bedrooms between 0 and 40),
  price numeric(12,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, bedrooms)
);

create index if not exists service_bedroom_tiers_service_id_idx on public.service_bedroom_tiers (service_id);

alter table public.service_bedroom_tiers enable row level security;
drop policy if exists "staff read bedroom tiers" on public.service_bedroom_tiers;
create policy "staff read bedroom tiers" on public.service_bedroom_tiers for select to authenticated using (public.is_staff());
drop policy if exists "admins manage bedroom tiers" on public.service_bedroom_tiers;
create policy "admins manage bedroom tiers" on public.service_bedroom_tiers for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A published price is the whole price; nothing is added on top for property type.
alter table public.services
  add column if not exists uses_property_pricing boolean not null default true;

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------

insert into public.services (name, slug, description, pricing_model, sort_order) values
  ('Deep cleaning + upholstery', 'deep-cleaning-upholstery', 'A full deep clean with one set of upholstery cleaned.', 'BEDROOM_BASED', 31),
  ('Deep cleaning + fumigation', 'deep-cleaning-fumigation', 'A full deep clean with fumigation of the property.', 'BEDROOM_BASED', 32),
  ('Deep cleaning + upholstery + fumigation', 'deep-cleaning-upholstery-fumigation', 'A full deep clean with one set of upholstery cleaned and fumigation.', 'BEDROOM_BASED', 33)
on conflict (slug) do nothing;

update public.services
   set description = 'Window vacuuming and thorough cleaning, door cleaning and polishing, wardrobe and cabinet interior and exterior cleaning, sweeping and scrubbing of all floors, deep cleaning of kitchen walls, bathroom wall cleaning, cleaning and disinfecting of the WC and wash hand basins, cleaning of shower knobs and glass surfaces, and cleaning and polishing of all fittings.'
 where slug = 'deep-cleaning';

-- Priced from a tier table, so no property uplift and no property minimum.
update public.services
   set requires_review = false, uses_property_pricing = false, base_price = 0, minimum_charge = 0, duration_minutes = 300
 where slug in ('deep-cleaning', 'deep-cleaning-upholstery', 'deep-cleaning-fumigation', 'deep-cleaning-upholstery-fumigation');

-- Post-construction is quoted per unit and needs no uplift either.
update public.services
   set requires_review = false, uses_property_pricing = false, base_price = 0, minimum_charge = 0, duration_minutes = 480
 where slug = 'post-construction-cleaning';

-- ---------------------------------------------------------------------------
-- Published bedroom prices
-- ---------------------------------------------------------------------------

insert into public.service_bedroom_tiers (service_id, bedrooms, price)
select s.id, v.bedrooms, v.price
  from (values
    ('deep-cleaning', 1,  86000), ('deep-cleaning', 2, 107500), ('deep-cleaning', 3, 161250),
    ('deep-cleaning', 4, 215000), ('deep-cleaning', 5, 268750), ('deep-cleaning', 6, 322500),

    ('deep-cleaning-upholstery', 1, 161250), ('deep-cleaning-upholstery', 2, 182750),
    ('deep-cleaning-upholstery', 3, 215000), ('deep-cleaning-upholstery', 4, 301000),
    ('deep-cleaning-upholstery', 5, 322500), ('deep-cleaning-upholstery', 6, 376250),

    ('deep-cleaning-fumigation', 1, 161250), ('deep-cleaning-fumigation', 2, 182750),
    ('deep-cleaning-fumigation', 3, 247250), ('deep-cleaning-fumigation', 4, 301000),
    ('deep-cleaning-fumigation', 5, 376250), ('deep-cleaning-fumigation', 6, 430000),

    ('deep-cleaning-upholstery-fumigation', 1, 215000), ('deep-cleaning-upholstery-fumigation', 2, 236500),
    ('deep-cleaning-upholstery-fumigation', 3, 322500), ('deep-cleaning-upholstery-fumigation', 4, 376250),
    ('deep-cleaning-upholstery-fumigation', 5, 462250), ('deep-cleaning-upholstery-fumigation', 6, 483750)
  ) as v(service_slug, bedrooms, price)
  join public.services s on s.slug = v.service_slug
on conflict (service_id, bedrooms) do update set price = excluded.price, updated_at = now();

-- ---------------------------------------------------------------------------
-- Spaces post-construction is quoted on
-- ---------------------------------------------------------------------------

insert into public.space_types (slug, name, description, max_count, requires_review, sort_order) values
  ('storey',         'Storey',           'Floors in the building, charged per storey.',              10, false, 45),
  ('penthouse-area', 'Penthouse',        'A top-floor penthouse level.',                              1, false, 135),
  ('extra-room',     'Other room',       'Library, mini office, laundry room or similar.',           20, false, 125),
  ('compound-sweep', 'Compound — sweep', 'Sweeping the compound only.',                               1, false, 150),
  ('compound-wash',  'Compound — wash',  'Washing the compound. Priced for a normal 500sqm plot.',    1, false, 151)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, max_count = excluded.max_count,
  requires_review = excluded.requires_review, sort_order = excluded.sort_order, updated_at = now();

insert into public.service_space_prices (service_id, space_type_id, unit_price, included_count)
select s.id, t.id, v.unit_price, 0
  from (values
    ('post-construction-cleaning', 'bedroom',        50000),
    ('post-construction-cleaning', 'living-room',    60000),
    ('post-construction-cleaning', 'storey',         50000),
    ('post-construction-cleaning', 'boys-quarters',  50000),
    ('post-construction-cleaning', 'penthouse-area', 50000),
    ('post-construction-cleaning', 'extra-room',     30000),
    ('post-construction-cleaning', 'compound-sweep', 20000),
    ('post-construction-cleaning', 'compound-wash',  70000)
  ) as v(service_slug, space_slug, unit_price)
  join public.services s on s.slug = v.service_slug
  join public.space_types t on t.slug = v.space_slug
on conflict (service_id, space_type_id) do update set
  unit_price = excluded.unit_price, included_count = 0, is_active = true, updated_at = now();

-- The published bedroom price is the whole price. Any per-room prices left from the old
-- placeholder seed would be added on top of it, so they are switched off for these
-- packages: bedroom count is the only thing that moves a deep-cleaning price.
update public.service_space_prices sp
   set is_active = false, updated_at = now()
  from public.services s
 where sp.service_id = s.id
   and s.slug in ('deep-cleaning', 'deep-cleaning-upholstery', 'deep-cleaning-fumigation', 'deep-cleaning-upholstery-fumigation');

-- The published list quotes one figure with no travel charge, so travel starts at zero.
-- Staff can set real travel rates in the console whenever they want them.
update public.service_areas set surcharge = 0 where surcharge <> 0;

-- ---------------------------------------------------------------------------
-- Pricing
-- ---------------------------------------------------------------------------

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
  tier_count integer;
  tier_price numeric(12,2);
  tier_max integer;
  bedroom_count integer := 0;
  uses_tiers boolean := false;
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

  select count(*), max(bedrooms) into tier_count, tier_max
    from public.service_bedroom_tiers where service_id = service_row.id;
  uses_tiers := coalesce(tier_count, 0) > 0;

  if service_row.requires_review then
    review_required := true;
    review_reasons := review_reasons || 'This service is always quoted by our team.'::text;
  end if;
  -- A property type only affects the price where the service opts into it.
  if property_row.requires_review and service_row.uses_property_pricing then
    review_required := true;
    review_reasons := review_reasons || format('%s properties are quoted by our team.', property_row.name);
  end if;
  if area_row.requires_review then
    review_required := true;
    review_reasons := review_reasons || format('%s is outside our instant-quote area.', area_row.name);
  end if;

  if uses_tiers then
    -- The bedroom count decides the whole base price; bedrooms are not charged per unit.
    for space_entry in select value from jsonb_array_elements(coalesce(request -> 'spaces', '[]'::jsonb)) loop
      if nullif(trim(space_entry ->> 'slug'), '') = 'bedroom' then
        bedroom_count := coalesce((space_entry ->> 'count')::integer, 0);
      end if;
    end loop;

    select price into tier_price
      from public.service_bedroom_tiers
     where service_id = service_row.id and bedrooms = bedroom_count;

    if not found then
      review_required := true;
      review_reasons := review_reasons || case
        when bedroom_count > coalesce(tier_max, 0)
          then format('We quote homes above %s bedrooms individually.', tier_max)
        else 'Tell us how many bedrooms so we can price this.'::text
      end;
    else
      running_subtotal := tier_price;
      items := items || jsonb_build_object(
        'kind', 'BASE',
        'label', format('%s, %s bedroom%s', service_row.name, bedroom_count, case when bedroom_count = 1 then '' else 's' end),
        'spaceTypeSlug', null, 'quantity', 1, 'unitAmount', tier_price, 'amount', tier_price, 'sortOrder', item_order
      );
      item_order := item_order + 1;
    end if;
  else
    running_subtotal := service_row.base_price;
    if service_row.base_price > 0 then
      items := items || jsonb_build_object(
        'kind', 'BASE', 'label', service_row.name || ' base', 'spaceTypeSlug', null,
        'quantity', 1, 'unitAmount', service_row.base_price, 'amount', service_row.base_price, 'sortOrder', item_order
      );
      item_order := item_order + 1;
    end if;
  end if;

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
    -- Already covered by the bedroom tier.
    continue when uses_tiers and space_slug = 'bedroom';

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

  if service_row.uses_property_pricing then
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
  else
    multiplied_subtotal := running_subtotal;
    minimum_value := service_row.minimum_charge;
  end if;

  total_value := greatest(multiplied_subtotal, minimum_value);
  if total_value > multiplied_subtotal then
    items := items || jsonb_build_object(
      'kind', 'MINIMUM_ADJUSTMENT', 'label', 'Minimum charge adjustment', 'spaceTypeSlug', null,
      'quantity', 1, 'unitAmount', total_value - multiplied_subtotal, 'amount', total_value - multiplied_subtotal, 'sortOrder', item_order
    );
    item_order := item_order + 1;
  end if;

  -- Nothing selected at all is not a free job.
  if not review_required and total_value <= 0 then
    review_required := true;
    review_reasons := review_reasons || 'Tell us a little more about your space so we can price it.'::text;
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
