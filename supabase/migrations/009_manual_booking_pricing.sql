-- Staff-set prices for individual bookings.
--
-- A scope the calculator will not price (a pool area, a fumigation job, an unusual
-- property) reserves the slot with no agreed amount and waits for a person. Until now
-- there was no way to give it one. This adds the missing step.
--
-- The adjustment is recorded as a MANUAL_ADJUSTMENT line item holding the difference, so
-- the breakdown still adds up to the total and the original computed lines stay readable
-- as history rather than being overwritten.

create or replace function public.set_booking_price(request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_number_value bigint;
  amount_value numeric(12,2);
  note_value text;
  booking_row public.bookings%rowtype;
  quote_id_value uuid;
  was_review boolean;
  delta_value numeric(12,2);
  next_sort integer;
begin
  if request is null or jsonb_typeof(request) <> 'object' then
    raise exception 'Request must be an object' using errcode = '22023';
  end if;

  begin
    booking_number_value := (request ->> 'bookingNumber')::bigint;
    amount_value := (request ->> 'amount')::numeric(12,2);
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'bookingNumber must be an integer and amount a number' using errcode = '22023';
  end;
  note_value := nullif(trim(request ->> 'note'), '');

  if booking_number_value is null or amount_value is null then
    raise exception 'bookingNumber and amount are required' using errcode = '22023';
  end if;
  if amount_value < 0 or amount_value > 100000000 then
    raise exception 'amount must be between 0 and 100,000,000' using errcode = '22023';
  end if;
  if note_value is not null and char_length(note_value) > 240 then
    raise exception 'note must be 240 characters or fewer' using errcode = '22023';
  end if;

  -- Lock the booking so two staff members cannot price it concurrently.
  select * into booking_row
    from public.bookings
   where booking_number = booking_number_value
     for update;
  if not found then
    raise exception 'Booking not found' using errcode = '23503';
  end if;
  if booking_row.status in ('CANCELLED', 'COMPLETED') then
    raise exception 'A % booking cannot be repriced', lower(booking_row.status) using errcode = '22023';
  end if;

  quote_id_value := booking_row.quote_id;
  if quote_id_value is null then
    raise exception 'This booking has no quote to price' using errcode = '23503';
  end if;

  select requires_review into was_review from public.quotes where id = quote_id_value;
  delta_value := amount_value - booking_row.total;

  select coalesce(max(sort_order) + 1, 0) into next_sort
    from public.quote_items where quote_id = quote_id_value;

  insert into public.quote_items (quote_id, kind, label, space_type_id, quantity, unit_amount, amount, sort_order)
  values (
    quote_id_value, 'MANUAL_ADJUSTMENT',
    coalesce(note_value, case when was_review then 'Price set by BOOM team' else 'Manual adjustment' end),
    null, 1, delta_value, delta_value, next_sort
  );

  update public.quotes
     set subtotal = amount_value,
         discount = 0,
         requires_review = false
   where id = quote_id_value;

  update public.bookings
     set total = amount_value
   where id = booking_row.id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    null, 'booking.price_set', 'booking', booking_row.id,
    jsonb_build_object(
      'bookingNumber', booking_number_value,
      'previousTotal', booking_row.total,
      'newTotal', amount_value,
      'delta', delta_value,
      'clearedReview', coalesce(was_review, false),
      'note', note_value
    )
  );

  return jsonb_build_object(
    'bookingNumber', booking_number_value,
    'previousTotal', booking_row.total,
    'total', amount_value,
    'delta', delta_value,
    'clearedReview', coalesce(was_review, false)
  );
end;
$$;

revoke all on function public.set_booking_price(jsonb) from public, anon, authenticated;
grant execute on function public.set_booking_price(jsonb) to service_role;
