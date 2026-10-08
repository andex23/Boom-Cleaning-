-- Run after 20260912150000. Read-only quote calls; no booking records created.
BEGIN;
DO $qa$
declare r record; q jsonb; n integer; p text;
begin
  foreach p in array array['apartment','duplex'] loop
    for n in 1..6 loop
      q := public.calculate_quote(jsonb_build_object('serviceSlug','move-in-apartment-cleaning','propertyTypeSlug',p,'areaSlug','wuse','spaces',jsonb_build_array(jsonb_build_object('slug','bedroom','count',n))));
      if (q->>'requiresReview')::boolean or (q->>'total')::numeric is distinct from 50000+n*50000 then raise exception 'Move-in failed: % % %',p,n,q; end if;
    end loop;
    for r in select * from (values ('sofa-seven-seat-set',60000),('sofa-three-seater',30000),('sofa-two-seater',25000),('sofa-one-seater',15000),('dining-chair',7000),('bed-frame-3x6',20000),('bed-frame-4x6',30000),('bed-frame-5x6',35000),('bed-frame-6x6-6x7',40000)) rates(slug,price) loop
      for n in 1..2 loop
        q := public.calculate_quote(jsonb_build_object('serviceSlug','upholstery-cleaning','propertyTypeSlug',p,'areaSlug','wuse','spaces',jsonb_build_array(jsonb_build_object('slug',r.slug,'count',n))));
        if (q->>'requiresReview')::boolean or (q->>'total')::numeric is distinct from r.price*n then raise exception 'Furniture failed: % % % %',p,r.slug,n,q; end if;
      end loop;
    end loop;
  end loop;
  q := public.calculate_quote('{"serviceSlug":"move-in-apartment-cleaning","propertyTypeSlug":"apartment","areaSlug":"wuse","spaces":[{"slug":"bedroom","count":7}]}');
  if not (q->>'requiresReview')::boolean or q->>'total' is not null then raise exception '7 bedrooms must require review: %',q; end if;
  q := public.calculate_quote('{"serviceSlug":"upholstery-cleaning","propertyTypeSlug":"apartment","areaSlug":"wuse","spaces":[{"slug":"sofa-three-seater","count":1},{"slug":"dining-chair","count":4},{"slug":"bed-frame-5x6","count":1}]}');
  if (q->>'requiresReview')::boolean or (q->>'total')::numeric is distinct from 93000 then raise exception 'Combined furniture failed: %',q; end if;
  raise notice '50 move-in and upholstery pricing checks passed';
end $qa$;
ROLLBACK;
