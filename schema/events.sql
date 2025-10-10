-- EVENTS (no creator column; users cannot create events)
create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  city text,
  state text,
  game_title text,
  host text,
  cost numeric(10,2) default 0,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz default now(),
  check (ends_at is null or ends_at >= starts_at)
);