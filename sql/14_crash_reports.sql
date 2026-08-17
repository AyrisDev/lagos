-- Crash Reporting & Error Monitoring. licenses/app_releases ile aynı desen:
-- bilerek hiçbir RLS policy tanımlanmıyor, sadece Edge Function (crash-report)
-- service_role ile yazıyor. Bu tabloyu license/update sisteminin kullandığı
-- AYNI self-hosted Supabase projesine çalıştırın (crash-report Edge Function
-- de aynı projede yaşayacak) — kullanıcı hesap verisiyle değil, cihaz/uygulama
-- teşhis verisiyle ilgili olduğu için o proje mantıksal olarak daha uygun.
create table if not exists public.crash_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique,

  -- Kullanıcı/lisans/cihaz kimliği tutulabilir (PRD §19-21) ama e-posta,
  -- lisans anahtarı, cihaz seri no gibi hiçbir kimlik doğrulayıcı sır YOK.
  user_id uuid,
  license_id uuid,
  device_id text,

  app_version text not null,
  environment text not null default 'production' check (environment in ('production', 'development')),
  electron_version text,
  os text,
  os_version text,
  architecture text,

  process text not null check (process in ('main', 'renderer')),
  event_type text not null check (event_type in (
    'crash', 'uncaught_exception', 'unhandled_rejection', 'renderer_crash',
    'ipc_error', 'license_error', 'update_error', 'backup_error', 'oauth_error', 'network_error'
  )),
  severity text not null default 'error' check (severity in ('fatal', 'error', 'warning', 'info')),

  error_name text,
  error_message text,
  stack_trace text,
  module text,

  -- Aynı hatanın yüzlerce kaydını tek bir "issue" altında gruplamak için
  -- (PRD §26) — sunucu tarafında error_name+mesaj+module+app_version'dan
  -- hesaplanıyor, client'ın gönderdiği bir değer değil (güvenilirlik için).
  fingerprint text not null,

  created_at timestamptz not null default now()
);

create index if not exists idx_crash_reports_fingerprint on public.crash_reports(fingerprint);
create index if not exists idx_crash_reports_created_at on public.crash_reports(created_at desc);
create index if not exists idx_crash_reports_app_version on public.crash_reports(app_version);
create index if not exists idx_crash_reports_device_id on public.crash_reports(device_id);

alter table public.crash_reports enable row level security;
-- Bilerek hiçbir SELECT/INSERT/UPDATE/DELETE policy yok — client (Electron)
-- bu tabloya asla doğrudan erişmiyor, sadece Edge Function service_role ile.
