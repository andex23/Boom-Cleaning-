# Flutterwave live checkout

New bookings use Flutterwave Standard v3 hosted checkout. Prices come from the saved booking,
not the browser. The server verifies the reference, exact full NGN amount and successful status
before atomically confirming a pending booking. Repeated verification queues no duplicate receipts.
Old Paystack test references retain their verification path and test labels.

Secrets are received through the owner-only FIFO; FLUTTERWAVE_SECRET_KEY and
FLUTTERWAVE_WEBHOOK_SECRET are server-only production environment variables.

Set the live Flutterwave dashboard webhook URL to:
https://boomcleaning.site/api/payments/flutterwave/webhook
Set its Secret Hash to the configured FLUTTERWAVE_WEBHOOK_SECRET.
The v3 endpoint authenticates verif-hash and re-fetches the payment from Flutterwave.
Callback verification and daily reconciliation also confirm paid bookings when a webhook is unavailable.

Real confirmations contain the BOOM logo and no test payment notices. Both the customer receipt
and independent admin confirmation to boomcleaninfo@gmail.com have durable retries.
A live key and hosted-link creation do not prove the merchant account has enabled every payment
method, nor do they prove a successful real charge. Verify account payment methods in the dashboard.
