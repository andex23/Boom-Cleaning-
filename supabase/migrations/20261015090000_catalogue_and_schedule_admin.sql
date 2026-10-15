-- One transaction for every price edit, including the package tiers used by checkout.
create or replace function public.apply_admin_pricing(request jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare item jsonb; service_key uuid; space_key uuid;
begin
  for item in select * from jsonb_array_elements(coalesce(request->'services','[]')) loop
    update services set name=coalesce(nullif(trim(item->>'name'),''),name),description=coalesce(item->>'description',description),is_active=coalesce((item->>'isActive')::boolean,is_active),duration_minutes=coalesce((item->>'durationMinutes')::integer,duration_minutes),base_price=(item->>'basePrice')::numeric,minimum_charge=(item->>'minimumCharge')::numeric,
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

-- Owner supplied price list dated 15 October 2026. Existing quote snapshots are unchanged.
do $$ declare changed integer; begin
 update public.service_bedroom_tiers t set price=v.price,updated_at=now() from public.services s,(values ('deep-cleaning',1,106000),
('deep-cleaning',2,127000),
('deep-cleaning',3,185000),
('deep-cleaning',4,250000),
('deep-cleaning',5,300000),
('deep-cleaning',6,360000),
('deep-cleaning-upholstery',1,185000),
('deep-cleaning-upholstery',2,205000),
('deep-cleaning-upholstery',3,250000),
('deep-cleaning-upholstery',4,310000),
('deep-cleaning-upholstery',5,370000),
('deep-cleaning-upholstery',6,420000),
('deep-cleaning-fumigation',1,180000),
('deep-cleaning-fumigation',2,200000),
('deep-cleaning-fumigation',3,275000),
('deep-cleaning-fumigation',4,335000),
('deep-cleaning-fumigation',5,405000),
('deep-cleaning-fumigation',6,480000),
('deep-cleaning-upholstery-fumigation',1,250000),
('deep-cleaning-upholstery-fumigation',2,280000),
('deep-cleaning-upholstery-fumigation',3,335000),
('deep-cleaning-upholstery-fumigation',4,385000),
('deep-cleaning-upholstery-fumigation',5,490000),
('deep-cleaning-upholstery-fumigation',6,540000)) as v(slug,bedrooms,price)
 where t.service_id=s.id and s.slug=v.slug and t.bedrooms=v.bedrooms;
 get diagnostics changed=row_count;
 if changed <> 24 then raise exception 'Expected all 24 published bedroom prices'; end if;
end $$;

create or replace function public.create_admin_service(request jsonb) returns text
language plpgsql security invoker set search_path=public as $$
declare source services%rowtype; new_id uuid; new_slug text;
begin
 select * into source from services where slug=request->>'templateSlug' and is_active and not requires_review;
 if not found then raise exception 'Choose an active priced service as the starting point' using errcode='22023'; end if;
 if length(trim(request->>'name')) not between 2 and 120 or length(request->>'description') not between 10 and 3000 then raise exception 'Enter a service name and description' using errcode='22023'; end if;
 new_slug := request->>'slug';
 if new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new_slug)>100 then raise exception 'Invalid service link' using errcode='22023'; end if;
 insert into services(name,slug,description,pricing_model,is_active,sort_order,base_price,minimum_charge,requires_review,duration_minutes,uses_property_pricing)
 values(trim(request->>'name'),new_slug,request->>'description',source.pricing_model,false,(select coalesce(max(sort_order),0)+1 from services),source.base_price,source.minimum_charge,false,source.duration_minutes,source.uses_property_pricing) returning id into new_id;
 insert into service_bedroom_tiers(service_id,bedrooms,price) select new_id,bedrooms,price from service_bedroom_tiers where service_id=source.id;
 insert into service_space_tiers(service_id,space_type_id,quantity,price) select new_id,space_type_id,quantity,price from service_space_tiers where service_id=source.id;
 insert into service_space_prices(service_id,space_type_id,unit_price,included_count,is_active) select new_id,space_type_id,unit_price,included_count,is_active from service_space_prices where service_id=source.id;
 return new_slug;
end $$;
revoke all on function public.create_admin_service(jsonb) from public,anon,authenticated;
grant execute on function public.create_admin_service(jsonb) to service_role;

create or replace function public.save_admin_schedule(request jsonb) returns void
language plpgsql security invoker set search_path=public as $$
declare item jsonb;
begin
 if jsonb_array_length(request->'days')<>7 then raise exception 'Seven weekdays required' using errcode='22023'; end if;
 -- Disable old global working intervals, then apply one window for each weekday.
 update availability_rules set is_active=false,updated_at=now() where staff_id is null;
 for item in select * from jsonb_array_elements(request->'days') loop
  insert into availability_rules(staff_id,weekday,starts_at,ends_at,timezone,is_active)
  values(null,(item->>'weekday')::smallint,(item->>'start')::time,(item->>'end')::time,'Africa/Lagos',(item->>'open')::boolean)
  on conflict(staff_id,weekday,starts_at,ends_at) do update set is_active=excluded.is_active,updated_at=now();
 end loop;
 for item in select * from jsonb_array_elements(request->'slots') loop
  update booking_slots set label=item->>'label',is_active=(item->>'isActive')::boolean,updated_at=now() where id=(item->>'id')::uuid;
  if not found then raise exception 'Unknown arrival window' using errcode='22023'; end if;
 end loop;
end $$;
revoke all on function public.save_admin_schedule(jsonb) from public,anon,authenticated;
grant execute on function public.save_admin_schedule(jsonb) to service_role;
