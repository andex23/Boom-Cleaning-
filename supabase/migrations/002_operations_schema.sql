-- Core operations. Provider integrations write into these records later; they do
-- not get direct access to this schema.

create type public.quote_status as enum ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');
create type public.booking_status as enum ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
create type public.payment_status as enum ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');
create type public.job_status as enum ('UNASSIGNED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type public.message_direction as enum ('INBOUND', 'OUTBOUND');
create type public.outbox_status as enum ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED');

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number bigint generated always as identity unique,
  lead_id uuid not null references public.leads(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  status public.quote_status not null default 'DRAFT',
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0 and discount <= subtotal),
  total numeric(12,2) generated always as (subtotal - discount) stored,
  expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  idempotency_key text unique,
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status <> 'SENT') or sent_at is not null),
  check ((accepted_at is null) or status = 'ACCEPTED')
);

create table public.quote_answers (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  service_question_id uuid references public.service_questions(id) on delete set null,
  question_label text not null,
  answer jsonb not null,
  created_at timestamptz not null default now(),
  unique (quote_id, service_question_id),
  check (jsonb_typeof(answer) in ('string', 'number', 'boolean', 'array', 'object', 'null'))
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  timezone text not null default 'Africa/Lagos',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (staff_id, weekday, starts_at, ends_at),
  check (ends_at > starts_at)
);

create table public.availability_blackouts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.staff_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null check (char_length(reason) between 2 and 500),
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number bigint generated always as identity unique,
  quote_id uuid unique references public.quotes(id) on delete restrict,
  lead_id uuid not null references public.leads(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  status public.booking_status not null default 'PENDING',
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  address text not null check (char_length(address) between 5 and 1000),
  location_note text,
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  total numeric(12,2) not null check (total >= 0),
  cancelled_at timestamptz,
  completed_at timestamptz,
  idempotency_key text unique,
  created_by uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end_at > scheduled_start_at),
  check ((cancelled_at is null) or status = 'CANCELLED'),
  check ((completed_at is null) or status = 'COMPLETED')
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  provider text not null check (char_length(provider) between 2 and 80),
  provider_reference text,
  status public.payment_status not null default 'PENDING',
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  amount numeric(12,2) not null check (amount >= 0),
  paid_at timestamptz,
  idempotency_key text unique,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((paid_at is null) or status = 'PAID')
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  status public.job_status not null default 'UNASSIGNED',
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  internal_brief text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((started_at is null) or status in ('IN_PROGRESS', 'COMPLETED')),
  check ((completed_at is null) or status = 'COMPLETED')
);

create table public.job_assignments (
  job_id uuid not null references public.jobs(id) on delete cascade,
  staff_id uuid not null references public.staff_profiles(id) on delete restrict,
  assigned_by uuid references public.staff_profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (job_id, staff_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  channel text not null check (channel in ('WEBSITE', 'INSTAGRAM', 'WHATSAPP', 'FACEBOOK', 'PHONE', 'EMAIL')),
  external_thread_id text,
  subject text,
  last_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((external_thread_id is null) or char_length(external_thread_id) between 1 and 255)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction public.message_direction not null,
  body text not null check (char_length(body) between 1 and 10000),
  external_message_id text,
  sent_by_staff_id uuid references public.staff_profiles(id) on delete set null,
  sent_at timestamptz not null default now(),
  provider_payload jsonb not null default '{}'::jsonb,
  unique nulls not distinct (conversation_id, external_message_id),
  check ((direction = 'INBOUND') or sent_by_staff_id is not null)
);

create table public.automation_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (char_length(source) between 2 and 80),
  external_event_id text not null,
  event_type text not null check (char_length(event_type) between 2 and 160),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  unique (source, external_event_id)
);

create table public.automation_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (char_length(event_type) between 2 and 160),
  aggregate_type text not null check (char_length(aggregate_type) between 2 and 80),
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status public.outbox_status not null default 'PENDING',
  available_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 100),
  last_error text,
  locked_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  check ((delivered_at is null) or status = 'DELIVERED')
);

create table public.operation_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('LEAD', 'QUOTE', 'BOOKING', 'JOB', 'CUSTOMER')),
  entity_id uuid not null,
  body text not null check (char_length(body) between 1 and 5000),
  author_id uuid references public.staff_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.staff_profiles(id) on delete set null,
  entity_type text not null check (entity_type in ('LEAD', 'QUOTE', 'BOOKING', 'PAYMENT', 'JOB', 'CONVERSATION', 'CUSTOMER')),
  entity_id uuid not null,
  action text not null check (char_length(action) between 2 and 160),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 4000),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Foreign-key, operations-calendar and queue indexes.
create index quotes_lead_id_idx on public.quotes(lead_id);
create index quotes_customer_id_idx on public.quotes(customer_id);
create index quotes_service_id_idx on public.quotes(service_id);
create index quotes_created_by_idx on public.quotes(created_by) where created_by is not null;
create index quotes_open_idx on public.quotes(status, expires_at) where status in ('DRAFT', 'SENT', 'ACCEPTED');
create index quote_answers_quote_id_idx on public.quote_answers(quote_id);
create index quote_answers_question_id_idx on public.quote_answers(service_question_id) where service_question_id is not null;
create index availability_rules_staff_id_idx on public.availability_rules(staff_id) where is_active;
create index availability_blackouts_staff_dates_idx on public.availability_blackouts(staff_id, starts_at, ends_at);
create index availability_blackouts_created_by_idx on public.availability_blackouts(created_by) where created_by is not null;
create index bookings_lead_id_idx on public.bookings(lead_id);
create index bookings_customer_id_idx on public.bookings(customer_id);
create index bookings_service_id_idx on public.bookings(service_id);
create index bookings_created_by_idx on public.bookings(created_by) where created_by is not null;
create index bookings_schedule_idx on public.bookings(scheduled_start_at, scheduled_end_at) where status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS');
create index payments_booking_id_idx on public.payments(booking_id);
create index payments_unsettled_idx on public.payments(booking_id, status) where status in ('PENDING', 'AUTHORIZED');
create unique index payments_provider_reference_key on public.payments(provider, provider_reference) where provider_reference is not null;
create index job_assignments_staff_id_idx on public.job_assignments(staff_id, assigned_at desc);
create index job_assignments_assigned_by_idx on public.job_assignments(assigned_by) where assigned_by is not null;
create index conversations_customer_id_idx on public.conversations(customer_id);
create index conversations_lead_id_idx on public.conversations(lead_id) where lead_id is not null;
create index conversations_booking_id_idx on public.conversations(booking_id) where booking_id is not null;
create unique index conversations_external_thread_key on public.conversations(channel, external_thread_id) where external_thread_id is not null;
create index messages_conversation_sent_idx on public.messages(conversation_id, sent_at desc);
create index messages_sent_by_staff_id_idx on public.messages(sent_by_staff_id) where sent_by_staff_id is not null;
create index automation_events_pending_idx on public.automation_events(received_at) where processed_at is null and failed_at is null;
create index automation_outbox_dispatch_idx on public.automation_outbox(available_at, created_at) where status = 'PENDING';
create index operation_notes_entity_idx on public.operation_notes(entity_type, entity_id, created_at desc);
create index operation_notes_author_id_idx on public.operation_notes(author_id) where author_id is not null;
create index activity_logs_entity_idx on public.activity_logs(entity_type, entity_id, created_at desc);
create index activity_logs_actor_id_idx on public.activity_logs(actor_id) where actor_id is not null;
create index reviews_customer_id_idx on public.reviews(customer_id);

alter table public.quotes enable row level security;
alter table public.quote_answers enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_blackouts enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.jobs enable row level security;
alter table public.job_assignments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.automation_events enable row level security;
alter table public.automation_outbox enable row level security;
alter table public.operation_notes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.reviews enable row level security;

-- Operational records are staff-only; configuration and event queues are admin-only.
create policy "staff manage quotes" on public.quotes for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage quote answers" on public.quote_answers for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "admins manage availability rules" on public.availability_rules for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "staff manage availability blackouts" on public.availability_blackouts for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage bookings" on public.bookings for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage payments" on public.payments for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage jobs" on public.jobs for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage job assignments" on public.job_assignments for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage conversations" on public.conversations for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff manage messages" on public.messages for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "admins manage automation events" on public.automation_events for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage automation outbox" on public.automation_outbox for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "staff manage operation notes" on public.operation_notes for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff read activity logs" on public.activity_logs for select to authenticated using ((select public.is_staff()));
create policy "staff add activity logs" on public.activity_logs for insert to authenticated with check ((select public.is_staff()));
create policy "staff manage reviews" on public.reviews for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
