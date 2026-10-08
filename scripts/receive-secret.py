#!/usr/bin/env python3
"""Receive one secret through an owner-only local FIFO; never log its value."""
import argparse
import os
from pathlib import Path
import stat
import tempfile

ALLOWED = {'FLUTTERWAVE_SECRET_KEY': 'FLWSECK-', 'FLUTTERWAVE_WEBHOOK_SECRET': '', 'PAYSTACK_SECRET_KEY': 'sk_test_', 'RESEND_API_KEY': 're_', 'CRON_SECRET': '', 'ADMIN_PASSWORD': '', 'ADMIN_SESSION_SECRET': ''}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--key', choices=ALLOWED, required=True)
parser.add_argument('--env', type=Path, default=Path('.env.local'))
args = parser.parse_args()
target = args.env.absolute()
root = target.parent / '.secrets'
root.mkdir(mode=0o700, exist_ok=True)
if root.is_symlink() or root.stat().st_uid != os.getuid():
    raise SystemExit('Unsafe secret directory.')
root.chmod(0o700)
fifo = root / 'input.fifo'
if not fifo.exists():
    os.mkfifo(fifo, 0o600)
info = fifo.lstat()
if not stat.S_ISFIFO(info.st_mode) or info.st_uid != os.getuid():
    raise SystemExit('Unsafe FIFO path.')
fifo.chmod(0o600)
# A lock prevents two receivers from splitting the same secret.
import fcntl
with (root / 'receiver.lock').open('a') as lock:
    os.chmod(lock.name, 0o600)
    try: fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError: raise SystemExit('A receiver is already running.')
    print(f'Ready for {args.key}. FIFO: {fifo}', flush=True)
    with fifo.open('rb') as source:
        raw = source.read(8193)
    if len(raw) > 8192: raise SystemExit('Secret exceeds size limit.')
    try: value = raw.decode('utf-8').strip()
    except UnicodeDecodeError: raise SystemExit('Secret must be UTF-8.')
    if not value or '\n' in value or '\r' in value or '\x00' in value:
        raise SystemExit('Secret must be one non-empty line.')
    if not value.startswith(ALLOWED[args.key]): raise SystemExit('Unexpected secret format.')
    if target.is_symlink(): raise SystemExit('Environment file must not be a symlink.')
    lines = target.read_text().splitlines() if target.exists() else []
    lines = [line for line in lines if line.split('=',1)[0].strip().removeprefix('export ') != args.key]
    # Quoting keeps punctuation literal when Next loads dotenv.
    value = value.replace('\\', '\\\\').replace('"', '\\"')
    lines.append(f'{args.key}="{value}"')
    fd, tmp = tempfile.mkstemp(prefix='.env-secret-', dir=target.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd,'w') as output: output.write('\n'.join(lines)+'\n')
        os.replace(tmp, target)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
    print(f'Saved {args.key}; value hidden.', flush=True)
