-- RSVPS (user joins events)
create table rsvps (
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  status text not null check (status in ('going','maybe','not_going')) default 'going',
  created_at timestamptz default now(),
  primary key (user_id, event_id)
);