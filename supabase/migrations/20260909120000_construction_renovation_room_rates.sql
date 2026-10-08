-- Owner approved the same handwritten room rates for both services.
-- Compound washing and building-height rules are handled separately.
update public.services
set requires_review = false, uses_property_pricing = false,
    base_price = 0, minimum_charge = 0, updated_at = now()
where slug in ('post-construction-cleaning', 'post-renovation-cleaning');

insert into public.service_space_prices
  (service_id, space_type_id, unit_price, included_count, is_active)
select s.id, t.id, rates.price, 0, true
from public.services s
cross join (values
  ('bedroom', 40000),
  ('living-room', 50000),
  ('boys-quarters', 30000),
  ('penthouse-area', 50000),
  ('extra-room', 20000),
  ('kitchen', 50000)
) as rates(slug, price)
join public.space_types t on t.slug = rates.slug
where s.slug in ('post-construction-cleaning', 'post-renovation-cleaning')
on conflict (service_id, space_type_id) do update
set unit_price = excluded.unit_price, included_count = 0,
    is_active = true, updated_at = now();

-- One storey is included; every additional storey adds NGN 50,000.
insert into public.service_space_prices
  (service_id, space_type_id, unit_price, included_count, is_active)
select s.id, t.id, 50000, 1, true
from public.services s cross join public.space_types t
where s.slug in ('post-construction-cleaning', 'post-renovation-cleaning')
  and t.slug = 'storey'
on conflict (service_id, space_type_id) do update
set unit_price = 50000, included_count = 1, is_active = true, updated_at = now();

update public.space_types
set description = 'One storey included. Two storeys add NGN 50,000; each further storey adds NGN 50,000.',
    requires_review = false, updated_at = now()
where slug = 'storey';

insert into public.service_space_prices
  (service_id, space_type_id, unit_price, included_count, is_active)
select s.id, t.id, 20000, 0, true
from public.services s cross join public.space_types t
where s.slug in ('post-construction-cleaning', 'post-renovation-cleaning')
  and t.slug = 'compound-sweep'
on conflict (service_id, space_type_id) do update
set unit_price = 20000, included_count = 0, is_active = true, updated_at = now();

-- Compound quantities identify size bands: 1 <=250, 2 <=400, 3 <=500,
-- 4 <=700 square metres. Band 5 deliberately has no price: inspection required.
-- A new slug prevents an old, open booking form from treating its 500 m²
-- washing selection (count 1) as the new, cheapest size band.
insert into public.space_types (slug, name, max_count, requires_review, description, sort_order)
values ('compound-pressure-wash', 'Compound pressure washing', 5, false,
  'Up to 250 m²: NGN 50,000; 251–400 m²: NGN 70,000; 401–500 m²: NGN 100,000; 501–700 m²: NGN 150,000. Above 700 m² requires a video or inspection.', 152)
on conflict (slug) do update set max_count = 5, requires_review = false,
  description = excluded.description, updated_at = now();

update public.service_space_prices sp set is_active = false, updated_at = now()
from public.services s, public.space_types t
where sp.service_id = s.id and sp.space_type_id = t.id
  and s.slug in ('post-construction-cleaning', 'post-renovation-cleaning')
  and t.slug = 'compound-wash';

insert into public.service_space_tiers (service_id, space_type_id, quantity, price)
select s.id, t.id, band.quantity, band.price
from public.services s cross join public.space_types t
cross join (values (1, 50000), (2, 70000), (3, 100000), (4, 150000)) as band(quantity, price)
where s.slug in ('post-construction-cleaning', 'post-renovation-cleaning')
  and t.slug = 'compound-pressure-wash'
on conflict (service_id, space_type_id, quantity) do update
set price = excluded.price, updated_at = now();
