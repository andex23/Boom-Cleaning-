-- Pricing reference data.
--
-- These are operating prices, not development fixtures, so they live in a migration
-- rather than seed.sql. Every statement is re-runnable: prices staff have since edited in
-- the console are preserved by only inserting rows that do not exist yet, while structural
-- fields (name, ordering, review flags) are kept in sync.
--
-- Amounts are carried over from the previous hardcoded browser formula in
-- src/data/public-demo.ts so this migration does not silently change what customers pay.
-- The one modelling change is that property adjustments become multipliers with a floor
-- rather than flat add-ons, per the agreed pricing model.

-- The bookable catalogue. seed.sql also inserts these for local development, but it runs
-- after the migrations, so this file cannot rely on those rows existing: on a fresh
-- database the price updates below would otherwise match nothing.
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

insert into public.property_types (slug, name, description, base_multiplier, minimum_charge, requires_review, sort_order) values
  ('apartment',  'Apartment',        'A flat or apartment within a shared building.',        1.000, 35000, false, 10),
  ('terrace',    'Terrace',          'A terraced or semi-detached home.',                    1.150, 45000, false, 20),
  ('bungalow',   'Bungalow',         'A single-storey detached home.',                       1.200, 45000, false, 30),
  ('detached',   'Detached home',    'A standalone house on its own grounds.',               1.300, 55000, false, 40),
  ('duplex',     'Duplex',           'A two-storey home, including semi and fully detached.', 1.350, 60000, false, 50),
  ('penthouse',  'Penthouse',        'A top-floor residence, typically with terrace access.', 1.600, 90000, false, 60),
  ('office',     'Office / commercial', 'A workplace or commercial premises.',               1.200, 50000, false, 70),
  ('estate',     'Estate / compound', 'Multiple buildings or extensive grounds.',             1.000,     0, true,  80)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description,
  requires_review = excluded.requires_review, sort_order = excluded.sort_order, updated_at = now();

insert into public.space_types (slug, name, description, max_count, requires_review, sort_order) values
  ('bedroom',            'Bedroom',            'Bedrooms, including the master.',                  20, false, 10),
  ('bathroom',           'Bathroom',           'Bathrooms, toilets and guest cloakrooms.',         20, false, 20),
  ('living-room',        'Living room',        'Sitting rooms, lounges and family rooms.',         10, false, 30),
  ('kitchen',            'Kitchen',            'Kitchens and pantries.',                            5, false, 40),
  ('dining-room',        'Dining room',        'Formal or informal dining areas.',                  5, false, 50),
  ('study',              'Study / home office','Studies, offices and libraries.',                    5, false, 60),
  ('boys-quarters',      'Boys'' quarters',    'Self-contained staff or guest quarters (BQ).',      5, false, 70),
  ('balcony',            'Balcony / terrace',  'Open balconies and terraces.',                     10, false, 80),
  ('gazebo',             'Gazebo',             'A garden gazebo, pergola or outdoor shelter.',      5, false, 90),
  ('external-staircase', 'External staircase', 'Outdoor stairs and landings.',                      5, false, 100),
  ('garage',             'Garage / carport',   'Enclosed garages and covered parking.',             5, false, 110),
  ('store-room',         'Store room',         'Stores, utility rooms and box rooms.',             10, false, 120),
  ('pool-area',          'Pool area',          'Swimming pool surrounds and pool houses.',          3, true,  130),
  ('rooftop',            'Rooftop area',       'Rooftop terraces, decks and entertainment areas.',  3, true,  140)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, max_count = excluded.max_count,
  requires_review = excluded.requires_review, sort_order = excluded.sort_order, updated_at = now();

-- Surcharges preserved exactly from the previous browser formula.
insert into public.service_areas (slug, name, surcharge, requires_review, sort_order) values
  ('central', 'Central Abuja',   5000, false, 10),
  ('nearby',  'Greater Abuja',      0, false, 20),
  ('outer',   'Outer Abuja',    10000, false, 30),
  ('outside', 'Outside Abuja',      0, true,  40)
on conflict (slug) do update set
  name = excluded.name, requires_review = excluded.requires_review,
  sort_order = excluded.sort_order, updated_at = now();

-- Base prices and minimums for instantly-quotable services. MANUAL_QUOTE services are
-- flagged so calculate_quote always routes them to a person.
update public.services set base_price = 45000, minimum_charge = 45000, duration_minutes = 300, requires_review = false where slug = 'deep-cleaning';
update public.services set base_price = 50000, minimum_charge = 50000, duration_minutes = 360, requires_review = false where slug = 'move-in-apartment-cleaning';
update public.services set base_price = 25000, minimum_charge = 25000, duration_minutes = 180, requires_review = false where slug = 'upholstery-cleaning';
update public.services set base_price = 15000, minimum_charge = 15000, duration_minutes = 120, requires_review = false where slug = 'laundry';
update public.services set requires_review = true, duration_minutes = 240 where slug in ('post-construction-cleaning', 'post-renovation-cleaning', 'office-cleaning', 'fumigation');

-- Per-unit prices. A gazebo is priced differently per service, and a service with no row
-- for a space type routes that scope to manual review rather than charging nothing.
--
-- included_count absorbs what the base price already covers: a deep clean's base includes
-- one bedroom, one bathroom, one living room and one kitchen.
insert into public.service_space_prices (service_id, space_type_id, unit_price, included_count)
select s.id, t.id, v.unit_price, v.included_count
  from (values
    ('deep-cleaning', 'bedroom',             7500, 1),
    ('deep-cleaning', 'bathroom',            5000, 1),
    ('deep-cleaning', 'living-room',         6000, 1),
    ('deep-cleaning', 'kitchen',             7000, 1),
    ('deep-cleaning', 'dining-room',         4500, 0),
    ('deep-cleaning', 'study',               4500, 0),
    ('deep-cleaning', 'boys-quarters',      12000, 0),
    ('deep-cleaning', 'balcony',             3500, 0),
    ('deep-cleaning', 'gazebo',              8000, 0),
    ('deep-cleaning', 'external-staircase',  4000, 0),
    ('deep-cleaning', 'garage',              6000, 0),
    ('deep-cleaning', 'store-room',          3000, 0),

    ('move-in-apartment-cleaning', 'bedroom',             7500, 1),
    ('move-in-apartment-cleaning', 'bathroom',            6000, 1),
    ('move-in-apartment-cleaning', 'living-room',         6500, 1),
    ('move-in-apartment-cleaning', 'kitchen',             9000, 1),
    ('move-in-apartment-cleaning', 'dining-room',         5000, 0),
    ('move-in-apartment-cleaning', 'study',               5000, 0),
    ('move-in-apartment-cleaning', 'boys-quarters',      14000, 0),
    ('move-in-apartment-cleaning', 'balcony',             4000, 0),
    ('move-in-apartment-cleaning', 'gazebo',              9000, 0),
    ('move-in-apartment-cleaning', 'external-staircase',  4500, 0),
    ('move-in-apartment-cleaning', 'garage',              7000, 0),
    ('move-in-apartment-cleaning', 'store-room',          3500, 0),

    ('upholstery-cleaning', 'living-room',  2500, 1),
    ('upholstery-cleaning', 'bedroom',      2500, 0),
    ('upholstery-cleaning', 'study',        2500, 0),

    ('laundry', 'bedroom', 2500, 1)
  ) as v(service_slug, space_slug, unit_price, included_count)
  join public.services s on s.slug = v.service_slug
  join public.space_types t on t.slug = v.space_slug
on conflict (service_id, space_type_id) do nothing;
