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

insert into public.service_questions (service_id, label, field_type, is_required, options, sort_order)
select id, 'Number of bedrooms', 'number', true, '[]'::jsonb, 10 from public.services where slug = 'deep-cleaning'
on conflict (service_id, sort_order) do nothing;
