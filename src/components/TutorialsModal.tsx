import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { View } from '@/types';

interface TutorialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  duration: string;
  youtubeId: string; // YouTube embed video ID
  targetView?: View;
  targetViewLabel?: string;
  highlights: string[];
}

const DEFAULT_TUTORIAL_VIDEOS: VideoTutorial[] = [
  {
    id: 'intro-overview',
    title: 'AyrisLegal Hızlı Başlangıç & Genel Bakış',
    description: 'AyrisLegal masaüstü uygulamasının temel arayüzü, modülleri ve büronuz için sunduğu yapay zeka destekli iş akışları.',
    category: 'basics',
    categoryLabel: '🚀 Hızlı Başlangıç',
    duration: '03:45',
    youtubeId: 'dQw4w9WgXcQ',
    targetView: 'overview',
    targetViewLabel: 'Genel Bakışa Git',
    highlights: ['Panel yerleşimi', 'Hızlı arama (Cmd+K)', 'Gündem & Hatırlatıcılar'],
  },
  {
    id: 'uyap-extension',
    title: 'Chrome Eklentisi ile UYAP\'tan Tek Tıkla Dosya ve Evrak Aktarımı',
    description: 'UYAP Avukat Portalındaki dava evraklarını, tensip zaptını ve tensip tutanaklarını tek tıkla AyrisLegal\'e aktarma rehberi.',
    category: 'uyap',
    categoryLabel: '⚖️ UYAP & Eklenti',
    duration: '05:12',
    youtubeId: 'L_LUpnjgPso',
    targetView: 'cases',
    targetViewLabel: 'Davalara Git',
    highlights: ['Eklenti kurulumu', 'UYAP sekmesi algılama', 'Otomatik dosya ayrıştırma'],
  },
  {
    id: 'ai-petition-drafting',
    title: 'Yapay Zeka Destekli Dava Dilekçesi ve Savunma Hazırlama',
    description: 'Davanın olay örgüsünü ve taleplerini girerek kanun maddeleri ve emsal kararlarla desteklenen profesyonel dilekçe taslağı oluşturma.',
    category: 'ai_drafting',
    categoryLabel: '🤖 AI Dilekçe & Savunma',
    duration: '06:30',
    youtubeId: 'kJQP7kiw5Fk',
    targetView: 'drafting',
    targetViewLabel: 'Dilekçe Yazımına Git',
    highlights: ['Hukuki mantık motoru', 'Talep & delil kurgusu', 'UYAP formatında dışa aktar'],
  },
  {
    id: 'jurisprudence-search',
    title: '18 Milyon İçtihat Arasında Semantik ve Maddeye Göre Arama',
    description: 'Yargıtay, Danıştay, AYM ve BAM kararları içinde anahtar kelime veya dava konusu yazarak en isabetli emsal kararları bulma teknikleri.',
    category: 'jurisprudence',
    categoryLabel: '🔍 18M İçtihat',
    duration: '04:55',
    youtubeId: '3JZ_D3ELwOQ',
    targetView: 'research',
    targetViewLabel: 'İçtihat Aramaya Git',
    highlights: ['Semantik filtreleme', 'Daire & yıl süzgeci', 'Karar özetleme & alıntılama'],
  },
  {
    id: 'case-analysis-tensip',
    title: 'Dava Dosyası & Tensip Zaptı Yapay Zeka Analizi',
    description: 'Tensip zaptını sisteme yükleyerek mahkemenin verdiği kesin süreleri, ara kararları ve yerine getirilmesi gereken delil taleplerini otomatik çıkarma.',
    category: 'cases',
    categoryLabel: '📑 Dava & Tensip Analizi',
    duration: '04:18',
    youtubeId: 'fJ9rUzIMcZQ',
    targetView: 'cases',
    targetViewLabel: 'Dava Yönetimine Git',
    highlights: ['Kesin süre tespiti', 'Karşı taraf iddia analizi', 'Savunma stratejisi haritası'],
  },
  {
    id: 'custom-templates',
    title: 'Büro Şablonları Kütüphanesi & Dinamik Belge Üretimi',
    description: 'Sık kullandığınız ihtarname, sözleşme ve vekaletname taslaklarını sisteme yükleyip müvekkil bilgileriyle otomatik doldurma.',
    category: 'templates',
    categoryLabel: '📚 Şablonlar & Mevzuat',
    duration: '03:20',
    youtubeId: 'kXYiU_JCYtU',
    targetView: 'templates',
    targetViewLabel: 'Şablon Kütüphanesine Git',
    highlights: ['Özel kategori tanımlama', 'Dinamik değişkenler', 'Hızlı indirme & kopyalama'],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Tümü' },
  { id: 'basics', label: '🚀 Hızlı Başlangıç' },
  { id: 'uyap', label: '⚖️ UYAP & Eklenti' },
  { id: 'ai_drafting', label: '🤖 AI Dilekçe' },
  { id: 'jurisprudence', label: '🔍 18M İçtihat' },
  { id: 'cases', label: '📑 Dava Analizi' },
  { id: 'templates', label: '📚 Şablonlar' },
];

export function TutorialsModal({ isOpen, onClose, onNavigate }: TutorialsModalProps) {
  const [tutorials, setTutorials] = useState<VideoTutorial[]>(DEFAULT_TUTORIAL_VIDEOS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeVideo, setActiveVideo] = useState<VideoTutorial | null>(null);

  // Fetch live tutorials from Supabase
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchTutorials = async () => {
      try {
        const { data, error } = await supabase
          .from('tutorials')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0 && isMounted) {
          const mapped: VideoTutorial[] = data.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            category: t.category || 'basics',
            categoryLabel: t.category_label || '🚀 Hızlı Başlangıç',
            duration: t.duration || '03:00',
            youtubeId: t.youtube_id,
            targetView: t.target_view as View | undefined,
            targetViewLabel: t.target_view_label || undefined,
            highlights: Array.isArray(t.highlights) ? t.highlights : [],
          }));
          setTutorials(mapped);
        }
      } catch {
        // Fallback to default tutorials on error or offline
      }
    };

    fetchTutorials();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredVideos = tutorials.filter((v) => {
    const matchesCat = selectedCategory === 'all' || v.category === selectedCategory;
    const matchesQuery =
      searchQuery.trim() === '' ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.highlights.some((h) => h.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      style={{
        backgroundColor: 'rgba(4, 7, 15, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Outer Glow Box */}
      <div 
        className="relative w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col min-h-[620px] max-h-[92vh]"
        style={{
          backgroundColor: '#090E1B',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 0 70px -10px rgba(59, 130, 246, 0.35), 0 30px 90px -20px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Background Ambient Glow Orbs */}
        <div 
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
            filter: 'blur(45px)',
          }}
        />
        <div 
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
            filter: 'blur(45px)',
          }}
        />

        {/* Top neon blue gradient line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px] z-10"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #3B82F6 50%, transparent 100%)',
            boxShadow: '0 0 20px #3B82F6',
          }}
        />

        {/* TOP MODAL BAR */}
        <div 
          className="flex items-center justify-between px-6 sm:px-8 py-4 shrink-0 z-20"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(7, 11, 22, 0.75)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span 
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: '#3B82F6',
                boxShadow: '0 0 10px #3B82F6, 0 0 20px #3B82F6',
              }}
            />
            <span 
              className="font-mono text-[12px] font-bold uppercase tracking-widest"
              style={{ color: '#94A3B8' }}
            >
              AYRIS LEGAL AKADEMİ & EĞİTİMLER
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[19px] p-1 transition-colors cursor-pointer"
            style={{ color: '#64748B' }}
            title="Kapat"
          >
            ✕
          </button>
        </div>

        {/* ACTIVE VIDEO PLAYER VIEW (IF A VIDEO IS CLICKED) */}
        {activeVideo ? (
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto z-10 animate-fadeIn">
            <div>
              {/* Back button */}
              <button
                onClick={() => setActiveVideo(null)}
                className="flex items-center gap-2 text-xs font-mono font-bold mb-4 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  backgroundColor: '#050914',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#CBD5E1',
                }}
              >
                <span>← Tüm Eğitim Videolarına Dön</span>
              </button>

              {/* Video Player Container */}
              <div 
                className="w-full aspect-video rounded-2xl overflow-hidden mb-5 relative"
                style={{
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 0 35px rgba(59, 130, 246, 0.2), 0 20px 40px rgba(0,0,0,0.8)',
                  backgroundColor: '#000000',
                }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                  title={activeVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold"
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: '#60A5FA',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                      }}
                    >
                      {activeVideo.categoryLabel}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: '#94A3B8' }}>
                      ⏱️ {activeVideo.duration}
                    </span>
                  </div>
                  <h2 className="text-[20px] font-extrabold tracking-tight" style={{ color: '#FFFFFF' }}>
                    {activeVideo.title}
                  </h2>
                </div>

                {activeVideo.targetView && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigate(activeVideo.targetView!);
                    }}
                    className="px-5 py-2.5 rounded-xl font-bold text-[13px] font-mono transition-all cursor-pointer flex items-center gap-2 shrink-0 hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                      boxShadow: '0 0 25px rgba(59, 130, 246, 0.5)',
                      color: '#FFFFFF',
                    }}
                  >
                    <span>{activeVideo.targetViewLabel || 'Özelliğe Git'}</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <p className="text-[13.5px] leading-relaxed mb-4" style={{ color: '#CBD5E1' }}>
                {activeVideo.description}
              </p>

              {/* Highlights */}
              <div 
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: '#050914',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <p className="text-[11px] font-mono uppercase tracking-wider mb-2 font-bold" style={{ color: '#60A5FA' }}>
                  BU VİDEODA NELER ÖĞRENECEKSİNİZ?
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeVideo.highlights.map((h, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 rounded-lg text-[12px] font-medium"
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#FFFFFF',
                      }}
                    >
                      ✓ {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN TUTORIALS LIST & GRID VIEW */
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto z-10">
            <div>
              {/* Header Title & Subtitle */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 
                    className="text-[26px] font-extrabold tracking-tight leading-snug"
                    style={{
                      color: '#FFFFFF',
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    Kullanım & Video Eğitimleri 🎓
                  </h1>
                  <p className="text-[13.5px] mt-0.5" style={{ color: '#94A3B8' }}>
                    AyrisLegal&apos;i en verimli şekilde kullanmanız için hazırlanan adım adım video rehberleri.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="w-full md:w-72">
                  <div 
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all"
                    style={{
                      backgroundColor: '#050914',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                    }}
                  >
                    <span style={{ color: '#60A5FA' }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Eğitim veya konu ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-[13px] outline-none"
                      style={{ color: '#FFFFFF' }}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')} 
                        className="text-xs"
                        style={{ color: '#64748B' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                {CATEGORIES.map((c) => {
                  const isSelected = selectedCategory === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className="px-3.5 py-1.5 rounded-xl text-[12px] font-mono font-semibold whitespace-nowrap transition-all cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.3)' : '#050914',
                        border: isSelected ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#FFFFFF' : '#94A3B8',
                        boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'none',
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Video Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setActiveVideo(video)}
                    className="rounded-2xl overflow-hidden flex flex-col justify-between transition-all group cursor-pointer hover:scale-[1.015]"
                    style={{
                      backgroundColor: '#050914',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      boxShadow: '0 0 25px rgba(59, 130, 246, 0.1)',
                    }}
                  >
                    {/* Thumbnail / Mock Player Header */}
                    <div 
                      className="relative aspect-video w-full flex items-center justify-center overflow-hidden"
                      style={{
                        backgroundColor: '#0B1224',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {/* Ambient background glow in thumb */}
                      <div 
                        className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity"
                        style={{
                          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
                        }}
                      />

                      {/* YouTube Play Icon Badge */}
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                        style={{
                          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          boxShadow: '0 0 25px rgba(239, 68, 68, 0.6)',
                        }}
                      >
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>

                      {/* Duration Tag */}
                      <div 
                        className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        ⏱️ {video.duration}
                      </div>

                      {/* Category Badge */}
                      <div 
                        className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                        style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          color: '#60A5FA',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                        }}
                      >
                        {video.categoryLabel}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 
                          className="text-[14.5px] font-bold leading-snug mb-1.5 group-hover:text-[#60A5FA] transition-colors"
                          style={{ color: '#FFFFFF' }}
                        >
                          {video.title}
                        </h3>
                        <p 
                          className="text-[11.5px] leading-relaxed line-clamp-2 mb-3"
                          style={{ color: '#94A3B8' }}
                        >
                          {video.description}
                        </p>
                      </div>

                      <div 
                        className="pt-3 flex items-center justify-between text-[11px] font-mono font-bold"
                        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
                      >
                        <span style={{ color: '#60A5FA' }}>▶️ İzle ve Öğren</span>
                        <span style={{ color: '#94A3B8' }}>{video.highlights.length} Konu Başlığı</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Modal Bar */}
            <div 
              className="pt-5 mt-6 flex items-center justify-between text-[12px] font-mono"
              style={{ 
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94A3B8',
              }}
            >
              <span>Yeni eğitim videoları düzenli olarak eklenmektedir.</span>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[12px] font-mono transition-all cursor-pointer"
                style={{
                  backgroundColor: '#050914',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#CBD5E1',
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
