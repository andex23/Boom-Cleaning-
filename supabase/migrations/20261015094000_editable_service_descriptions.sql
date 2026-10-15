-- Preserve the public owner-approved descriptions before making them editable.
update public.services s set description=v.description,updated_at=now() from (values
('upholstery-cleaning','Specialist cleaning for sofas, dining chairs and bed frames. Select each furniture type and quantity to see your estimate. Choose either a full seven-seater set or the individual pieces in that set, not both. Bed-frame cleaning does not include mattress cleaning.'),
('post-construction-cleaning','A thorough cleaning service designed to remove construction dust, debris, paint splashes, cement residue, and other building-related dirt, leaving the property clean, safe, and ready for use.'),
('post-renovation-cleaning','A detailed clean-up after renovation work, removing dust, stains, debris, and leftover materials from floors, walls, windows, fittings, and other surfaces—so your newly renovated space is fresh and move-in ready.'),
('deep-cleaning','Deep Cleaning is a detailed cleaning service that goes beyond regular cleaning. It focuses on removing built-up dirt, dust, stains, grease, and hidden grime from areas that are often overlooked.

It typically includes thorough cleaning of floors, walls, kitchens, bathrooms, windows, doors, furniture, corners, and hard-to-reach areas, leaving the entire space fresh, hygienic, and revitalized.')) as v(slug,description) where s.slug=v.slug;
