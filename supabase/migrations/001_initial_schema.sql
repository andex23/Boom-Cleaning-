create extension if not exists "pgcrypto";

create type public.staff_role as enum ('STAFF', 'ADMIN');
create type public.pricing_model as enum ('FIXED', 'STARTING_FROM', 'BEDROOM_BASED', 'PROPERTY_SIZE', 'QUANTITY_BASED', 'LOCATION_BASED', 'RULE_BASED', 'MANUAL_QUOTE');
create type public.question_field_type as enum ('text', 'number', 'boolean', 'single_select', 'multi_select', 'location', 'date', 'textarea');
create type public.lead_status as enum ('NEW', 'QUALIFYING', 'QUALIFIED', 'QUOTE_SENT', 'AWAITING_PAYMENT', 'BOOKED', 'LOST', 'CANCELLED');

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.staff_role not null default 'STAFF',
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(), full_name text, phone text unique, email text unique, location text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.customer_identities (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade,
  channel text not null check (channel in ('WEBSITE', 'INSTAGRAM', 'WHATSAPP', 'FACEBOOK', 'PHONE')), external_id text not null,
  created_at timestamptz not null default now(), unique(channel, external_id)
);
create table public.services (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  description text, pricing_model public.pricing_model not null, is_active boolean not null default true, sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.service_questions (
  id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id) on delete cascade,
  label text not null, field_type public.question_field_type not null, is_required boolean not null default false, options jsonb not null default '[]'::jsonb,
  sort_order integer not null check (sort_order >= 0), created_at timestamptz not null default now(), unique(service_id, sort_order)
);
create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id) on delete cascade,
  rule_type text not null, configuration jsonb not null default '{}'::jsonb, is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.leads (
  id uuid primary key default gen_random_uuid(), customer_id uuid references public.customers(id) on delete set null, service_id uuid references public.services(id) on delete set null,
  source text not null, status public.lead_status not null default 'NEW', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_identities enable row level security;
alter table public.services enable row level security;
alter table public.service_questions enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.leads enable row level security;
alter table public.audit_logs enable row level security;

create function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.staff_profiles where id = auth.uid()) $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.staff_profiles where id = auth.uid() and role = 'ADMIN') $$;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

create policy "staff can read services" on public.services for select to authenticated using (public.is_staff());
create policy "admins manage services" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read service questions" on public.service_questions for select to authenticated using (public.is_staff());
create policy "admins manage service questions" on public.service_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "staff read customers" on public.customers for select to authenticated using (public.is_staff());
create policy "staff update customers" on public.customers for update to authenticated using (public.is_staff());
create policy "staff read identities" on public.customer_identities for select to authenticated using (public.is_staff());
create policy "staff read leads" on public.leads for select to authenticated using (public.is_staff());
create policy "staff update leads" on public.leads for update to authenticated using (public.is_staff());
create policy "admins read audit logs" on public.audit_logs for select to authenticated using (public.is_admin());
