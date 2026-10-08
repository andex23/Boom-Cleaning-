# BOOM Cleaning — owner guide

Website: https://boomcleaning.site  
Admin sign-in: https://boomcleaning.site/admin/login  
Owner account: boomcleaninfo@gmail.com

## Start here

Open your private owner setup link and choose a password of at least 12 characters. The link expires after 48 hours and works once. After setup, sign in with your email and chosen password. The old shared password stops working and previous sessions are signed out. Keep your password in a password manager. Request a replacement setup link if it expires before you use it. Password recovery after account creation currently requires the maintainer; there is no public reset or registration form.

## Daily operations

- **Overview:** today’s confirmed work, verified revenue, website visits and unpaid bookings. The payment chart lets you choose previous weeks or calendar months.
- **Inbox:** website enquiries with customer contact details and stage. This does not display your Gmail inbox or Instagram messages.
- **Bookings:** search and filter appointments. Open a booking for its customer, address, service, date and price breakdown. Payment confirms the booking automatically. Start and complete jobs when the cleaning happens; use cancellation, rescheduling and no-show actions when appropriate.
- **Customers:** customer contact details and booking history.
- **Payments:** verified receipts and outstanding checkouts. Use Weekly/Monthly, the date picker, Previous/Next and Daily breakdown to inspect payment history. The separate ledger shows the latest 50 booking records. Check payment re-verifies an existing transaction. Do not mark unpaid bookings as paid.
- **Analytics:** public page views, anonymous sessions, popular pages, traffic sources and device types. Collection began on 8 October 2026; earlier traffic is unavailable. Respecting browser privacy preferences means some visits will not be counted.
- **Services:** select a service, change its published prices and save. Changes affect new bookings; existing quotes retain their original prices.
- **Integrations:** configured payment/email connections. Instagram is grey and inactive.

**Book for a customer** opens the normal booking form for customers who contact you by phone or message. Payment is still required to confirm the appointment.

## Confirmation emails

After payment is verified, the customer receives a branded confirmation and BOOM receives a separate owner notification at boomcleaninfo@gmail.com. The sender is bookings@boomcleaning.site; replies go to BOOM’s email. If a customer reports a missing email, inspect Resend delivery status and spam folders before resending. Provider configuration is not proof that a specific email was delivered.

## Before accepting customer payments

Flutterwave has shown “Your activity is under review due to irregular transaction patterns.” Contact Flutterwave support using the merchant account **BOOM CLEANING SERVICE LIMITED** and the checkout screenshot/reference. Website changes cannot remove this provider restriction. Stop repeated diagnostic live checkouts while support investigates.

Once the restriction is cleared, complete one owner-authorized real payment. Confirm the booking appears exactly once, webhook delivery is successful, and both customer and owner emails arrive. This acceptance check is still outstanding; no real paid transaction is claimed in the handoff.

## Hosting and maintenance

The site runs on Vercel; data is in Supabase; Flutterwave handles checkout; Resend sends emails; Namecheap manages the domain; GitHub stores the source. Arrange access to each provider through their normal account/team settings. Owning the admin account does not automatically transfer those provider accounts.

All 16 test bookings and related test records were cleared before handoff. Published service prices and configuration were preserved. A verified private database backup exists; do not share it publicly. Booking numbers continue from the existing sequence.

Technical setup, backups, deployment and recovery notes are in `handoff.md`. Ask the maintainer before changing secrets, database schema or payment settings. No credentials belong in this guide.
