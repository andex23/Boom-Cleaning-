-- One transaction for every price edit, including the package tiers used by checkout.
create function public.apply_admin_pricing(request jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare item jsonb; service_key uuid; space_key uuid;
begin
  for item in select * from jsonb_array_elements(coalesce(request->'services','[]')) loop
    update services set base_price=(item->>'basePrice')::numeric,minimum_charge=(item->>'minimumCharge')::numeric,
      requires_review=(item->>'requiresReview')::boolean,updated_at=now() where slug=item->>'slug';
    if not found then raise exception 'Unknown service'; end if;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(request->'propertyTypes','[]')) loop
    update property_types set base_multiplier=(item->>'baseMultiplier')::numeric,minimum_charge=(item->>'minimumCharge')::numeric,
      requires_review=(item->>'requiresReview')::boolean,updated_at=now() where slug=item->>'slug';
    if not found then raise exception 'Unknown property type'; end if;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(request->'serviceAreas','[]')) loop
    update service_areas set surcharge=(item->>'surcharge')::numeric,requires_review=(item->>'requiresReview')::boolean,
      updated_at=now() where slug=item->>'slug';
    if not found then raise exception 'Unknown service area'; end if;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(request->'spacePrices','[]')) loop
    select id into service_key from services where slug=item->>'serviceSlug';
    select id into space_key from space_types where slug=item->>'spaceSlug';
    if service_key is null or space_key is null then raise exception 'Unknown service or space'; end if;
    insert into service_space_prices(service_id,space_type_id,unit_price,included_count,is_active,updated_at)
      values(service_key,space_key,(item->>'unitPrice')::numeric,(item->>'includedCount')::integer,true,now())
      on conflict(service_id,space_type_id) do update set unit_price=excluded.unit_price,included_count=excluded.included_count,updated_at=now();
  end loop;
  for item in select * from jsonb_array_elements(coalesce(request->'bedroomTiers','[]')) loop
    update service_bedroom_tiers set price=(item->>'price')::numeric,updated_at=now() where id=(item->>'id')::uuid;
    if not found then raise exception 'Unknown bedroom package'; end if;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(request->'spaceTiers','[]')) loop
    update service_space_tiers set price=(item->>'price')::numeric,updated_at=now() where id=(item->>'id')::uuid;
    if not found then raise exception 'Unknown space package'; end if;
  end loop;
end;
$$;
revoke all on function public.apply_admin_pricing(jsonb) from public,anon,authenticated;
grant execute on function public.apply_admin_pricing(jsonb) to service_role;
