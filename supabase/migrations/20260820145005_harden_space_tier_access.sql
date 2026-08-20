create index if not exists service_space_tiers_space_type_id_idx
  on public.service_space_tiers (space_type_id);

-- The original ALL policy also participated in SELECT alongside the staff policy. Keep
-- one read path and give admins the three write operations explicitly.
drop policy if exists "admins manage space tiers" on public.service_space_tiers;

drop policy if exists "admins insert space tiers" on public.service_space_tiers;
create policy "admins insert space tiers" on public.service_space_tiers
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admins update space tiers" on public.service_space_tiers;
create policy "admins update space tiers" on public.service_space_tiers
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "admins delete space tiers" on public.service_space_tiers;
create policy "admins delete space tiers" on public.service_space_tiers
  for delete to authenticated using ((select public.is_admin()));
