-- Complete receipt totals by Lagos payment date, independent of the ledger row limit.
create function public.payment_revenue(start_date date,end_date date) returns jsonb
language plpgsql stable security invoker set search_path=public as $$
begin
 if end_date <= start_date or end_date-start_date > 31 then
  raise exception 'Invalid revenue period';
 end if;
 return (
  with days as (
   select generate_series(start_date::timestamp,(end_date-1)::timestamp,interval '1 day') as day
  ), daily as (
   select d.day,coalesce(sum(p.amount),0) as value,count(p.id) as count
   from days d left join public.payments p
    on p.paid_at >= d.day at time zone 'Africa/Lagos'
    and p.paid_at < (d.day+interval '1 day') at time zone 'Africa/Lagos'
    and p.status='PAID' and p.provider='flutterwave' and p.currency='NGN'
   group by d.day
  )
  select jsonb_build_object('total',sum(value),'count',sum(count),
   'daily',jsonb_agg(jsonb_build_object('date',to_char(day,'YYYY-MM-DD'),'value',value,'count',count) order by day)) from daily
 );
end;
$$;
revoke all on function public.payment_revenue(date,date) from public,anon,authenticated;
grant execute on function public.payment_revenue(date,date) to service_role;
