-- Einmal im Supabase SQL-Editor ausführen.
create table if not exists availability (
  player     text not null check (player in ('max','julian','yannick','eric')),
  day        date not null,
  status     text not null check (status in ('yes','maybe','no')),
  from_time  time,
  note       text,
  updated_at timestamptz not null default now(),
  primary key (player, day)
);

-- Neuere Supabase-Projekte vergeben keine Tabellenrechte mehr automatisch
grant select, insert, update, delete on availability to authenticated;

alter table availability enable row level security;

drop policy if exists "auth rw" on availability;
create policy "auth rw" on availability
  for all to authenticated using (true) with check (true);

-- Realtime aktivieren, damit Änderungen live bei allen ankommen
alter publication supabase_realtime add table availability;

-- ---------------------------------------------------------------
-- „Bekannt für“-Fakten über die Spieler, von allen eintragbar
-- ---------------------------------------------------------------
create table if not exists facts (
  id         uuid primary key default gen_random_uuid(),
  player     text not null check (player in ('max','julian','yannick','eric')),
  text       text not null check (char_length(text) between 1 and 160),
  author     text not null check (author in ('max','julian','yannick','eric')),
  created_at timestamptz not null default now()
);

grant select, insert, delete on facts to authenticated;

alter table facts enable row level security;

drop policy if exists "auth rw" on facts;
create policy "auth rw" on facts
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table facts;

-- ---------------------------------------------------------------
-- Kopfbilder: privater Storage-Bucket, nur nach Login lesbar.
-- Danach im Dashboard unter Storage → heads die Dateien
-- max.jpg, julian.jpg, yannick.jpg, eric.jpg hochladen.
-- Persönliche Startdaten (Fakten) stehen in seed.local.sql (nicht im Repo).
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('heads', 'heads', false)
on conflict (id) do nothing;

drop policy if exists "heads lesen" on storage.objects;
create policy "heads lesen" on storage.objects
  for select to authenticated using (bucket_id = 'heads');

-- ---------------------------------------------------------------
-- Logbuch / Shoutbox: Ankündigungen, Verleumdungen, Berichte
-- ---------------------------------------------------------------
create table if not exists logbook (
  id         uuid primary key default gen_random_uuid(),
  author     text not null check (author in ('max','julian','yannick','eric')),
  kind       text not null default 'announce' check (kind in ('announce','slander','report')),
  text       text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

grant select, insert, delete on logbook to authenticated;

alter table logbook enable row level security;

drop policy if exists "auth rw" on logbook;
create policy "auth rw" on logbook
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table logbook;

-- Logbuch: Zitate und Reaktionen
alter table logbook add column if not exists quote_id uuid references logbook(id) on delete set null;

create table if not exists logbook_reactions (
  entry_id   uuid not null references logbook(id) on delete cascade,
  player     text not null check (player in ('max','julian','yannick','eric')),
  emoji      text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (entry_id, player, emoji)
);

grant select, insert, delete on logbook_reactions to authenticated;

alter table logbook_reactions enable row level security;

drop policy if exists "auth rw" on logbook_reactions;
create policy "auth rw" on logbook_reactions
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table logbook_reactions;

-- Logbuch: Freundschaftsbekundung, Versöhnung und Empfänger
alter table logbook drop constraint if exists logbook_kind_check;
alter table logbook add constraint logbook_kind_check
  check (kind in ('announce','report','friendship','reconcile','slander'));
alter table logbook add column if not exists targets text[] not null default '{}'
  check (targets <@ array['max','julian','yannick','eric']);
