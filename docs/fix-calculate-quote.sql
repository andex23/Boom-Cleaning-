-- Fix: manual-quote services (fumigation, office, post-construction, post-renovation)
-- failed with 22P02 because an untyped string literal made Postgres resolve || to
-- anyarray || anyarray. Replaces public.calculate_quote in place; nothing else changes.

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
