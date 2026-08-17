-- Google Drive Backup (Faz 1 — backend altyapısı). Bu üç tablo, licenses
-- tablosuyla aynı desende: bilerek hiçbir RLS policy tanımlanmıyor, sadece
-- laawos-backend (service_role) erişiyor — Electron bu tablolara hiçbir zaman
-- doğrudan erişmiyor, hepsi /api/google-drive/* uç noktalarından geçiyor.
--
-- ÖNEMLİ: Bu migration'ı license/update sisteminin kullandığı ayrı self-hosted
-- Supabase projesine DEĞİL, ana AyrisLegal uygulamasının Supabase projesine
-- (profiles/cases/documents'in olduğu proje) çalıştırın — user_id auth.users'a
-- referans veriyor, o kullanıcılar bu projede.

create table if not exists public.google_drive_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  google_email text not null,

  -- Ham token asla yazılmaz — laawos-backend'deki tokenCrypto.ts (AES-256-GCM,
  -- GOOGLE_TOKEN_ENCRYPTION_KEY) ile şifrelenmiş hal saklanır.
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  scope text not null,

  drive_root_folder_id text,
  drive_cases_folder_id text,

  status text not null default 'connected'
    check (status in ('connected', 'reauthorization_required', 'disconnected')),

  last_sync_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id)
);

create table if not exists public.google_drive_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  local_path text not null,
  drive_file_id text,
  drive_parent_id text,
  file_name text not null,
  file_size bigint,

  local_modified_at timestamptz,
  drive_modified_at timestamptz,
  sha256 text,

  status text not null default 'pending'
    check (status in ('pending', 'uploading', 'synced', 'failed', 'deleted_local', 'conflict')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, local_path)
);

create table if not exists public.google_drive_backup_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid references public.google_drive_files(id) on delete set null,

  event_type text not null
    check (event_type in ('upload_started', 'upload_completed', 'upload_failed', 'retry', 'restore', 'delete')),

  file_size bigint,
  status text,
  error_message text,

  created_at timestamptz not null default now()
);

create index if not exists idx_google_drive_connections_user_id on public.google_drive_connections(user_id);
create index if not exists idx_google_drive_files_user_id on public.google_drive_files(user_id);
create index if not exists idx_google_drive_files_user_status on public.google_drive_files(user_id, status);
create index if not exists idx_google_drive_backup_events_user_id on public.google_drive_backup_events(user_id);
create index if not exists idx_google_drive_backup_events_created_at on public.google_drive_backup_events(created_at desc);

alter table public.google_drive_connections enable row level security;
alter table public.google_drive_files enable row level security;
alter table public.google_drive_backup_events enable row level security;

-- Bilerek hiçbir SELECT / INSERT / UPDATE / DELETE policy oluşturmuyoruz.
-- Bir kullanıcının başka bir kullanıcının Google email/token/dosya/backup
-- metadata'sını görememesi (PRD §37, Test 10) böylece garanti ediliyor: client
-- hiçbir koşulda bu tablolara doğrudan erişemiyor.
