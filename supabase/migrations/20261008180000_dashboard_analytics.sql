-- Anonymous public-page analytics. Never store query strings, raw IPs or full user agents.
create table public.website_visits (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null check (session_hash ~ '^[0-9a-f]{64}$'),
  path text not null check (path in ('/','/quote','/terms')),
  referrer text not null default 'Direct' check (char_length(referrer)<=253),
  device text not null check (device in ('Mobile','Tablet','Desktop')),
  visited_at timestamptz not null default now(),
  bucket bigint not null,
  unique (session_hash,path,bucket)
);
create index website_visits_date_idx on public.website_visits(visited_at);
alter table public.website_visits enable row level security;
revoke all on public.website_visits from anon, authenticated;
grant all on public.website_visits to service_role;

create function public.dashboard_metrics(at_time timestamptz default now()) returns jsonb
language sql stable security invoker set search_path=public as $$
with bounds as (
 select date_trunc('week',at_time at time zone 'Africa/Lagos') as monday
), days as (
 select generate_series(monday,monday+interval '6 days',interval '1 day') as day from bounds
), daily as (
 select d.day, coalesce(sum(p.amount),0) as value from days d
 left join payments p on p.paid_at >= d.day at time zone 'Africa/Lagos'
 and p.paid_at < (d.day+interval '1 day') at time zone 'Africa/Lagos'
 and p.status='PAID' and p.provider='flutterwave' and p.currency='NGN'
 group by d.day
)
select jsonb_build_object(
 'weeklyRevenue',(select jsonb_agg(jsonb_build_object('day',to_char(day,'Dy'),'date',to_char(day,'YYYY-MM-DD'),'value',value) order by day) from daily),
 'weeklyRevenueTotal',(select sum(value) from daily),
 'pendingPayments',(select count(*) from bookings where status='PENDING'),
 'openEnquiries',(select count(*) from leads where status in ('NEW','QUALIFYING','QUALIFIED','QUOTE_SENT')),
 'siteVisits',(select count(*) from website_visits where visited_at >= (select monday at time zone 'Africa/Lagos' from bounds) and visited_at<=at_time)
);
$$;
revoke all on function public.dashboard_metrics(timestamptz) from public,anon,authenticated;
grant execute on function public.dashboard_metrics(timestamptz) to service_role;

create function public.website_analytics(days_value integer default 30,at_time timestamptz default now()) returns jsonb
language sql stable security invoker set search_path=public as $$
with dates as (
 select (at_time at time zone 'Africa/Lagos')::date as today, least(30,greatest(1,days_value)) as days
), visits as (
 select * from website_visits where visited_at >= (select (today-(days-1))::timestamp at time zone 'Africa/Lagos' from dates) and visited_at<=at_time
), daily as (
 select d::date as date, count(v.id) as views from dates,
 generate_series((today-(days-1))::timestamp,today::timestamp,interval '1 day') d
 left join visits v on (v.visited_at at time zone 'Africa/Lagos')::date=d::date
 group by d
)
select jsonb_build_object(
 'days',(select days from dates),
 'pageViews',(select count(*) from visits),
 'sessions',(select count(distinct session_hash) from visits),
 'firstVisit',(select min(visited_at) from website_visits),
 'daily',(select jsonb_agg(jsonb_build_object('date',date,'views',views) order by date) from daily),
 'pages',coalesce((select jsonb_agg(x order by x.views desc) from (select path as label,count(*) as views from visits group by path) x),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(x order by x.views desc) from (select referrer as label,count(*) as views from visits group by referrer order by count(*) desc limit 10) x),'[]'::jsonb),
 'devices',coalesce((select jsonb_agg(x order by x.views desc) from (select device as label,count(*) as views from visits group by device) x),'[]'::jsonb)
);
$$;
revoke all on function public.website_analytics(integer,timestamptz) from public,anon,authenticated;
grant execute on function public.website_analytics(integer,timestamptz) to service_role;
