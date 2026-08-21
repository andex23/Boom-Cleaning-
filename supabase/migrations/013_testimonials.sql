-- Curated testimonials.
--
-- Distinct from public.reviews on purpose. A review is tied to a booking a customer
-- actually made and is rated one to five; a testimonial is something a customer said in
-- WhatsApp or on Instagram that staff chose to put on the website. Forcing these into
-- reviews would mean inventing the bookings and customers they were never attached to.
--
-- Nothing appears on the site until published_at is set.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(quote) between 10 and 1200),
  /** How the customer is credited. Never a full name unless they have agreed to it. */
  author_label text not null check (char_length(author_label) between 2 and 120),
  source text not null default 'OTHER' check (source in ('WHATSAPP', 'INSTAGRAM', 'GOOGLE', 'EMAIL', 'OTHER')),
  published_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_published_idx
  on public.testimonials (sort_order) where published_at is not null;

alter table public.testimonials enable row level security;
drop policy if exists "staff read testimonials" on public.testimonials;
create policy "staff read testimonials" on public.testimonials for select to authenticated using (public.is_staff());
drop policy if exists "admins manage testimonials" on public.testimonials;
create policy "admins manage testimonials" on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Real messages from real customers, quoted verbatim and stored as text only. The
-- screenshots they came from are not used: one of them contained BOOM's bank account
-- number and a customer's full legal name.
--
-- Instagram comments are credited by handle because they are already public. WhatsApp
-- messages are private conversations, so they are shown as an anonymous user until each customer
-- confirms they are happy to be named.
insert into public.testimonials (quote, author_label, source, sort_order, published_at) values
  ('I don''t have any complaints, your team was amazing in their cognitive abilities, and everyone seemed happy doing their job. Everything turned out as well as I could have hoped, and I''m looking forward to working with you all again.',
   'Anonymous user', 'WHATSAPP', 10, now()),
  ('Your cleaning detailing is something else. Just got home and I must say you''re doing an amazing job.',
   'Anonymous user', 'WHATSAPP', 20, now()),
  ('Thank you for a great job. Your team are dedicated and hardworking. Please help me appreciate them again.',
   'Hauwa', 'INSTAGRAM', 30, now()),
  ('Thanks so much, you guys exceeded my expectations, job perfectly done.',
   '@luvyspastries', 'INSTAGRAM', 40, now()),
  ('More than sparkles. Thanks again for a job well done — satisfied customer.',
   '@bolusubsore3', 'INSTAGRAM', 50, now()),
  ('You sure know the meaning of sparkles.',
   '@unicontrols', 'INSTAGRAM', 60, now()),
  ('Your workers did an amazing job.',
   'Anonymous user', 'WHATSAPP', 70, now())
on conflict do nothing;
