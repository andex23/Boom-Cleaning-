# Paystack test checkout

Customers choose a published service price and available appointment, review their details,
and continue directly to Paystack. Full payment is verified server-side against the saved
amount, currency, reference and test environment. Settlement changes a pending booking to
CONFIRMED and queues a confirmation receipt in one transaction. Staff do not approve bookings.

Test credentials are server-only. `PAYSTACK_SECRET_KEY` must start with `sk_test_`.
`EMAIL_FROM=BOOM Cleaning <bookings@boomcleaning.site>` and
`EMAIL_REPLY_TO=boomcleaninfo@gmail.com`. Add a sending-only `RESEND_API_KEY` for the verified domain.

Paystack test webhook URL: `https://boomcleaning.site/api/payments/paystack/webhook`.
The callback also verifies automatically, so the flow works when the webhook is not configured.
The webhook verifies the raw HMAC SHA512 signature and retrieves the transaction from Paystack.
No browser redirect or client-reported amount can mark a payment paid.

The existing `/api/internal/automation/email/dispatch` worker sends requested-booking emails
and confirmed-payment receipts with provider idempotency and retries. Configure
`AUTOMATION_WORKER_SECRET` (or `CRON_SECRET`) and call the worker with a Bearer token.
Payment verification also attempts delivery immediately. If email credentials are missing,
receipts remain queued. Test receipts explicitly say no real money was collected.

The admin Payments area lists booking payment records, provides test checkout links and
rechecks pending transactions. Test payments are labelled separately from real revenue.
Unpriced combinations are rejected at the public booking boundary; only published quantity
tiers appear in the selectors. Office cleaning currently has no published rates and is not
an instant-checkout option. Existing service rates are preserved.

A daily 06:00 Lagos-time Vercel Cron reconciles pending test payments and retries receipts.
Configure the Paystack webhook for immediate settlement when customers close checkout.
