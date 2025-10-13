-- RSVPS (user joins events)
create table rsvps (
  user_id uuid not null references users(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  status text not null check (status in ('going','maybe','not_going')) default 'going',
  payment_status text check (payment_status in ('pending','paid','failed','refunded')) default 'pending',
  stripe_session_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, event_id)
);