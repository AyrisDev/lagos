-- Duruşma ve Süre Takvimi (Calendar Events) Tablosu
create table case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  event_date timestamptz not null,
  title text not null,
  event_type text not null default 'other', -- 'hearing', 'deadline', 'other'
  created_at timestamptz default now()
);

create index idx_case_events_case_id on case_events(case_id);
