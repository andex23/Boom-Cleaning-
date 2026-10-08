-- Owner-approved quote-flow corrections:
-- 1. Replace broad Abuja zones with the exact neighbourhoods BOOM serves.
-- 2. Make the compound a fixed NGN 20,000 add-on for every Deep Cleaning package.
-- 3. Clarify upholstery as chair cleaning everywhere service names are returned.

insert into public.service_areas (slug, name, surcharge, requires_review, is_active, sort_order) values
  ('kubwa',     'Kubwa',     0, false, true, 10),
  ('lugbe',     'Lugbe',     0, false, true, 20),
  ('lokogoma',  'Lokogoma',  0, false, true, 30),
  ('apo',       'Apo',       0, false, true, 40),
  ('garki',     'Garki',     0, false, true, 50),
  ('wuse',      'Wuse',      0, false, true, 60),
  ('maitama',   'Maitama',   0, false, true, 70),
  ('karu',      'Karu',      0, false, true, 80),
  ('asokoro',   'Asokoro',   0, false, true, 90)
on conflict (slug) do update set
  name = excluded.name,
  surcharge = excluded.surcharge,
  requires_review = excluded.requires_review,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.service_areas
   set is_active = false, updated_at = now()
 where slug not in ('kubwa', 'lugbe', 'lokogoma', 'apo', 'garki', 'wuse', 'maitama', 'karu', 'asokoro')
   and is_active;

update public.services set name = 'Upholstery (chair cleaning)', updated_at = now()
 where slug = 'upholstery-cleaning';
update public.services set name = 'Deep cleaning + upholstery (chair cleaning)', updated_at = now()
 where slug = 'deep-cleaning-upholstery';
update public.services set name = 'Deep cleaning + upholstery (chair cleaning) + fumigation', updated_at = now()
 where slug = 'deep-cleaning-upholstery-fumigation';

insert into public.service_space_prices (service_id, space_type_id, unit_price, included_count, is_active)
select s.id, t.id, 20000, 0, true
  from public.services s
  join public.space_types t on t.slug = 'compound-sweep'
 where s.slug in ('deep-cleaning', 'deep-cleaning-upholstery', 'deep-cleaning-fumigation', 'deep-cleaning-upholstery-fumigation')
on conflict (service_id, space_type_id) do update set
  unit_price = excluded.unit_price,
  included_count = excluded.included_count,
  is_active = true,
  updated_at = now();
