-- Run after the September 2026 pricing migrations. No bookings are created.
BEGIN;
DO $qa$
declare s text; b integer; n integer; q jsonb; expected integer; cases integer := 0; rate record;
begin
foreach s in array array['post-construction-cleaning','post-renovation-cleaning'] loop
  for rate in select * from (values ('bedroom',40000),('living-room',50000),('boys-quarters',30000),('penthouse-area',50000),('extra-room',20000),('kitchen',50000)) r(slug,price) loop
    q := public.calculate_quote(jsonb_build_object('serviceSlug',s,'propertyTypeSlug','apartment','areaSlug','wuse','spaces',jsonb_build_array(jsonb_build_object('slug',rate.slug,'count',1))));
    if (q->>'requiresReview')::boolean or (q->>'total')::numeric is distinct from rate.price then raise exception 'Room case failed: % % %',s,rate.slug,q; end if;
    cases := cases+1;
  end loop;
  for b in 1..5 loop
    q := public.calculate_quote(jsonb_build_object('serviceSlug',s,'propertyTypeSlug','apartment','areaSlug','wuse','spaces',jsonb_build_array(jsonb_build_object('slug','compound-pressure-wash','count',b))));
    expected := case b when 1 then 50000 when 2 then 70000 when 3 then 100000 when 4 then 150000 else null end;
    if (q->>'total')::numeric is distinct from expected or (q->>'requiresReview')::boolean is distinct from (b=5) then raise exception 'Compound case failed: % % %',s,b,q; end if;
    cases := cases+1;
  end loop;
  for n in 1..10 loop
    q := public.calculate_quote(jsonb_build_object('serviceSlug',s,'propertyTypeSlug','apartment','areaSlug','wuse','spaces',jsonb_build_array(jsonb_build_object('slug','bedroom','count',1),jsonb_build_object('slug','storey','count',n))));
    if (q->>'requiresReview')::boolean or (q->>'total')::numeric is distinct from 40000+(n-1)*50000 then raise exception 'Storey case failed: % % %',s,n,q; end if;
    cases := cases+1;
  end loop;
  q := public.calculate_quote(jsonb_build_object('serviceSlug',s,'propertyTypeSlug','apartment','areaSlug','wuse','spaces',jsonb_build_array(jsonb_build_object('slug','compound-wash','count',1))));
  if not (q->>'requiresReview')::boolean or q->>'total' is not null then raise exception 'Legacy wash should require review: %',q; end if;
  cases := cases+1;
end loop;
raise notice '% pricing checks passed', cases;
end $qa$;
ROLLBACK;
