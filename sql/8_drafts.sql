-- Dilekçe Hazırlama'da AI ile oluşturulan taslakların kalıcı kaydı — hem
-- "Dilekçelerim" listesinde hem ilgili dava dosyasının kendi "Dilekçeler"
-- bölümünde görünmesi için. case_id opsiyonel değil şu an (her taslak bir
-- dosyaya bağlı üretiliyor) ama dosya silinirse taslak da silinsin diye cascade.
create table drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  case_id uuid references cases(id) on delete cascade,
  petition_type text not null,
  content text not null,
  template_id uuid references templates(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_drafts_user_id on drafts(user_id);
create index idx_drafts_case_id on drafts(case_id);
