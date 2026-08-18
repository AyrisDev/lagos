-- ============================================================
-- 19_configurable_trial_and_status_gate.sql
-- Admin panelinden ayarlanabilir deneme süresi + profiles.license_status
-- üzerinde CHECK constraint + handle_new_user() trigger'ının hardcoded
-- 3 günü yerine app_settings.trial_days okuması.
-- ============================================================

-- 1. Tek satırlık global ayar tablosu — admin panelinden düzenlenecek
CREATE TABLE IF NOT EXISTS app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  trial_days INTEGER NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_settings (id, trial_days) VALUES (true, 7) ON CONFLICT (id) DO NOTHING;

-- 2. profiles.license_status artık gerçek bir erişim kapısı — geçersiz
--    değer girilmesin (şimdiye kadar sadece yorum satırıyla belirtiliyordu)
ALTER TABLE profiles ADD CONSTRAINT profiles_license_status_check
  CHECK (license_status IN ('trial', 'active', 'expired'));

-- 3. handle_new_user(): sabit 3 gün yerine app_settings.trial_days oku
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_days INTEGER;
BEGIN
  SELECT trial_days INTO v_trial_days FROM app_settings LIMIT 1;
  v_trial_days := COALESCE(v_trial_days, 7);

  INSERT INTO public.profiles (
    id,
    license_status,
    trial_start_date,
    trial_end_date
  )
  VALUES (
    NEW.id,
    'trial',
    NOW(),
    NOW() + (v_trial_days || ' days')::interval
  )
  ON CONFLICT (id) DO UPDATE
    SET
      license_status   = COALESCE(profiles.license_status, 'trial'),
      trial_start_date = COALESCE(profiles.trial_start_date, NOW()),
      trial_end_date   = COALESCE(profiles.trial_end_date, NOW() + (v_trial_days || ' days')::interval);
  RETURN NEW;
END;
$$;
