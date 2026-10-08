alter table public.admin_owner drop constraint admin_owner_email_check;
alter table public.admin_owner add constraint admin_owner_email_check check(email=lower(btrim(email)) and length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
alter table public.admin_owner_setup add column allow_replace boolean not null default false;
drop function public.claim_admin_owner(text,text);
create function public.claim_admin_owner(token_value text,password_value text,email_value text) returns boolean
language plpgsql security invoker set search_path=public as $$
declare setup_row public.admin_owner_setup%rowtype; normalized_email text:=lower(btrim(email_value));
begin
 perform pg_advisory_xact_lock(827104);
 if normalized_email is null or length(normalized_email)>254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false; end if;
 select * into setup_row from admin_owner_setup where id=1 and token_hash=token_value and expires_at>now() and used_at is null for update;
 if not found then return false; end if;
 if exists(select 1 from admin_owner) and not setup_row.allow_replace then return false; end if;
 insert into admin_owner(id,email,password_hash) values(1,normalized_email,password_value)
 on conflict(id) do update set email=excluded.email,password_hash=excluded.password_hash;
 update admin_owner_setup set used_at=now(),allow_replace=false where id=1;
 return true;
end;
$$;
revoke all on function public.claim_admin_owner(text,text,text) from public,anon,authenticated;
grant execute on function public.claim_admin_owner(text,text,text) to service_role;
