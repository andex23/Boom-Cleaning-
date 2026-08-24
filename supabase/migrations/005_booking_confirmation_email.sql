-- Service-role-only email delivery workflow for booking.requested events.
-- The outbox payload is deliberately identifier-based; recipient PII is read only
-- inside the worker claim function and is never exposed to browser roles.

create type public.email_delivery_status as enum ('PENDING', 'SENDING', 'SENT', 'FAILED');

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null unique references public.automation_outbox(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  recipient_email text not null,
  provider text,
  provider_message_id text,
  status public.email_delivery_status not null default 'PENDING',
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 100),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((sent_at is null) or status = 'SENT')
);

create index email_deliveries_booking_id_idx on public.email_deliveries(booking_id);
create index email_deliveries_retry_idx on public.email_deliveries(status, updated_at) where status in ('PENDING', 'FAILED');
create unique index email_deliveries_provider_message_key
  on public.email_deliveries(provider, provider_message_id)
  where provider is not null and provider_message_id is not null;

alter table public.email_deliveries enable row level security;
create policy "admins read email deliveries" on public.email_deliveries
  for select to authenticated using ((select public.is_admin()));
create trigger email_deliveries_set_updated_at before update on public.email_deliveries
  for each row execute function public.set_updated_at();

create or replace function public.claim_booking_confirmation_email(outbox_id_value uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  with claimed as (
    update public.automation_outbox
       set status = 'PROCESSING',
           attempts = attempts + 1,
           locked_at = now(),
           last_error = null
     where id = outbox_id_value
       and event_type = 'booking.requested'
       and status in ('PENDING', 'FAILED')
       and available_at <= now()
     returning id, aggregate_id, attempts
  ), delivery as (
    insert into public.email_deliveries (outbox_id, booking_id, recipient_email, status, attempts)
    select claimed.id, booking.id, customer.email, 'SENDING', claimed.attempts
      from claimed
      join public.bookings booking on booking.id = claimed.aggregate_id
      join public.customers customer on customer.id = booking.customer_id
     where customer.email is not null
    on conflict (outbox_id) do update
      set status = 'SENDING', attempts = excluded.attempts, last_error = null
    returning outbox_id
  )
  select case when delivery.outbox_id is null then
    jsonb_build_object('outboxId', claimed.id, 'failure', 'Booking confirmation has no recipient email')
  else jsonb_build_object(
    'outboxId', claimed.id,
    'bookingId', booking.id,
    'bookingNumber', booking.booking_number,
    'recipientName', customer.full_name,
    'recipientEmail', customer.email,
    'serviceName', service.name,
    'scheduledStartAt', booking.scheduled_start_at,
    'scheduledEndAt', booking.scheduled_end_at,
    'address', booking.address,
    'currency', booking.currency,
    'total', booking.total
  ) end into result
    from claimed
    left join delivery on delivery.outbox_id = claimed.id
    join public.bookings booking on booking.id = claimed.aggregate_id
    join public.customers customer on customer.id = booking.customer_id
    join public.services service on service.id = booking.service_id;

  if result is not null and result ? 'failure' then
    -- A claimed event without a usable recipient must not remain locked forever.
    update public.automation_outbox
       set status = 'FAILED', last_error = 'Booking confirmation has no recipient email', locked_at = null
     where id = outbox_id_value and status = 'PROCESSING';
  end if;
  return result;
end;
$$;

create or replace function public.complete_booking_confirmation_email(
  outbox_id_value uuid,
  was_sent boolean,
  provider_value text,
  provider_message_id_value text default null,
  error_value text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed boolean := false;
begin
  if provider_value is null or char_length(trim(provider_value)) < 2 or char_length(trim(provider_value)) > 80 then
    raise exception 'A valid email provider is required' using errcode = '22023';
  end if;

  if was_sent then
    update public.automation_outbox
       set status = 'DELIVERED', delivered_at = now(), locked_at = null, last_error = null
     where id = outbox_id_value and event_type = 'booking.requested' and status = 'PROCESSING'
     returning true into completed;
  else
    update public.automation_outbox
       set status = 'FAILED',
           locked_at = null,
           last_error = left(coalesce(nullif(trim(error_value), ''), 'Email provider rejected delivery'), 2000),
           available_at = now() + make_interval(secs => (60 * (1::bigint << least(attempts, 6)))::double precision)
     where id = outbox_id_value and event_type = 'booking.requested' and status = 'PROCESSING'
     returning true into completed;
  end if;

  if not coalesce(completed, false) then
    return false;
  end if;

  update public.email_deliveries
     set provider = trim(provider_value),
         provider_message_id = nullif(trim(provider_message_id_value), ''),
         status = case when was_sent then 'SENT'::public.email_delivery_status else 'FAILED'::public.email_delivery_status end,
         sent_at = case when was_sent then now() else null end,
         last_error = case when was_sent then null else left(coalesce(nullif(trim(error_value), ''), 'Email provider rejected delivery'), 2000) end
   where outbox_id = outbox_id_value;
  return true;
end;
$$;

revoke all on function public.claim_booking_confirmation_email(uuid) from public, anon, authenticated;
revoke all on function public.complete_booking_confirmation_email(uuid, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_booking_confirmation_email(uuid) to service_role;
grant execute on function public.complete_booking_confirmation_email(uuid, boolean, text, text, text) to service_role;
