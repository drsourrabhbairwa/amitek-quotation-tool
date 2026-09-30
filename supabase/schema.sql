-- supabase/schema.sql
-- One row per division holding its whole Systems/Quotations/Settings
-- blob (mirrors the shape the app already reads/writes as a unit —
-- see src/lib/storage.js) plus a small relational table just for
-- numbering counters, which is the one place concurrent saves from
-- two people need real atomicity instead of a JSON blob overwrite.

create table if not exists division_data (
  division_key text primary key check (division_key in ('sf', 'wp')),
  systems      jsonb not null default '[]'::jsonb,
  quotations   jsonb not null default '[]'::jsonb,
  settings     jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

create table if not exists counters (
  division_key text not null check (division_key in ('sf', 'wp')),
  doc_type     text not null check (doc_type in ('quotation', 'proforma')),
  year         int  not null,
  next_number  int  not null default 1,
  primary key (division_key, doc_type, year)
);

alter table division_data enable row level security;
alter table counters      enable row level security;

-- No role split (spec §2/§5): any signed-in user of this project may
-- read and write everything. There is no other tenant in this project
-- and nothing public-facing, so a single "authenticated" policy is the
-- whole access model — not unused complexity, just matched to what
-- was actually asked for.
create policy "authenticated read/write" on division_data
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "authenticated read/write" on counters
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Atomically hands out the next integer for (division, doc_type, year)
-- and remembers it. INSERT ... ON CONFLICT ... DO UPDATE is one atomic
-- statement in Postgres, so two callers racing each other can never
-- receive the same number. A combination with no row yet (first PI
-- ever, or a new year) inserts starting at 1 and returns 1 — no
-- separate "does this exist yet" check needed.
create or replace function increment_counter(p_division_key text, p_doc_type text, p_year int)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_number int;
begin
  insert into counters (division_key, doc_type, year, next_number)
  values (p_division_key, p_doc_type, p_year, 1)
  on conflict (division_key, doc_type, year)
  do update set next_number = counters.next_number + 1
  returning next_number into v_number;
  return v_number;
end;
$$;

-- Seed the two divisions' rows so the app's first load finds them
-- rather than erroring on a missing row.
insert into division_data (division_key, systems, quotations, settings)
values
  ('sf', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
  ('wp', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
on conflict (division_key) do nothing;
