-- Clear test bookings and start clean.
--
-- Deletes every booking with its quote, line items, answers, lead, customer and outbox
-- event. Pricing reference data — services, property types, space types, space prices,
-- service areas, booking slots and availability rules — is left untouched.
--
-- Run this in the Supabase SQL Editor. It runs in one transaction, so either all of it
-- applies or none of it does. Review the counts it prints before you commit to using it
-- again on a database that has real customers in it.

begin;

-- Order matters: bookings and quotes hold ON DELETE RESTRICT references to leads and
-- customers, so dependents have to go first.
delete from public.email_deliveries;

delete from public.automation_outbox
 where aggregate_type = 'booking'
   and aggregate_id in (select id from public.bookings);

-- quote_items and quote_answers cascade from quotes, but bookings restrict-reference
-- quotes, so the bookings themselves are removed first.
delete from public.bookings;
delete from public.quotes;
delete from public.leads;
delete from public.customer_identities;
delete from public.customers;

-- Confirm what is left before committing.
select 'bookings' as table_name, count(*) from public.bookings
union all select 'quotes', count(*) from public.quotes
union all select 'quote_items', count(*) from public.quote_items
union all select 'quote_answers', count(*) from public.quote_answers
union all select 'leads', count(*) from public.leads
union all select 'customers', count(*) from public.customers
union all select 'automation_outbox', count(*) from public.automation_outbox
union all select '-- reference data below --', null
union all select 'services', count(*) from public.services
union all select 'property_types', count(*) from public.property_types
union all select 'space_types', count(*) from public.space_types
union all select 'service_space_prices', count(*) from public.service_space_prices
union all select 'service_areas', count(*) from public.service_areas
union all select 'booking_slots', count(*) from public.booking_slots
union all select 'availability_rules', count(*) from public.availability_rules;

commit;

-- Booking numbers keep counting from where they left off, so your next booking will be
-- BOOM-5 rather than BOOM-1. To restart the sequence as well, run:
--   alter table public.bookings alter column booking_number restart with 1;
--   alter table public.quotes   alter column quote_number   restart with 1;
