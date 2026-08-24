-- Real availability.
--
-- The booking calendar previously invented its own data: days were labelled "Demo" or
-- "Limited" by `date % 5`, and slots were marked unavailable by `date % 3 = index`. None of
-- it reflected the business, and a customer could pick a slot that was already booked and
-- only discover it when the booking failed.
--
-- Availability now comes from working hours (availability_rules), time off
-- (availability_blackouts) and the bookings that already exist, checked against the
-- selected service's own duration.

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  start_time time not null unique,
  label text not null check (char_length(label) between 2 and 60),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_slots enable row level security;
drop policy if exists "staff read booking slots" on public.booking_slots;
create policy "staff read booking slots" on public.booking_slots for select to authenticated using (public.is_staff());
drop policy if exists "admins manage booking slots" on public.booking_slots;
create policy "admins manage booking slots" on public.booking_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.booking_slots (start_time, label, sort_order) values
  ('08:00', 'Morning',   10),
  ('10:30', 'Morning',   20),
  ('13:00', 'Afternoon', 30),
  ('15:30', 'Afternoon', 40)
on conflict (start_time) do update set label = excluded.label, sort_order = excluded.sort_order, updated_at = now();

-- Default working hours for the operation as a whole: Monday to Saturday, 08:00-18:00.
-- staff_id null means the rule applies to the business rather than one cleaner.
insert into public.availability_rules (staff_id, weekday, starts_at, ends_at, timezone)
select null, weekday, '08:00'::time, '18:00'::time, 'Africa/Lagos'
  from generate_series(1, 6) as weekday
on conflict (staff_id, weekday, starts_at, ends_at) do nothing;

-- Returns one entry per day in the range, each listing every slot and whether it can be
-- booked for the given service. Reasons are returned so the interface can explain a
-- closure rather than showing an unexplained disabled button.
create or replace function public.get_availability(request jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  from_date date;
  to_date date;
  service_row public.services%rowtype;
  duration_minutes integer;
  day_value date;
  slot record;
  slot_start timestamptz;
  slot_end timestamptz;
  is_open boolean;
  reason text;
  day_slots jsonb;
  open_count integer;
  days jsonb := '[]'::jsonb;
begin
  if request is null or jsonb_typeof(request) <> 'object' then
    raise exception 'Request must be an object' using errcode = '22023';
  end if;

  begin
    from_date := (request ->> 'from')::date;
    to_date := (request ->> 'to')::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'from and to must be ISO dates' using errcode = '22023';
  end;
  if from_date is null or to_date is null or to_date < from_date then
    raise exception 'A valid from and to date range is required' using errcode = '22023';
  end if;
  if to_date - from_date > 120 then
    raise exception 'Date range must be 120 days or fewer' using errcode = '22023';
  end if;

  select * into service_row
    from public.services
   where slug = nullif(trim(request ->> 'serviceSlug'), '') and is_active;
  if not found then
    raise exception 'The requested service is unavailable' using errcode = '23503';
  end if;
  duration_minutes := service_row.duration_minutes;

  day_value := from_date;
  while day_value <= to_date loop
    day_slots := '[]'::jsonb;
    open_count := 0;

    for slot in
      select start_time, label from public.booking_slots where is_active order by sort_order
    loop
      slot_start := (day_value + slot.start_time) at time zone 'Africa/Lagos';
      slot_end := slot_start + make_interval(mins => duration_minutes);
      is_open := true;
      reason := null;

      if slot_start <= now() then
        is_open := false;
        reason := 'Past';
      elsif not exists (
        select 1 from public.availability_rules r
         where r.is_active
           and r.weekday = extract(dow from day_value)::smallint
           and slot_start >= (day_value + r.starts_at) at time zone 'Africa/Lagos'
           and slot_end <= (day_value + r.ends_at) at time zone 'Africa/Lagos'
      ) then
        is_open := false;
        reason := 'Closed';
      elsif exists (
        select 1 from public.availability_blackouts b
         where tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(slot_start, slot_end, '[)')
      ) then
        is_open := false;
        reason := 'Unavailable';
      elsif exists (
        select 1 from public.bookings bk
         where bk.status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
           and tstzrange(bk.scheduled_start_at, bk.scheduled_end_at, '[)') && tstzrange(slot_start, slot_end, '[)')
      ) then
        is_open := false;
        reason := 'Booked';
      end if;

      if is_open then open_count := open_count + 1; end if;
      day_slots := day_slots || jsonb_build_object(
        'time', to_char(slot.start_time, 'HH24:MI'),
        'label', slot.label,
        'available', is_open,
        'reason', reason
      );
    end loop;

    days := days || jsonb_build_object(
      'date', to_char(day_value, 'YYYY-MM-DD'),
      'openCount', open_count,
      'slots', day_slots
    );
    day_value := day_value + 1;
  end loop;

  return jsonb_build_object(
    'serviceSlug', service_row.slug,
    'durationMinutes', duration_minutes,
    'days', days
  );
end;
$$;

revoke all on function public.get_availability(jsonb) from public, anon, authenticated;
grant execute on function public.get_availability(jsonb) to service_role;
