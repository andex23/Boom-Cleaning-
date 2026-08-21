-- Persistent state for the conversational Instagram DM agent. Raw provider
-- payloads remain in automation_events; this table stores only the working
-- conversation context and structured qualification progress.

create table public.instagram_dm_sessions (
  id uuid primary key default gen_random_uuid(),
  external_thread_id text not null unique check (char_length(external_thread_id) between 1 and 255),
  external_user_id text not null check (char_length(external_user_id) between 1 and 255),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'HANDOFF', 'CLOSED')),
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array'),
  qualification jsonb not null default '{}'::jsonb check (jsonb_typeof(qualification) = 'object'),
  lead_id uuid references public.leads(id) on delete set null,
  handoff_reason text,
  last_openai_response_id text,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_events add column processing_started_at timestamptz;
create index automation_events_instagram_dm_pending_idx
  on public.automation_events(received_at)
  where source = 'instagram' and event_type = 'instagram.messaging'
    and processed_at is null and failed_at is null and processing_started_at is null;

alter table public.instagram_dm_sessions enable row level security;
create policy "admins manage instagram dm sessions" on public.instagram_dm_sessions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update, delete on table public.instagram_dm_sessions to authenticated;
grant all on table public.instagram_dm_sessions to service_role;

create trigger instagram_dm_sessions_set_updated_at before update on public.instagram_dm_sessions
for each row execute function public.set_updated_at();

create index instagram_dm_sessions_status_idx on public.instagram_dm_sessions(status, last_inbound_at desc);
create index instagram_dm_sessions_lead_id_idx on public.instagram_dm_sessions(lead_id) where lead_id is not null;
