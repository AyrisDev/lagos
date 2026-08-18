-- ============================================================
-- 20_whatsapp_integration.sql
-- WhatsApp AI hattı (n8n + Evolution API) için: admin panelinden elle
-- girilen telefon numarası + hangi dava dosyasıyla konuşulduğunu takip
-- eden oturum tablosu.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON profiles (phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  phone TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  active_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  awaiting_case_selection BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);
