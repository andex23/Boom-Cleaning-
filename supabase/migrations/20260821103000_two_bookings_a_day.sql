-- Two bookings a day: 09:00 and 14:00, one job in each.
--
-- Capacity was derived from crew time-overlap: a slot opened only if some crew had no
-- booking overlapping [slot_start, slot_start + service duration). With one crew and an
-- eight-hour post-construction job that left exactly one bookable slot in the whole day,
-- so taking it sold out the day. A five-hour deep clean at 08:00 likewise swallowed the
-- 10:30 slot, and 15:30 was permanently "Closed" because the job would have ended after
-- 18:00. That is why picking a different time on the same day reported sold out.
--
-- Duration should describe the work, not ration the diary. BOOM takes two jobs a day, one
-- per slot, so capacity is now a count of the bookings that start in a slot and a long
-- job no longer removes capacity the team actually has.

-- 1. Replace the four overlapping start times with the two BOOM offers.
alter table public.booking_slots
  add column if not exists max_bookings smallint not null default 1;

alter table public.booking_slots drop constraint if exists booking_slots_max_bookings_positive;
alter table public.booking_slots
  add constraint booking_slots_max_bookings_positive check (max_bookings > 0);

update public.booking_slots set is_active = false, updated_at = now();

insert into public.booking_slots (start_time, label, is_active, sort_order, max_bookings)
values (time '09:00', 'Morning', true, 10, 1),
       (time '14:00', 'Afternoon / Evening', true, 20, 1)
on conflict (start_time) do update
   set label = excluded.label,
       is_active = true,
       sort_order = excluded.sort_order,
       max_bookings = excluded.max_bookings,
       updated_at = now();

-- 2. Which slot a booking sits in, stored rather than derived. `timestamptz at time zone
--    <literal>` is STABLE, not IMMUTABLE, so it cannot be indexed directly; writing the
--    Lagos-local date and time onto the row keeps the per-slot count exact and indexable.
alter table public.bookings
  add column if not exists slot_date date,
  add column if not exists slot_time time;

create or replace function public.bookings_set_slot()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.slot_date := (new.scheduled_start_at at time zone 'Africa/Lagos')::date;
  new.slot_time := (new.scheduled_start_at at time zone 'Africa/Lagos')::time;
  return new;
end;
$fn$;

drop trigger if exists bookings_set_slot on public.bookings;
create trigger bookings_set_slot
  before insert or update of scheduled_start_at on public.bookings
  for each row execute function public.bookings_set_slot();

update public.bookings
   set slot_date = (scheduled_start_at at time zone 'Africa/Lagos')::date,
       slot_time = (scheduled_start_at at time zone 'Africa/Lagos')::time
 where slot_date is null or slot_time is null;

create index if not exists bookings_slot_idx
  on public.bookings (slot_date, slot_time)
  where status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS');

-- Bookings taken under the old timetable sit at times that no longer exist. Left alone
-- they would stop counting toward capacity and leave a day looking free while a crew is
-- out on the job, so each moves to the nearest published slot that day, keeping the
-- length of the work. The trigger above rewrites slot_date/slot_time as they move.
with target as (
  select b.id,
         (b.slot_date + (
            select bs.start_time
              from public.booking_slots bs
             where bs.is_active
             order by abs(extract(epoch from (bs.start_time - b.slot_time)))
             limit 1
         )) at time zone 'Africa/Lagos' as new_start,
         b.scheduled_end_at - b.scheduled_start_at as span
    from public.bookings b
   where b.status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
     and not exists (
       select 1 from public.booking_slots bs
        where bs.is_active and bs.start_time = b.slot_time
     )
)
update public.bookings b
   set scheduled_start_at = t.new_start,
       scheduled_end_at = t.new_start + t.span,
       updated_at = now()
  from target t
 where b.id = t.id;

-- 3. Both of a day's jobs fall to the same crew, and a long morning job runs into the
--    afternoon slot, so a per-crew overlap constraint would reject the second booking of
--    the day — exactly the bug being fixed. Capacity moves into assign_free_crew instead,
--    under a transaction-scoped advisory lock so two requests for the same free slot
--    cannot both pass the count.
alter table public.bookings drop constraint if exists bookings_no_crew_schedule_overlap;
alter table public.bookings drop constraint if exists bookings_no_active_schedule_overlap;

-- 4. Same signature and same contract as before — a crew when the slot has room, null
--    when it does not — so create_booking_from_request and reschedule_booking keep
--    working unchanged and still raise "no longer available" for a taken slot.
--    end_value is deliberately unused now: the slot sets capacity, not the job's length.
create or replace function public.assign_free_crew(start_value timestamptz, end_value timestamptz)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  local_date date;
  local_time time;
  capacity smallint;
  taken integer;
begin
  local_date := (start_value at time zone 'Africa/Lagos')::date;
  local_time := (start_value at time zone 'Africa/Lagos')::time;

  -- An arrival time that is not one of the published slots is not bookable at all.
  select bs.max_bookings into capacity
    from public.booking_slots bs
   where bs.is_active and bs.start_time = local_time;
  if not found then
    return null;
  end if;

  -- Serialise everyone competing for this slot until the transaction ends.
  perform pg_advisory_xact_lock(hashtextextended(local_date::text || 'T' || local_time::text, 0));

  select count(*) into taken
    from public.bookings b
   where b.slot_date = local_date
     and b.slot_time = local_time
     and b.status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS');

  if taken >= capacity then
    return null;
  end if;

  return (select c.id from public.crews c where c.is_active order by c.sort_order, c.name limit 1);
end;
$fn$;

revoke all on function public.assign_free_crew(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.assign_free_crew(timestamptz, timestamptz) to service_role;

-- 5. Availability counts places in a slot instead of measuring crew overlap. A slot only
--    has to START inside working hours now; a job that runs past closing is BOOM's to
--    plan, and is no longer a reason to hide the slot.
create or replace function public.get_availability(request jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  from_date date;
  to_date date;
  service_row public.services%rowtype;
  day_value date;
  slot record;
  slot_start timestamptz;
  is_open boolean;
  reason text;
  taken integer;
  spots_left integer;
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

  day_value := from_date;
  while day_value <= to_date loop
    day_slots := '[]'::jsonb;
    open_count := 0;

    for slot in
      select start_time, label, max_bookings from public.booking_slots where is_active order by sort_order
    loop
      slot_start := (day_value + slot.start_time) at time zone 'Africa/Lagos';
      is_open := true;
      reason := null;
      spots_left := 0;

      if slot_start <= now() then
        is_open := false;
        reason := 'Past';
      elsif not exists (
        select 1 from public.availability_rules r
         where r.is_active
           and r.weekday = extract(dow from day_value)::smallint
           and slot.start_time >= r.starts_at
           and slot.start_time < r.ends_at
      ) then
        is_open := false;
        reason := 'Closed';
      elsif exists (
        select 1 from public.availability_blackouts b
         where slot_start >= b.starts_at and slot_start < b.ends_at
      ) then
        is_open := false;
        reason := 'Unavailable';
      else
        select count(*) into taken
          from public.bookings bk
         where bk.slot_date = day_value
           and bk.slot_time = slot.start_time
           and bk.status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS');
        spots_left := greatest(slot.max_bookings - coalesce(taken, 0), 0);
        if spots_left <= 0 then
          is_open := false;
          reason := 'Booked';
        end if;
      end if;

      if is_open then open_count := open_count + 1; end if;
      day_slots := day_slots || jsonb_build_object(
        'time', to_char(slot.start_time, 'HH24:MI'),
        'label', slot.label,
        'available', is_open,
        'reason', reason,
        'spotsLeft', spots_left
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
    'durationMinutes', service_row.duration_minutes,
    'days', days
  );
end;
$fn$;

revoke all on function public.get_availability(jsonb) from public, anon, authenticated;
grant execute on function public.get_availability(jsonb) to service_role;
