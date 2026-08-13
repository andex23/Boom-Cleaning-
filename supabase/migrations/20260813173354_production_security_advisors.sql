-- Resolve launch-blocking Supabase security advisor findings and cover the
-- remaining foreign keys used by customer and operations queries.

revoke all on function public.ensure_quote_answer_matches_service() from public, anon, authenticated;
revoke all on function public.ensure_booking_matches_quote() from public, anon, authenticated;

-- These helpers are referenced by RLS policies. Authenticated users may call
-- them, but anonymous callers have no reason to probe staff membership.
revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

create policy "admins manage staff profiles"
on public.staff_profiles for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins manage pricing rules"
on public.pricing_rules for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create index if not exists audit_logs_actor_id_idx
  on public.audit_logs(actor_id) where actor_id is not null;
create index if not exists customer_identities_customer_id_idx
  on public.customer_identities(customer_id);
create index if not exists leads_customer_id_idx
  on public.leads(customer_id) where customer_id is not null;
create index if not exists leads_service_id_idx
  on public.leads(service_id) where service_id is not null;
create index if not exists pricing_rules_service_id_idx
  on public.pricing_rules(service_id);
