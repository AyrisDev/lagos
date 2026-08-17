-- Müvekkil Portalı: avukatın müvekkil bilgilerini not edebildiği ve alacak/verecek
-- (ücret tahakkuku / tahsilat) takibi yapabildiği basit bir kayıt defteri.
-- Not: Bu, müvekkillerin kendi hesabıyla giriş yapabildiği ayrı bir portal DEĞİL —
-- sadece avukatın kendi görebildiği bir CRM/not defteri.
create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  client_type text not null default 'Bireysel' check (client_type in ('Bireysel', 'Kurumsal')),
  notes text,
  created_at timestamptz default now()
);

create table client_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null default current_date,
  description text,
  amount numeric not null,
  -- alacak: avukatın müvekkilden alacağı (ücret tahakkuku) / odeme: müvekkilden tahsil edilen ödeme
  entry_type text not null check (entry_type in ('alacak', 'odeme')),
  created_at timestamptz default now()
);

create index idx_clients_user_id on clients(user_id);
create index idx_client_ledger_client_id on client_ledger(client_id);
