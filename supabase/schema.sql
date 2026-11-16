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
--
-- counters.next_number always means "the next number still to be
-- handed out" — both for a row this function creates itself AND for a
-- row seeded by a data migration (see scripts/backup-to-sql.mjs, which
-- writes the already-correct "next to issue" value straight from the
-- exported app state). So a call against an existing row must return
-- the value that was already promised, then advance the stored value
-- past it for next time — not advance first and return the advanced
-- value, which would skip the promised number entirely. Concretely: a
-- fresh key inserts 2 and returns 2-1=1; an existing row holding N
-- (e.g. 6, meaning "6 is next") updates to N+1 and returns
-- (N+1)-1 = N, i.e. exactly 6, then leaves 7 stored as the next
-- promise. See supabase/schema.test.js for both cases run against a
-- real Postgres engine.
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
  values (p_division_key, p_doc_type, p_year, 2)
  on conflict (division_key, doc_type, year)
  do update set next_number = counters.next_number + 1
  returning next_number - 1 into v_number;
  return v_number;
end;
$$;

-- Per-record save functions for division_data (fixes the "whole-blob
-- overwrite" race: two people saving around the same time used to
-- silently erase each other's concurrent changes, because the old
-- saveDivisionData() sent the browser's entire in-memory
-- systems+quotations+settings back as one UPDATE, built from whatever
-- that browser last loaded — which could be stale by the time it saves).
--
-- Each function below does its one column's change as a single atomic
-- UPDATE statement computed entirely server-side from the row's
-- CURRENT value, never from a value the client read earlier. Postgres
-- takes a row lock for the duration of an UPDATE, so if two calls hit
-- the same division_key at nearly the same instant, the second one
-- waits for the first to commit and then computes its own change
-- against the already-updated row — neither call can read-modify-write
-- off a stale snapshot, which is exactly what made the blob overwrite
-- unsafe. Splitting by column (quotations vs systems vs settings) also
-- means a systems edit can never step on a concurrent quotation save.

-- Revision history: every time an EXISTING quotation is saved with a real
-- content change, the version it replaces is archived here first and the
-- quotation's own "revision" goes up by one (Rev 1, Rev 2, ...; printed
-- next to the Ref No). A save that changes nothing but bookkeeping
-- fields (updatedAt etc.) is not a new revision. Who saved each version
-- comes from the signed-in user's own token (auth.jwt()), never from
-- anything the browser claims.
create table if not exists quotation_revisions (
  id            bigint generated always as identity primary key,
  division_key  text not null check (division_key in ('sf', 'wp')),
  quotation_id  text not null,
  revision      int  not null,
  snapshot      jsonb not null,
  saved_by      text,
  saved_at      timestamptz not null default now()
);
create index if not exists quotation_revisions_lookup on quotation_revisions (division_key, quotation_id, revision);
alter table quotation_revisions enable row level security;
drop policy if exists "authenticated read/write" on quotation_revisions;
create policy "authenticated read/write" on quotation_revisions
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Inserts p_quotation if no existing entry shares its id, otherwise
-- replaces that entry in place (archiving the old one as a revision if
-- its content changed). Returns the quotation exactly as stored, with
-- revision / createdBy / updatedBy / savedAt filled in by the server.
-- Order among other quotations is not preserved (the client sorts for
-- display); this keeps the SQL simple.
drop function if exists upsert_quotation(text, jsonb);
create or replace function upsert_quotation(p_division_key text, p_quotation jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old  jsonb;
  v_new  jsonb;
  v_rev  int;
  v_user text := coalesce(auth.jwt() ->> 'email', auth.jwt() ->> 'sub', 'unknown');
  v_meta text[] := array['revision', 'updatedAt', 'updatedBy', 'createdBy', 'savedAt',
                          'status', 'followUpDate', 'statusNote', 'statusLog'];
  -- Sales-tracking fields (status, follow-up) belong to the server copy:
  -- they are changed only through set_quotation_tracking, never by an
  -- editor save that may have been opened before someone changed them.
  v_track text[] := array['status', 'followUpDate', 'statusNote', 'statusLog'];
  v_kept  jsonb;
begin
  -- Row lock first, so two people saving the same division at once are
  -- serialized and each one compares against the other's committed save.
  perform 1 from division_data where division_key = p_division_key for update;

  select elem into v_old
  from division_data d, jsonb_array_elements(d.quotations) elem
  where d.division_key = p_division_key and elem ->> 'id' = p_quotation ->> 'id'
  limit 1;

  if v_old is null then
    v_new := p_quotation || jsonb_build_object(
      'revision', 0, 'createdBy', v_user, 'updatedBy', v_user, 'savedAt', now(),
      'status', coalesce(p_quotation ->> 'status', 'sent'));
  elsif (v_old - v_meta) is not distinct from (p_quotation - v_meta) then
    return v_old; -- nothing actually changed
  else
    v_rev := coalesce((v_old ->> 'revision')::int, 0);
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_kept
    from jsonb_each(v_old) where key = any(v_track);
    insert into quotation_revisions (division_key, quotation_id, revision, snapshot, saved_by, saved_at)
    values (p_division_key, p_quotation ->> 'id', v_rev, v_old,
            v_old ->> 'updatedBy', coalesce((v_old ->> 'savedAt')::timestamptz, now()));
    v_new := (p_quotation - v_track) || v_kept || jsonb_build_object(
      'revision', v_rev + 1,
      'createdBy', coalesce(v_old -> 'createdBy', to_jsonb(v_old ->> 'updatedBy'), 'null'::jsonb),
      'updatedBy', v_user,
      'savedAt', now());
  end if;

  update division_data
  set quotations = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from jsonb_array_elements(quotations) elem
        where elem ->> 'id' <> (p_quotation ->> 'id')
      ) || jsonb_build_array(v_new),
      updated_at = now()
  where division_key = p_division_key;

  return v_new;
end;
$$;

-- Changes only the sales-tracking fields of one quotation (status,
-- follow-up date, note) without touching its content or Rev number.
-- Every status change is appended to statusLog with who and when.
create or replace function set_quotation_tracking(p_division_key text, p_quotation_id text, p_patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old   jsonb;
  v_new   jsonb;
  v_patch jsonb;
  v_user  text := coalesce(auth.jwt() ->> 'email', auth.jwt() ->> 'sub', 'unknown');
begin
  perform 1 from division_data where division_key = p_division_key for update;

  select elem into v_old
  from division_data d, jsonb_array_elements(d.quotations) elem
  where d.division_key = p_division_key and elem ->> 'id' = p_quotation_id
  limit 1;
  if v_old is null then
    return null;
  end if;

  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch
  from jsonb_each(p_patch) where key in ('status', 'followUpDate', 'statusNote');
  if v_patch ? 'status' and (v_patch ->> 'status') not in ('draft', 'sent', 'followup', 'won', 'lost') then
    raise exception 'Unknown status %', v_patch ->> 'status';
  end if;

  v_new := v_old || v_patch;
  if (v_new ->> 'status') is distinct from coalesce(v_old ->> 'status', 'sent') then
    v_new := v_new || jsonb_build_object('statusLog',
      coalesce(v_old -> 'statusLog', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'status', v_new ->> 'status', 'by', v_user, 'at', now(), 'note', v_new ->> 'statusNote')));
  end if;

  update division_data
  set quotations = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from jsonb_array_elements(quotations) elem
        where elem ->> 'id' <> p_quotation_id
      ) || jsonb_build_array(v_new),
      updated_at = now()
  where division_key = p_division_key;

  return v_new;
end;
$$;

-- Removes the quotation with the given id, if present.
create or replace function delete_quotation(p_division_key text, p_quotation_id text)
returns void
language sql
security invoker
set search_path = public
as $$
  update division_data
  set quotations = (
        select coalesce(jsonb_agg(elem), '[]'::jsonb)
        from jsonb_array_elements(quotations) elem
        where elem->>'id' <> p_quotation_id
      ),
      updated_at = now()
  where division_key = p_division_key;
  delete from quotation_revisions
  where division_key = p_division_key and quotation_id = p_quotation_id;
$$;

-- Replaces the whole Systems list. Editing the Systems tree is a single
-- admin-style action with no natural "one record" to target, so this
-- stays a column-scoped replace — still an improvement over the old
-- whole-row overwrite, because it can never touch quotations or
-- settings written by someone else in the meantime.
create or replace function replace_systems(p_division_key text, p_systems jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  update division_data
  set systems = p_systems, updated_at = now()
  where division_key = p_division_key;
$$;

-- Replaces the whole Settings object, for the same reason as above.
create or replace function replace_settings(p_division_key text, p_settings jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  update division_data
  set settings = p_settings, updated_at = now()
  where division_key = p_division_key;
$$;

-- Seed the two divisions' rows so the app's first load finds them
-- rather than erroring on a missing row.
insert into division_data (division_key, systems, quotations, settings)
values
  ('sf', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
  ('wp', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb)
on conflict (division_key) do nothing;
