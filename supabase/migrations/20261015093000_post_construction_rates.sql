-- Owner supplied unit prices. All other items and existing quote snapshots remain unchanged.
do $$ declare changed integer; begin
 update public.service_space_prices p set unit_price=v.price,updated_at=now()
 from public.services s,public.space_types st,(values ('bedroom',50000),('living-room',70000),('kitchen',80000)) as v(slug,price)
 where p.service_id=s.id and s.slug='post-construction-cleaning' and p.space_type_id=st.id and st.slug=v.slug;
 get diagnostics changed=row_count;
 if changed <> 3 then raise exception 'Expected all three post-construction rates'; end if;
end $$;
