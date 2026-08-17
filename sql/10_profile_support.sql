-- Ayarlar sayfası: kullanıcı bilgileri (bağlı olduğu baro + abonelik başlangıç
-- tarihi profiles'ta eksikti) ve destek/geri bildirim formu için yeni tablo.
alter table profiles add column if not exists bar_name text;
alter table profiles add column if not exists license_started_at timestamptz;

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category text not null default 'diger' check (category in ('hata', 'geri_bildirim', 'soru', 'diger')),
  subject text not null,
  message text not null,
  status text not null default 'acik' check (status in ('acik', 'cozuldu')),
  created_at timestamptz default now()
);

create index idx_support_messages_user_id on support_messages(user_id);
