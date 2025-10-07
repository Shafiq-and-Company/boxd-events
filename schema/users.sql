-- USERS
create table users (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  email text unique not null,
  created_at timestamptz default now()
);