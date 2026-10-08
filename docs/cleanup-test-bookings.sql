-- Selective production cleanup. REVIEW ONLY by default: the final statement is ROLLBACK.
-- User confirmed all 16 current bookings are tests on 2026-10-08. Backup retained privately.
-- Keep a verified private backup first. Never run the development seed on production.
BEGIN;
LOCK TABLE public.bookings, public.payments IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE cleanup_requested (booking_number bigint PRIMARY KEY) ON COMMIT DROP;
INSERT INTO cleanup_requested VALUES (5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(21),(22),(23);
CREATE TEMP TABLE cleanup_bookings ON COMMIT DROP AS
  SELECT b.id,b.booking_number,b.quote_id,b.lead_id,b.customer_id
  FROM public.bookings b JOIN cleanup_requested r USING(booking_number);
DO $$ BEGIN
  IF (SELECT count(*) FROM cleanup_bookings) <> (SELECT count(*) FROM cleanup_requested) THEN
    RAISE EXCEPTION 'Selected bookings changed or are missing; review cleanup scope again';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments p JOIN cleanup_bookings b ON b.id=p.booking_id
             WHERE p.provider <> 'paystack_test' AND (p.status='PAID' OR p.paid_at IS NOT NULL)) THEN
    RAISE EXCEPTION 'Selected records contain a live payment; abort cleanup';
  END IF;
  IF EXISTS (SELECT 1 FROM public.jobs j JOIN cleanup_bookings b ON b.id=j.booking_id)
     OR EXISTS (SELECT 1 FROM public.reviews r JOIN cleanup_bookings b ON b.id=r.booking_id)
     OR EXISTS (SELECT 1 FROM public.conversations c JOIN cleanup_bookings b ON b.id=c.booking_id) THEN
    RAISE EXCEPTION 'Operational records depend on a selected booking; review before cleanup';
  END IF;
  IF EXISTS (SELECT 1 FROM public.quotes q JOIN cleanup_bookings c ON c.quote_id=q.id
             JOIN public.bookings b ON b.quote_id=q.id WHERE b.id NOT IN (SELECT id FROM cleanup_bookings)) THEN
    RAISE EXCEPTION 'A quote is shared with a retained booking; abort cleanup';
  END IF;
END $$;
-- FK dependents before parents; only rows associated with the selected booking list.
DELETE FROM public.email_deliveries WHERE booking_id IN (SELECT id FROM cleanup_bookings)
 OR outbox_id IN (SELECT id FROM public.automation_outbox WHERE aggregate_type='booking' AND aggregate_id IN (SELECT id FROM cleanup_bookings));
DELETE FROM public.automation_outbox WHERE aggregate_type='booking' AND aggregate_id IN (SELECT id FROM cleanup_bookings);
DELETE FROM public.payments WHERE booking_id IN (SELECT id FROM cleanup_bookings);
DELETE FROM public.bookings WHERE id IN (SELECT id FROM cleanup_bookings);
-- Answers and quote items cascade from the selected quote records.
DELETE FROM public.quotes WHERE id IN (SELECT quote_id FROM cleanup_bookings);
DELETE FROM public.leads l WHERE l.id IN (SELECT lead_id FROM cleanup_bookings)
 AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.lead_id=l.id)
 AND NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.lead_id=l.id)
 AND NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.lead_id=l.id)
 AND NOT EXISTS (SELECT 1 FROM public.instagram_dm_sessions s WHERE s.lead_id=l.id);
DELETE FROM public.customers c WHERE c.id IN (SELECT customer_id FROM cleanup_bookings)
 AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.customer_id=c.id)
 AND NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.customer_id=c.id)
 AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.customer_id=c.id)
 AND NOT EXISTS (SELECT 1 FROM public.conversations v WHERE v.customer_id=c.id)
 AND NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.customer_id=c.id);
SELECT booking_number AS reviewed_booking_number FROM cleanup_bookings ORDER BY booking_number;
SELECT 'bookings' AS table_name,count(*) AS remaining FROM public.bookings
UNION ALL SELECT 'payments',count(*) FROM public.payments
UNION ALL SELECT 'quotes',count(*) FROM public.quotes
UNION ALL SELECT 'customers',count(*) FROM public.customers
UNION ALL SELECT 'services',count(*) FROM public.services
UNION ALL SELECT 'service_space_prices',count(*) FROM public.service_space_prices
UNION ALL SELECT 'booking_slots',count(*) FROM public.booking_slots;
ROLLBACK;
