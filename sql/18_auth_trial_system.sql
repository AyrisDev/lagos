-- ============================================================
-- 18_auth_trial_system.sql
-- E-posta/Google kayıt + 3 günlük deneme sistemi
-- ============================================================

-- 1. Deneme süresi takip kolonları
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_end_date   TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_device_id  TEXT;  -- Aynı cihazdan ikinci deneme engellemek için

-- 2. Yeni kullanıcı kaydolduğunda otomatik 3 günlük trial başlat
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    NOW() + INTERVAL '3 days'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      license_status   = COALESCE(profiles.license_status, 'trial'),
      trial_start_date = COALESCE(profiles.trial_start_date, NOW()),
      trial_end_date   = COALESCE(profiles.trial_end_date,   NOW() + INTERVAL '3 days');
  RETURN NEW;
END;
$$;

-- Trigger'ı (varsa sil, yeniden oluştur)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Device ID'ye göre daha önce trial kullanılmış mı kontrolü için index
CREATE INDEX IF NOT EXISTS idx_profiles_trial_device_id ON profiles(trial_device_id)
  WHERE trial_device_id IS NOT NULL;

-- 4. Mevcut kullanıcıları retroaktif olarak düzelt
--    (trial_start_date boş olanlar için created_at'ten hesapla)
UPDATE profiles
SET
  trial_start_date = created_at,
  trial_end_date   = created_at + INTERVAL '3 days'
WHERE
  trial_start_date IS NULL
  AND license_status = 'trial';
