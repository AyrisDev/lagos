-- Belge Şablonları için: avukatın kendi yüklediği dilekçe/evrak şablonları.
-- Ham dosya mevcut "case-documents" Storage bucket'ında "templates/<user_id>/..."
-- öneki altında saklanıyor (ayrı bir bucket oluşturmaya gerek kalmasın diye).
create table templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category text,
  name text not null,
  description text,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz default now()
);

create index idx_templates_user_id on templates(user_id);
