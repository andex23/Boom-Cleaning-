#!/usr/bin/env python3
"""Export BOOM operational and configuration tables to a private, Git-ignored backup."""
import datetime, hashlib, json, os, pathlib, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
env = {}
for line in (ROOT / ".env.local").read_text().splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        key, value = line.split("=", 1)
        env[key] = value.strip().strip('"').strip("'")
url = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
if url != "https://igepbyooomglsjetfcgn.supabase.co":
    raise SystemExit("Refusing to export an unexpected database project.")
headers = {"apikey": env["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": "Bearer " + env["SUPABASE_SERVICE_ROLE_KEY"]}
tables = "customers customer_identities leads bookings quotes quote_items quote_answers payments automation_outbox email_deliveries jobs job_assignments conversations messages automation_events operation_notes activity_logs audit_logs reviews instagram_dm_sessions staff_profiles services service_questions pricing_rules property_types space_types service_space_prices service_bedroom_tiers service_space_tiers service_areas booking_slots availability_rules availability_blackouts crews testimonials website_visits admin_owner admin_owner_setup".split()
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
destination = ROOT / "output" / "backups" / ("handoff-" + stamp)
destination.mkdir(parents=True, mode=0o700)
os.chmod(destination, 0o700)
manifest = {"project": "igepbyooomglsjetfcgn", "createdAt": stamp, "tables": {}}
for table in tables:
    rows = []
    offset = 0
    while True:
        order = "job_id,staff_id" if table == "job_assignments" else "id"
        request = urllib.request.Request(f"{url}/rest/v1/{table}?select=*&order={order}&offset={offset}&limit=1000", headers=headers)
        with urllib.request.urlopen(request, timeout=30) as response:
            batch = json.load(response)
        rows.extend(batch)
        if len(batch) < 1000: break
        offset += len(batch)
    data = json.dumps(rows, ensure_ascii=False, indent=2).encode()
    target = destination / (table + ".json")
    target.write_bytes(data)
    os.chmod(target, 0o600)
    manifest["tables"][table] = {"rows": len(rows), "sha256": hashlib.sha256(data).hexdigest()}
target = destination / "manifest.json"
target.write_text(json.dumps(manifest, indent=2))
os.chmod(target, 0o600)
print(json.dumps({"backupDirectory": str(destination), "tableCount": len(tables), "bookingCount": manifest["tables"]["bookings"]["rows"]}))
