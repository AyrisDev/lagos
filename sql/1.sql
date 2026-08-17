create extension if not exists vector;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_type text default 'individual',
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  bar_association_no text,
  license_status text default 'trial',   -- trial | active | expired
  license_expires_at timestamptz,
  org_id uuid references organizations(id),
  created_at timestamptz default now()
);

create table cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  org_id uuid references organizations(id),
  title text not null,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  storage_path text not null,          -- bucket içindeki yol
  filename text not null,
  mime_type text,
  file_size bigint,
  ocr_status text default 'pending',   -- pending | processing | done | failed
  extracted_text text,
  uploaded_at timestamptz default now()
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  document_id uuid references documents(id),
  summary_json jsonb,
  model_used text,
  created_at timestamptz default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  role text not null check (role in ('user','assistant')),
  content text not null,
  referenced_document_ids uuid[],
  chat_mode text not null default 'chat',
  created_at timestamptz default now()
);

create table case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  event_date timestamptz not null,
  title text not null,
  event_type text not null default 'other',
  created_at timestamptz default now()
);

create table embeddings (              -- Faz 2 RAG için hazır, şimdilik boş kalır
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536),
  chunk_index int,
  created_at timestamptz default now()
);

create table access_logs (             -- KVKK denetim izi
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  resource_type text,
  resource_id uuid,
  action text,
  created_at timestamptz default now()
);

-- Performans için temel indeksler
create index idx_cases_user_id on cases(user_id);
create index idx_documents_case_id on documents(case_id);
create index idx_chat_messages_case_id on chat_messages(case_id);
create index idx_case_events_case_id on case_events(case_id);
create index idx_embeddings_document_id on embeddings(document_id);