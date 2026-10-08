# Local secret entry

Run both commands from `/Users/andrewjunior/Developer/boom-paystack`.

In one terminal, select the destination key:

```sh
python3 scripts/receive-secret.py --key FLUTTERWAVE_SECRET_KEY
```

In another terminal, enter the value at a hidden prompt:

```sh
zsh scripts/send-secret.zsh
```

The owner-only FIFO is `.secrets/input.fifo`. The receiver writes the secret atomically
into `.env.local` with mode 600 and prints only the key name. The FIFO directory has mode
700, the FIFO mode 600, and both are excluded from Git. One receiver can run at a time.

Allowed keys: FLUTTERWAVE_SECRET_KEY (FLWSECK- keys), FLUTTERWAVE_WEBHOOK_SECRET, PAYSTACK_SECRET_KEY (test keys only), RESEND_API_KEY, CRON_SECRET,
ADMIN_PASSWORD, ADMIN_SESSION_SECRET. Repeat the receiver command for each key.

The pipe transports data locally and stores no value itself. The destination environment
file still contains the secret and is readable by processes running as your user. Restart
the application if it does not reload environment changes. Never put a key directly in
an `echo` command, command argument, chat message, or screenshot.
