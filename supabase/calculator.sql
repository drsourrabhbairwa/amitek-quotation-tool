-- Amitek Waterproofing Budget Calculator (public page at /calculator/).
-- Run once in Supabase -> SQL Editor. Safe to run again.
--
-- calculator_config: one row (id = 1) holding every rate and text the
--   calculator shows. Anyone may READ it (the public page needs the rates);
--   only a signed-in Quotation Tool user may change it (from /calculator/admin.html).
-- calculator_leads: what visitors submit. Anyone may ADD a row (that is the
--   lead form); nobody but a signed-in Quotation Tool user can read, change
--   or delete them.

create table if not exists calculator_config (
  id          int primary key default 1 check (id = 1),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
alter table calculator_config enable row level security;
drop policy if exists "public read" on calculator_config;
create policy "public read" on calculator_config for select using (true);
drop policy if exists "team write" on calculator_config;
create policy "team write" on calculator_config for all
  using (auth.role() = 'authenticated' and quote_access_ok())
  with check (auth.role() = 'authenticated' and quote_access_ok());
insert into calculator_config (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

create table if not exists calculator_leads (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 80),
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email       text check (email is null or char_length(email) <= 120),
  pincode     text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  city        text check (city is null or char_length(city) <= 60),
  surface     text not null check (char_length(surface) <= 40),
  project     text not null check (project in ('fresh', 'repair')),
  problems    text check (problems is null or char_length(problems) <= 200),
  area_sqft   numeric not null check (area_sqft > 0 and area_sqft <= 1000000),
  start_when  text check (start_when is null or char_length(start_when) <= 40),
  estimate_min numeric,
  estimate_max numeric,
  whatsapp_ok boolean not null default true,
  source      text check (source is null or char_length(source) <= 200),
  status      text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  note        text
);
alter table calculator_leads enable row level security;
drop policy if exists "anyone can submit" on calculator_leads;
create policy "anyone can submit" on calculator_leads for insert to anon, authenticated
  with check (status = 'new' and note is null);
drop policy if exists "team reads and updates" on calculator_leads;
create policy "team reads and updates" on calculator_leads for select
  using (auth.role() = 'authenticated' and quote_access_ok());
drop policy if exists "team updates" on calculator_leads;
create policy "team updates" on calculator_leads for update
  using (auth.role() = 'authenticated' and quote_access_ok())
  with check (auth.role() = 'authenticated' and quote_access_ok());
grant select on calculator_config to anon;
grant insert on calculator_leads to anon;
