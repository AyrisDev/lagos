-- Duruşma Takvimi için events tablosu (sql/1.sql'deki şemaya ek).
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  case_id uuid references cases(id) on delete set null,
  title text not null,
  description text,
  date timestamptz not null,
  type text not null default 'hearing' check (type in ('hearing', 'meeting', 'deadline')),
  location text,
  created_at timestamptz default now()
);

create index idx_events_user_id on events(user_id);
create index idx_events_date on events(date);
