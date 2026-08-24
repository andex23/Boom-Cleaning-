-- Database-enforced lifecycle invariants that cannot be expressed as CHECKs.

-- Harden the RLS helper functions from the bootstrap migration: an empty search
-- path prevents a caller-controlled schema object from being resolved inside a
-- SECURITY DEFINER function.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_profiles where id = (select auth.uid())
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  )
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.ensure_quote_answer_matches_service()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_service_id uuid;
  question_service_id uuid;
begin
  -- A null question is an allowed historical/manual answer snapshot.
  if new.service_question_id is null then
    return new;
  end if;

  select service_id into quote_service_id from public.quotes where id = new.quote_id;
  select service_id into question_service_id from public.service_questions where id = new.service_question_id;

  if quote_service_id is null or question_service_id is null or quote_service_id <> question_service_id then
    raise exception 'Quote answer question must belong to the quote service' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.ensure_booking_matches_quote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_customer_id uuid;
  quote_lead_id uuid;
  quote_service_id uuid;
begin
  if new.quote_id is null then
    return new;
  end if;

  select customer_id, lead_id, service_id
    into quote_customer_id, quote_lead_id, quote_service_id
    from public.quotes
   where id = new.quote_id;

  if quote_customer_id is null
    or quote_customer_id <> new.customer_id
    or quote_lead_id <> new.lead_id
    or quote_service_id <> new.service_id then
    raise exception 'Booking customer, lead, and service must match its quote' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger quote_answers_service_match
before insert or update of quote_id, service_question_id on public.quote_answers
for each row execute function public.ensure_quote_answer_matches_service();

create trigger bookings_quote_match
before insert or update of quote_id, lead_id, customer_id, service_id on public.bookings
for each row execute function public.ensure_booking_matches_quote();

create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads
for each row execute function public.set_updated_at();
create trigger quotes_set_updated_at before update on public.quotes
for each row execute function public.set_updated_at();
create trigger availability_rules_set_updated_at before update on public.availability_rules
for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations
for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

revoke all on function public.set_updated_at() from public;
revoke all on function public.ensure_quote_answer_matches_service() from public;
revoke all on function public.ensure_booking_matches_quote() from public;
