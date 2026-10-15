-- A redeemed grant must carry an explicit expiry (CHECK otherwise permits SQL NULL).
alter table public.admin_temporary_access add constraint temporary_session_complete
 check (used_at is null or session_expires_at is not null);
