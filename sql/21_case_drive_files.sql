-- Yerel-öncelikli veri mimarisi (Faz 4 — mobil ince-köprü). Bkz.
-- docs/mimari-karar-yerel-oncelikli-veri-modeli.md.
--
-- Mobil (legal-mobile) artık documents/analyses'i doğrudan Supabase'den
-- okumuyor — laawos-backend'deki /api/mobile-relay/case/:caseId/summary
-- endpoint'ine istek atıyor, o da kullanıcının Google Drive'ındaki
-- case.sqlite'ı ANLIK olarak açıp özet bilgiyi döner (bkz.
-- mobileRelay.controller.ts). Bu tablo, o endpoint'in "hangi case_id, Drive'da
-- hangi local_path'e karşılık geliyor" sorusunu cevaplaması için gereken
-- eşleşmeyi tutar — Electron, bir davaya her dokunduğunda (localDataStore.js
-- ::upsertCaseMeta) best-effort olarak günceller.
--
-- google_drive_connections/google_drive_files ile AYNI desen: bilerek hiçbir
-- RLS policy tanımlanmıyor, sadece laawos-backend (service_role) erişiyor.

create table if not exists public.case_drive_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,

  local_path text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, case_id)
);

create index if not exists idx_case_drive_files_user_id on public.case_drive_files(user_id);

alter table public.case_drive_files enable row level security;

-- Bilerek hiçbir SELECT / INSERT / UPDATE / DELETE policy oluşturmuyoruz —
-- google_drive_files'taki aynı gerekçe: client hiçbir koşulda bu tabloya
-- doğrudan erişemesin, sadece backend (service_role) üzerinden.
