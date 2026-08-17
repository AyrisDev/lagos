-- Genel (dosyasız) Sohbet/Asistan sayfası için kalıcı sohbet geçmişi.
-- Bilerek "cases" tablosuyla hiçbir ilişkisi yok — Dosyalar ve Sohbet
-- bölümleri arasında bağlantı olmasın istendiği için (bkz. chat.controller.ts
-- caseId==='general' notu) ayrı bir chat_threads/thread_messages çifti
-- kullanılıyor, cases.kind='chat' gibi bir workaround'a geri dönülmüyor.
create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Yeni Sohbet',
  created_at timestamptz default now()
);

create table thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index idx_chat_threads_user_id on chat_threads(user_id);
create index idx_thread_messages_thread_id on thread_messages(thread_id);
