# Service and schedule management

Updated 15 October 2026 using the owner's price sheet and post-construction instructions.

| Bedrooms | Deep cleaning | With chairs | With fumigation | With chairs and fumigation |
| --- | ---: | ---: | ---: | ---: |
| 1 | ₦106,000 | ₦185,000 | ₦180,000 | ₦250,000 |
| 2 | ₦127,000 | ₦205,000 | ₦200,000 | ₦280,000 |
| 3 | ₦185,000 | ₦250,000 | ₦275,000 | ₦335,000 |
| 4 | ₦250,000 | ₦310,000 | ₦335,000 | ₦385,000 |
| 5 | ₦300,000 | ₦370,000 | ₦405,000 | ₦490,000 |
| 6 | ₦360,000 | ₦420,000 | ₦480,000 | ₦540,000 |

Post-construction: bedroom ₦50,000, living room ₦70,000, kitchen ₦80,000 each. Other room types and post-renovation rates retain their previous prices. Existing quote and payment snapshots retain their stored amounts.

## Services

Open `/admin/services` and choose a service. Edit its name, description, duration, visibility or prices, then select **Save changes**. Stable service links are preserved when names change.

Select **Create service** to copy the pricing setup of an existing active priced service. Enter a new name, unique link and description. The result is a hidden draft: review and edit the copied prices before changing visibility to **Published** and saving. This supports existing bedroom and item pricing shapes. It is not a builder for arbitrary new pricing formulas or new item types.

Published services appear in the catalogue, booking options and public pricing page. Drafts remain available in the admin editor and are excluded from public booking.

## Schedule

Open `/admin/schedule`. Choose weekly opening days and hours, enable arrival windows, and change their displayed labels. Save availability before making further date changes. Clock times and per-window booking capacity remain the established database values.

Use **Block dates** for full-day closures (the first and last day are both included). **Reopen dates** removes the selected closure. All scheduling uses Africa/Lagos. Existing appointments are retained; schedule changes affect availability for new bookings.

Existing morning and afternoon windows remain enabled and Sunday remains closed until the owner saves changes. The schedule screen also exposes disabled legacy arrival times so the owner can explicitly enable them if appropriate.
