-- Short-lived, one-use admin grants. No permanent owner credentials are changed.
create table public.admin_temporary_access (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
 owner_password_hash text not null,
 expires_at timestamptz not null,
 used_at timestamptz,
 session_hash text unique check (session_hash ~ '^[a-f0-9]{64}$'),
 session_expires_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 check (expires_at > created_at and expires_at <= created_at + interval '15 minutes'),
 check ((used_at is null and session_hash is null and session_expires_at is null) or
        (used_at is not null and session_hash is not null and session_expires_at > used_at and session_expires_at <= used_at + interval '1 hour'))
);
alter table public.admin_temporary_access enable row level security;
revoke all on public.admin_temporary_access from public,anon,authenticated;
grant select,insert,update,delete on public.admin_temporary_access to service_role;

create function public.issue_temporary_admin_access(token_value text) returns timestamptz
language plpgsql security invoker set search_path='' as $$
declare expiry timestamptz:=now()+interval '15 minutes'; owner_hash text;
begin
 select password_hash into owner_hash from public.admin_owner where id=1;
 if owner_hash is null then raise exception 'Owner account unavailable'; end if;
 insert into public.admin_temporary_access(token_hash,owner_password_hash,expires_at) values(token_value,owner_hash,expiry);
 return expiry;
end $$;
create function public.redeem_temporary_admin_access(token_value text,session_value text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 update public.admin_temporary_access g set used_at=now(),session_hash=session_value,session_expires_at=now()+interval '1 hour'
 where token_hash=token_value and used_at is null and revoked_at is null and expires_at>now()
 and owner_password_hash=(select password_hash from public.admin_owner where id=1);
 return found;
end $$;
create function public.valid_temporary_admin_session(session_value text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.admin_temporary_access g where session_hash=session_value
 and used_at is not null and revoked_at is null and session_expires_at>now()
 and owner_password_hash=(select password_hash from public.admin_owner where id=1));
$$;
revoke all on function public.issue_temporary_admin_access(text),public.redeem_temporary_admin_access(text,text),public.valid_temporary_admin_session(text) from public,anon,authenticated;
grant execute on function public.issue_temporary_admin_access(text),public.redeem_temporary_admin_access(text,text),public.valid_temporary_admin_session(text) to service_role;
