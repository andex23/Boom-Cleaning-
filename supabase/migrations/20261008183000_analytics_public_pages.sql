alter table public.website_visits drop constraint website_visits_path_check;
alter table public.website_visits add constraint website_visits_path_check check (path in ('/','/quote','/terms','/about','/faq','/pricing','/services'));
