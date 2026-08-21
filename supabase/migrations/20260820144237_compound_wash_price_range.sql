-- BOOM supplied a range for compound washing rather than a fixed charge: a typical
-- 500sqm property is between NGN 70,000 and NGN 100,000 depending on its condition.
-- Keep the published starting price for display, but route this selection to a person so
-- the booking transaction never freezes NGN 70,000 as though it were the final amount.
update public.space_types
   set description = 'Compound washing for a typical 500sqm property is usually NGN 70,000 to NGN 100,000. Final price depends on the condition and scope.',
       requires_review = true,
       updated_at = now()
 where slug = 'compound-wash';
