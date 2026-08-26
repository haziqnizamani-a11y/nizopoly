-- Nizopoly schema.
--
-- Paste the whole file into the Supabase SQL editor and hit Run.
-- Safe to run more than once.

create table if not exists games (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Per-player secrets. Never exposed to the browser: the anon role gets no
-- policy here, so only the service role (our API routes) can read it.
create table if not exists game_players (
  code text not null references games(code) on delete cascade,
  player_id text not null,
  secret text not null,
  created_at timestamptz not null default now(),
  primary key (code, player_id)
);

alter table games enable row level security;
alter table game_players enable row level security;

-- Game state is readable by anyone holding the room code; all writes go through
-- the server, which uses the service role and bypasses RLS.
drop policy if exists games_public_read on games;
create policy games_public_read on games for select using (true);

-- Deliberately no policies on game_players: with RLS on and no policy, the anon
-- key can read nothing here, so player secrets never reach a browser.

-- Realtime push of state changes. `add table` errors if it's already a member,
-- so only add when missing.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'
  ) then
    alter publication supabase_realtime add table games;
  end if;
end $$;

-- Realtime needs the full old row to compute the change payload.
alter table games replica identity full;

create index if not exists games_updated_at_idx on games (updated_at desc);

-- Housekeeping: rooms nobody has touched in a day are dead. Run manually, or
-- schedule it if you enable pg_cron.
-- delete from games where updated_at < now() - interval '1 day';
