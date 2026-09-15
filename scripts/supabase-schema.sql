-- The parish site's storage, for a host with no disk of its own.
--
-- Run this once in the Supabase SQL editor, then create a public bucket named
-- "uploads". Nothing here is reachable from a browser: every table has row
-- level security on with no policy, so only the service key — which lives in
-- the server's environment and never reaches a page — can read or write.

-- ---------------------------------------------------------------- documents
-- The seventeen content sections the parish edits, plus the small singleton
-- files kept as `state:users`, `state:analytics`, `state:limits`.
create table if not exists documents (
  key         text primary key,
  data        jsonb       not null,
  version     text        not null,
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------ records
-- The append-only lists: messages, donations, hall bookings and reviews, the
-- activity log, the outbox, office requests. One row per record, so writing one
-- is an insert and two arriving in the same moment cannot overwrite each other.
create table if not exists records (
  id    bigint generated always as identity primary key,
  list  text        not null,
  at    timestamptz not null default now(),
  data  jsonb       not null
);

create index if not exists records_list_at_idx on records (list, at desc);

-- ------------------------------------------------------------------ backups
-- The rolling copies the dashboard restores from. Twenty per section are kept;
-- the application prunes the rest.
create table if not exists backups (
  name  text primary key,
  key   text        not null,
  at    timestamptz not null default now(),
  data  jsonb       not null
);

create index if not exists backups_key_at_idx on backups (key, at desc);

-- ------------------------------------------------------------- replace_list
-- Rewriting a whole list — marking a message answered, a booking confirmed — is
-- a delete and an insert. Doing them as two requests would let somebody read
-- the list in between and find it empty, so both happen inside one transaction.
create or replace function replace_list(target_list text, rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from records where list = target_list;

  insert into records (list, at, data)
  select
    target_list,
    coalesce((row_value ->> 'at')::timestamptz, now()),
    row_value
  from jsonb_array_elements(rows) as row_value;
end;
$$;

-- ------------------------------------------------------------------ locking
-- Nothing but the service key gets in. RLS on with no policy denies every
-- anonymous and signed-in request, which is what we want: the parish site is
-- the only thing that should ever read the activity log or the donations.
alter table documents enable row level security;
alter table records   enable row level security;
alter table backups   enable row level security;
