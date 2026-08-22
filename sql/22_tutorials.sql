-- ==============================================================================
-- 22_tutorials.sql: AyrisLegal Akademi Eğitim Videoları Tablosu
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tutorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'basics',
    category_label TEXT NOT NULL DEFAULT '🚀 Hızlı Başlangıç',
    duration TEXT NOT NULL DEFAULT '03:00',
    youtube_id TEXT NOT NULL,
    target_view TEXT,
    target_view_label TEXT,
    highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_tutorials_is_active_sort ON public.tutorials(is_active, sort_order);

-- RLS
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;

-- Herkes (veya giriş yapmış kullanıcılar) aktif eğitim videolarını okuyabilir
DROP POLICY IF EXISTS "Public and authenticated users can view active tutorials" ON public.tutorials;
CREATE POLICY "Public and authenticated users can view active tutorials"
    ON public.tutorials
    FOR SELECT
    USING (is_active = true);

-- Service role (Admin panel) tam yetkiye sahip
DROP POLICY IF EXISTS "Service role has full access to tutorials" ON public.tutorials;
CREATE POLICY "Service role has full access to tutorials"
    ON public.tutorials
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- İlk Başlangıç Mock Videoları
INSERT INTO public.tutorials (id, title, description, category, category_label, duration, youtube_id, target_view, target_view_label, highlights, sort_order, is_active)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'AyrisLegal Hızlı Başlangıç & Genel Bakış',
    'AyrisLegal masaüstü uygulamasının temel arayüzü, modülleri ve büronuz için sunduğu yapay zeka destekli iş akışları.',
    'basics',
    '🚀 Hızlı Başlangıç',
    '03:45',
    'dQw4w9WgXcQ',
    'overview',
    'Genel Bakışa Git',
    '["Panel yerleşimi", "Hızlı arama (Cmd+K)", "Gündem & Hatırlatıcılar"]'::jsonb,
    1,
    true
),
(
    '00000000-0000-0000-0000-000000000002',
    'Chrome Eklentisi ile UYAP''tan Tek Tıkla Dosya ve Evrak Aktarımı',
    'UYAP Avukat Portalındaki dava evraklarını, tensip zaptını ve tensip tutanaklarını tek tıkla AyrisLegal''e aktarma rehberi.',
    'uyap',
    '⚖️ UYAP & Eklenti',
    '05:12',
    'L_LUpnjgPso',
    'cases',
    'Davalara Git',
    '["Eklenti kurulumu", "UYAP sekmesi algılama", "Otomatik dosya ayrıştırma"]'::jsonb,
    2,
    true
),
(
    '00000000-0000-0000-0000-000000000003',
    'Yapay Zeka Destekli Dava Dilekçesi ve Savunma Hazırlama',
    'Davanın olay örgüsünü ve taleplerini girerek kanun maddeleri ve emsal kararlarla desteklenen profesyonel dilekçe taslağı oluşturma.',
    'ai_drafting',
    '🤖 AI Dilekçe & Savunma',
    '06:30',
    'kJQP7kiw5Fk',
    'drafting',
    'Dilekçe Yazımına Git',
    '["Hukuki mantık motoru", "Talep & delil kurgusu", "UYAP formatında dışa aktar"]'::jsonb,
    3,
    true
),
(
    '00000000-0000-0000-0000-000000000004',
    '18 Milyon İçtihat Arasında Semantik ve Maddeye Göre Arama',
    'Yargıtay, Danıştay, AYM ve BAM kararları içinde anahtar kelime veya dava konusu yazarak en isabetli emsal kararları bulma teknikleri.',
    'jurisprudence',
    '🔍 18M İçtihat',
    '04:55',
    '3JZ_D3ELwOQ',
    'research',
    'İçtihat Aramaya Git',
    '["Semantik filtreleme", "Daire & yıl süzgeci", "Karar özetleme & alıntılama"]'::jsonb,
    4,
    true
),
(
    '00000000-0000-0000-0000-000000000005',
    'Dava Dosyası & Tensip Zaptı Yapay Zeka Analizi',
    'Tensip zaptını sisteme yükleyerek mahkemenin verdiği kesin süreleri, ara kararları ve yerine getirilmesi gereken delil taleplerini otomatik çıkarma.',
    'cases',
    '📑 Dava & Tensip Analizi',
    '04:18',
    'fJ9rUzIMcZQ',
    'cases',
    'Dava Yönetimine Git',
    '["Kesin süre tespiti", "Karşı taraf iddia analizi", "Savunma stratejisi haritası"]'::jsonb,
    5,
    true
),
(
    '00000000-0000-0000-0000-000000000006',
    'Büro Şablonları Kütüphanesi & Dinamik Belge Üretimi',
    'Sık kullandığınız ihtarname, sözleşme ve vekaletname taslaklarını sisteme yükleyip müvekkil bilgileriyle otomatik doldurma.',
    'templates',
    '📚 Şablonlar & Mevzuat',
    '03:20',
    'kXYiU_JCYtU',
    'templates',
    'Şablon Kütüphanesine Git',
    '["Özel kategori tanımlama", "Dinamik değişkenler", "Hızlı indirme & kopyalama"]'::jsonb,
    6,
    true
)
ON CONFLICT (id) DO NOTHING;
