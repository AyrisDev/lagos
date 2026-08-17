-- Destek mesajlarına ek dosya desteği
-- Supabase Storage bucket: support-attachments (private)
-- support_messages tablosuna attachment kolonları

alter table support_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_size bigint;

-- Supabase Storage bucket oluştur (Dashboard > Storage'dan da yapılabilir)
-- insert into storage.buckets (id, name, public)
-- values ('support-attachments', 'support-attachments', false)
-- on conflict do nothing;

-- RLS: kullanıcı kendi klasörüne yükleyebilir
-- Dashboard > Storage > support-attachments > Policies:
-- INSERT policy: (storage.foldername(name))[1] = auth.uid()::text
-- SELECT policy: (storage.foldername(name))[1] = auth.uid()::text
