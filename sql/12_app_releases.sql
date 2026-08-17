-- Electron Auto Update System: her platform için yayınlanmış en güncel sürüm
-- bilgisi. licenses tablosundaki aynı desen — bilerek hiçbir RLS policy
-- tanımlanmıyor, sadece Edge Function (supabase/functions/app-update)
-- service_role ile okuyor, Electron hiçbir zaman bu tabloya doğrudan erişmiyor.
create table if not exists public.app_releases (
  id uuid primary key default gen_random_uuid(),

  platform text not null
    check (platform in ('win32', 'darwin', 'linux')),

  version text not null,

  minimum_version text not null default '0.0.0',

  mandatory boolean not null default false,

  release_notes jsonb not null default '[]'::jsonb,

  sha256 text,

  download_url text not null,

  published_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  unique (platform, version)
);

create index if not exists idx_app_releases_platform_published
  on public.app_releases(platform, published_at desc);

alter table public.app_releases enable row level security;

-- Bilerek hiçbir SELECT / INSERT / UPDATE / DELETE policy oluşturmuyoruz —
-- Edge Function service_role ile erişecek, Electron doğrudan erişmeyecek.
