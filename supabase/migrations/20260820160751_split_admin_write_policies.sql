-- Admins are also staff, so the staff SELECT policy already gives them read access.
-- Splitting the old FOR ALL policies into write-only policies avoids evaluating two
-- permissive SELECT policies for every authenticated read while preserving admin writes.
do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('booking_slots', 'admins manage booking slots'),
      ('crews', 'admins manage crews'),
      ('property_types', 'admins manage property types'),
      ('service_areas', 'admins manage service areas'),
      ('service_bedroom_tiers', 'admins manage bedroom tiers'),
      ('service_questions', 'admins manage service questions'),
      ('service_space_prices', 'admins manage service space prices'),
      ('services', 'admins manage services'),
      ('space_types', 'admins manage space types'),
      ('testimonials', 'admins manage testimonials')
    ) as policies(table_name, policy_name)
  loop
    execute format('drop policy if exists %I on public.%I', item.policy_name, item.table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',
      item.policy_name || ' insert', item.table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      item.policy_name || ' update', item.table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',
      item.policy_name || ' delete', item.table_name
    );
  end loop;
end
$$;
