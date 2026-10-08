create table public.admin_owner (
 id integer primary key check(id=1),
 email text not null check(email='boomcleaninfo@gmail.com'),
 password_hash text not null check(password_hash ~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$'),
 created_at timestamptz not null default now()
);
create table public.admin_owner_setup (
 id integer primary key check(id=1),
 token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,
 used_at timestamptz
);
alter table public.admin_owner enable row level security;
alter table public.admin_owner_setup enable row level security;
revoke all on public.admin_owner,public.admin_owner_setup from anon,authenticated;
grant all on public.admin_owner,public.admin_owner_setup to service_role;
create function public.claim_admin_owner(token_value text,password_value text) returns boolean
language plpgsql security invoker set search_path=public as $$
begin
 perform pg_advisory_xact_lock(827104);
 if exists(select 1 from admin_owner) then return false; end if;
 update admin_owner_setup set used_at=now() where id=1 and token_hash=token_value and expires_at>now() and used_at is null;
 if not found then return false; end if;
 insert into admin_owner(id,email,password_hash) values(1,'boomcleaninfo@gmail.com',password_value);
 return true;
end;
$$;
revoke all on function public.claim_admin_owner(text,text) from public,anon,authenticated;
grant execute on function public.claim_admin_owner(text,text) to service_role;
