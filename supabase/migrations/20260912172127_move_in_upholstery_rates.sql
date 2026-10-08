-- Owner-supplied September 12 price lists. Existing frozen quotes are unchanged.
-- Timestamp matches the applied production migration.
update public.services set base_price = 0, minimum_charge = 0,
  uses_property_pricing = false, requires_review = false, updated_at = now()
where slug in ('move-in-apartment-cleaning', 'upholstery-cleaning');

-- Whole-home move-in packages replace the old per-room charges.
update public.service_space_prices p set is_active = false, updated_at = now()
from public.services s where p.service_id = s.id
and s.slug in ('move-in-apartment-cleaning', 'upholstery-cleaning');

insert into public.service_bedroom_tiers (service_id, bedrooms, price)
select s.id, r.bedrooms, r.price from public.services s
cross join (values (1,100000),(2,150000),(3,200000),(4,250000),(5,300000),(6,350000)) r(bedrooms,price)
where s.slug = 'move-in-apartment-cleaning'
on conflict (service_id, bedrooms) do update set price = excluded.price, updated_at = now();

insert into public.space_types (slug,name,description,max_count,requires_review,sort_order)
values
('sofa-seven-seat-set','7-seater sofa (full set)','One complete seven-seat set.',20,false,200),
('sofa-three-seater','3-seater sofa','Price per sofa.',20,false,201),
('sofa-two-seater','2-seater sofa','Price per sofa.',20,false,202),
('sofa-one-seater','1-seater chair','Price per chair.',20,false,203),
('dining-chair','Dining chair','Price per dining chair.',100,false,204),
('bed-frame-3x6','Bed frame · 3 × 6','Bed frame cleaning; mattress not included.',20,false,205),
('bed-frame-4x6','Bed frame · 4 × 6','Bed frame cleaning; mattress not included.',20,false,206),
('bed-frame-5x6','Bed frame · 5 × 6','Bed frame cleaning; mattress not included.',20,false,207),
('bed-frame-6x6-6x7','Bed frame · 6 × 6 or 6 × 7','Bed frame cleaning; mattress not included.',20,false,208)
on conflict (slug) do update set name=excluded.name,description=excluded.description,
max_count=excluded.max_count,requires_review=false,is_active=true,sort_order=excluded.sort_order,updated_at=now();

insert into public.service_space_prices (service_id,space_type_id,unit_price,included_count,is_active)
select s.id,t.id,r.price,0,true from public.services s
cross join (values ('sofa-seven-seat-set',60000),('sofa-three-seater',30000),
('sofa-two-seater',25000),('sofa-one-seater',15000),('dining-chair',7000),
('bed-frame-3x6',20000),('bed-frame-4x6',30000),('bed-frame-5x6',35000),('bed-frame-6x6-6x7',40000)) r(slug,price)
join public.space_types t on t.slug=r.slug where s.slug='upholstery-cleaning'
on conflict (service_id,space_type_id) do update set unit_price=excluded.unit_price,
included_count=0,is_active=true,updated_at=now();
