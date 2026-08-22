import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { View } from '@/types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  userEmail?: string;
  initialFullName?: string | null;
}

const PRACTICE_AREAS = [
  { id: 'ceza', label: '⚖️ Ceza Hukuku' },
  { id: 'is_tazminat', label: '💼 İş & Tazminat' },
  { id: 'ticaret_sirket', label: '🏢 Ticaret & Şirketler' },
  { id: 'aile_bosanma', label: '👨‍👩‍👧 Aile & Boşanma' },
  { id: 'icra_iflas', label: '📑 İcra & İflas' },
  { id: 'gayrimenkul_kira', label: '🏠 Gayrimenkul & Kira' },
  { id: 'idare_vergi', label: '🏛️ İdare & Vergi' },
  { id: 'fikri_sinai', label: '💡 Fikri & Sınai Mülkiyet' },
  { id: 'tuketici_sozlesme', label: '📜 Tüketici & Sözleşmeler' },
];

export function OnboardingModal({
  isOpen,
  onClose,
  onNavigate,
  userEmail,
  initialFullName,
}: OnboardingModalProps) {
  const [step, setStep] = useState<number>(1);
  const [fullName, setFullName] = useState<string>(initialFullName || '');
  const [officeName, setOfficeName] = useState<string>('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['is_tazminat', 'ticaret_sirket']);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [extensionInstalled, setExtensionInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (initialFullName) setFullName(initialFullName);
  }, [initialFullName]);

  // Reset to step 1 whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  // Check if Chrome extension is already communicating / active
  useEffect(() => {
    const handleExtensionMsg = (event: MessageEvent) => {
      if (event.data && event.data.source === 'ayris-chrome-extension') {
        setExtensionInstalled(true);
      }
    };
    window.addEventListener('message', handleExtensionMsg);
    return () => window.removeEventListener('message', handleExtensionMsg);
  }, []);

  if (!isOpen) return null;

  const toggleArea = (id: string) => {
    setSelectedAreas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleComplete = async (targetView: View = 'overview') => {
    try {
      localStorage.setItem('ayrislegal-onboarding-completed', 'true');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim() || undefined,
          })
          .eq('id', user.id);
      }
    } catch {
      // Non-blocking
    }
    onClose();
    onNavigate(targetView);
  };

  const handleOpenChromeStore = () => {
    // Open Chrome extension store or website download link
    const chromeUrl = 'https://chromewebstore.google.com/detail/ayris-legal-uyap-aktar%C4%B1/ayrislegal';
    if (typeof window !== 'undefined') {
      window.open(chromeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const stepsMeta = [
    { num: 1, title: 'Hoş Geldiniz', subtitle: 'Büro Profili' },
    { num: 2, title: 'UYAP Entegrasyonu', subtitle: 'Chrome Eklentisi' },
    { num: 3, title: 'Özellik Turu', subtitle: 'Temel Güçler' },
    { num: 4, title: 'Hazırsınız', subtitle: 'Başlangıç' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080D1A]/85 backdrop-blur-lg animate-fadeIn">
      {/* Outer Glow Container */}
      <div className="relative w-full max-w-4xl bg-[var(--color-surface,#121927)] border border-[var(--color-divider,#222F46)] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[580px] max-h-[92vh]">
        
        {/* Top glowing edge */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent z-10"></div>

        {/* Close Button */}
        <button
          onClick={() => handleComplete('overview')}
          className="absolute top-5 right-5 z-20 w-8 h-8 rounded-full bg-[var(--color-bg-base,#0A101D)]/80 hover:bg-[var(--color-divider,#222F46)] text-[var(--color-text-muted,#94A3B8)] hover:text-white flex items-center justify-center text-sm transition-all cursor-pointer border border-[var(--color-divider,#222F46)]"
          title="Onboarding'i Kapat"
        >
          ✕
        </button>

        {/* LEFT SIDEBAR: Step Indicator */}
        <div className="w-full md:w-72 bg-[var(--color-bg-base,#0A101D)] border-b md:border-b-0 md:border-r border-[var(--color-divider,#222F46)] p-6 md:p-8 flex flex-col justify-between shrink-0">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] flex items-center justify-center font-bold text-white shadow-lg shadow-[#3B82F6]/30">
                A
              </div>
              <div>
                <h2 className="font-extrabold text-[17px] text-[var(--color-text,#FFFFFF)] tracking-tight">AyrisLegal</h2>
                <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-wider">Başlangıç Rehberi</p>
              </div>
            </div>

            {/* Stepper */}
            <div className="flex flex-row md:flex-col gap-3 md:gap-6">
              {stepsMeta.map((s) => {
                const isActive = step === s.num;
                const isPassed = step > s.num;
                return (
                  <div
                    key={s.num}
                    onClick={() => s.num < step && setStep(s.num)}
                    className={`flex items-center gap-3.5 transition-all ${
                      s.num < step ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all shrink-0 ${
                        isActive
                          ? 'bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/35 scale-105 ring-2 ring-[#3B82F6]/30'
                          : isPassed
                          ? 'bg-[#00E699]/15 border border-[#00E699]/40 text-[#00E699]'
                          : 'bg-[var(--color-surface,#151C2C)] border border-[var(--color-divider,#222F46)] text-[var(--color-text-muted,#64748B)]'
                      }`}
                    >
                      {isPassed ? '✓' : s.num}
                    </div>
                    <div className="hidden md:block">
                      <p
                        className={`text-[13px] font-bold leading-tight transition-colors ${
                          isActive
                            ? 'text-[var(--color-text,#FFFFFF)]'
                            : isPassed
                            ? 'text-[var(--color-text,#CBD5E1)]'
                            : 'text-[var(--color-text-muted,#64748B)]'
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="text-[11px] font-mono text-[var(--color-text-muted,#64748B)]">
                        {s.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User info footer */}
          <div className="hidden md:block pt-6 border-t border-[var(--color-divider,#222F46)]">
            <p className="text-[10px] font-mono uppercase text-[var(--color-text-muted,#64748B)] tracking-wider mb-1">Giriş Yapılan Hesap</p>
            <p className="text-[12px] font-mono text-[var(--color-text,#CBD5E1)] truncate">{userEmail || 'Avukat Hesabı'}</p>
          </div>
        </div>

        {/* RIGHT CONTENT AREA: Dynamic Step View */}
        <div className="flex-1 p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
          
          {/* STEP 1: WELCOME & OFFICE PROFILE */}
          {step === 1 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#3B82F6] font-bold bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-2.5 py-1 rounded-full">
                  1. Adım · Büro Yapılandırması
                </span>
                <h1 className="text-[26px] font-extrabold text-[var(--color-text,#FFFFFF)] tracking-tight mt-3 mb-2">
                  Ayris Legal&apos;e Hoş Geldiniz! ⚖️
                </h1>
                <p className="text-[14px] text-[var(--color-text-muted,#94A3B8)] leading-relaxed">
                  Yapay zeka asistanınızı ve şablonlarınızı büronuzun çalışma şekline göre özelleştirelim.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-[var(--color-text-muted,#94A3B8)] uppercase tracking-wider block mb-1.5 font-bold">
                    Avukat Adı Soyadı
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Av. Mehmet Yılmaz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text,#FFFFFF)] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[var(--color-text-muted,#94A3B8)] uppercase tracking-wider block mb-1.5 font-bold">
                    Hukuk Bürosu Unvanı (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Yılmaz & Ortakları Hukuk Bürosu"
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                    className="w-full bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text,#FFFFFF)] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--color-text-muted,#94A3B8)] uppercase tracking-wider block mb-2 font-bold flex items-center justify-between">
                  <span>Ana Çalışma & Uzmanlık Alanlarınız</span>
                  <span className="text-[10px] text-[#3B82F6]">AI asistanınız bu alanlara öncelik verir</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRACTICE_AREAS.map((area) => {
                    const isSelected = selectedAreas.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggleArea(area.id)}
                        className={`p-2.5 rounded-xl text-[12px] font-medium text-left transition-all cursor-pointer border flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[var(--color-text,#FFFFFF)] font-bold shadow-sm shadow-[#3B82F6]/10'
                            : 'bg-[var(--color-bg-base,#0A101D)] border-[var(--color-divider,#222F46)] text-[var(--color-text-muted,#94A3B8)] hover:border-[#3B82F6]/50 hover:text-[var(--color-text,#FFFFFF)]'
                        }`}
                      >
                        <span>{area.label}</span>
                        {isSelected && <span className="text-[#3B82F6] text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CHROME EXTENSION & UYAP INTEGRATION */}
          {step === 2 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#00E699] font-bold bg-[#00E699]/10 border border-[#00E699]/20 px-2.5 py-1 rounded-full">
                  2. Adım · Entegre Çalışma
                </span>
                <h1 className="text-[26px] font-extrabold text-[var(--color-text,#FFFFFF)] tracking-tight mt-3 mb-2">
                  UYAP & Chrome Eklentisi 🌐
                </h1>
                <p className="text-[14px] text-[var(--color-text-muted,#94A3B8)] leading-relaxed">
                  UYAP Avukat Portalından evrakları ve emsal kararları tek tıkla doğrudan Ayris Legal masaüstü uygulamanıza aktarın.
                </p>
              </div>

              {/* Extension Visual Feature Card */}
              <div className="bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] rounded-2xl p-5 flex flex-col md:flex-row items-center gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="w-16 h-16 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                  🧩
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <h3 className="text-[16px] font-bold text-[var(--color-text,#FFFFFF)]">
                      Ayris Legal Chrome Eklentisi
                    </h3>
                    <span className="bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                      v1.2
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[var(--color-text-muted,#94A3B8)] leading-relaxed mb-3">
                    UYAP dosya inceleme sayfasında beliren <strong>&quot;Ayris&apos;e Aktar&quot;</strong> butonuyla tensip zaptı, bilirkişi raporu ve dilekçeleri anında masaüstü uygulamanıza gönderin.
                  </p>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <button
                      onClick={handleOpenChromeStore}
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-xl text-[12px] font-bold font-mono shadow-md shadow-[#3B82F6]/25 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8a7.2 7.2 0 016.928 5.2h-6.928l-3.6-6.235A7.16 7.16 0 0112 4.8zm-7.2 7.2a7.16 7.16 0 012.072-5.064l3.6 6.235-3.6 6.235A7.16 7.16 0 014.8 12zm7.2 7.2a7.16 7.16 0 01-5.328-2.4l3.6-6.235 3.6 6.235A7.16 7.16 0 0112 19.2zm0-4.8a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8z" />
                      </svg>
                      Chrome Web Mağazası&apos;nda Aç
                    </button>

                    <span className="text-[11px] font-mono text-[var(--color-text-muted,#64748B)]">
                      {extensionInstalled ? '✓ Eklenti Tespit Edildi' : '· Ücretsiz ve 10 saniyede kurulur'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Key Integration Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--color-bg-base,#0A101D)]/60 border border-[var(--color-divider,#222F46)]">
                  <div className="text-lg mb-1">⚡</div>
                  <h4 className="text-[12px] font-bold text-[var(--color-text,#FFFFFF)] mb-0.5">Tek Tıkla Aktarım</h4>
                  <p className="text-[11px] text-[var(--color-text-muted,#94A3B8)] leading-tight">UYAP evraklarını indirmeden doğrudan masaüstüne çekin.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-bg-base,#0A101D)]/60 border border-[var(--color-divider,#222F46)]">
                  <div className="text-lg mb-1">🔒</div>
                  <h4 className="text-[12px] font-bold text-[var(--color-text,#FFFFFF)] mb-0.5">Uçtan Uca Gizlilik</h4>
                  <p className="text-[11px] text-[var(--color-text-muted,#94A3B8)] leading-tight">Verileriniz yerel şifreleme ile doğrudan bilgisayarınızda işlenir.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-bg-base,#0A101D)]/60 border border-[var(--color-divider,#222F46)]">
                  <div className="text-lg mb-1">⚖️</div>
                  <h4 className="text-[12px] font-bold text-[var(--color-text,#FFFFFF)] mb-0.5">Otomatik Ayrıştırma</h4>
                  <p className="text-[11px] text-[var(--color-text-muted,#94A3B8)] leading-tight">Tensip, dilekçe ve deliller otomatik olarak dava dosyanıza dizilir.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FEATURES SPOTLIGHT */}
          {step === 3 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#A78BFA] font-bold bg-[#A78BFA]/10 border border-[#A78BFA]/20 px-2.5 py-1 rounded-full">
                  3. Adım · Süper Güçler
                </span>
                <h1 className="text-[26px] font-extrabold text-[var(--color-text,#FFFFFF)] tracking-tight mt-3 mb-2">
                  Ayris Legal Neler Yapabilir? 🚀
                </h1>
                <p className="text-[14px] text-[var(--color-text-muted,#94A3B8)] leading-relaxed">
                  Büronuzun dava hazırlık ve araştırma süreçlerini 10 kat hızlandıracak 3 temel özellik:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Feature 1 */}
                <div className="bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] hover:border-[#3B82F6]/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] text-xl mb-3 group-hover:scale-105 transition-transform">
                      🔍
                    </div>
                    <h3 className="text-[15px] font-bold text-[var(--color-text,#FFFFFF)] mb-2">
                      18M+ İçtihat & Emsal Arama
                    </h3>
                    <p className="text-[12px] text-[var(--color-text-muted,#94A3B8)] leading-relaxed">
                      Yargıtay, Danıştay ve BAM kararlarında semantik ve madde bazlı tarama yaparak davanıza en uygun emsalleri bulun.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--color-divider,#222F46)] text-[10px] font-mono text-[#3B82F6]">
                    Hızlı ve Nokta Atışı
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] hover:border-[#00E699]/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#00E699]/10 border border-[#00E699]/30 flex items-center justify-center text-[#00E699] text-xl mb-3 group-hover:scale-105 transition-transform">
                      🤖
                    </div>
                    <h3 className="text-[15px] font-bold text-[var(--color-text,#FFFFFF)] mb-2">
                      AI Dilekçe & Belge Analizi
                    </h3>
                    <p className="text-[12px] text-[var(--color-text-muted,#94A3B8)] leading-relaxed">
                      Dava dilekçesini veya tensip zaptını yükleyin; sistem talepleri, savunma noktalarını ve dilekçe taslağını hazırlasın.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--color-divider,#222F46)] text-[10px] font-mono text-[#00E699]">
                    Kişiye Özel Strateji
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] hover:border-[#A78BFA]/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA] text-xl mb-3 group-hover:scale-105 transition-transform">
                      📚
                    </div>
                    <h3 className="text-[15px] font-bold text-[var(--color-text,#FFFFFF)] mb-2">
                      Mevzuat & Büro Şablonları
                    </h3>
                    <p className="text-[12px] text-[var(--color-text-muted,#94A3B8)] leading-relaxed">
                      1000+ kanun maddesini çevrimdışı okuyun, büronuzun özel şablonlarını yükleyip tek tıkla dilekçelere ekleyin.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--color-divider,#222F46)] text-[10px] font-mono text-[#A78BFA]">
                    Tam Entegre Kütüphane
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: READY TO GO */}
          {step === 4 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#00E699] font-bold bg-[#00E699]/10 border border-[#00E699]/20 px-2.5 py-1 rounded-full">
                  4. Adım · Başlangıç
                </span>
                <h1 className="text-[26px] font-extrabold text-[var(--color-text,#FFFFFF)] tracking-tight mt-3 mb-2">
                  Tebrikler, Hazırsınız! 🎉
                </h1>
                <p className="text-[14px] text-[var(--color-text-muted,#94A3B8)] leading-relaxed">
                  Çalışma alanınız hazırlandı. Nereden başlamak istersiniz?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  onClick={() => handleComplete('cases')}
                  className="p-4 rounded-2xl bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] hover:border-[#3B82F6] text-left transition-all group cursor-pointer shadow-sm hover:shadow-[#3B82F6]/10 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                    📁
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-text,#FFFFFF)] group-hover:text-[#60A5FA] transition-colors">
                      İlk Dava Dosyamı Oluştur
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted,#94A3B8)] leading-tight mt-0.5">
                      Evrakları yükleyin ve yapay zeka analizini başlatın.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleComplete('research')}
                  className="p-4 rounded-2xl bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] hover:border-[#00E699] text-left transition-all group cursor-pointer shadow-sm hover:shadow-[#00E699]/10 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#00E699]/10 border border-[#00E699]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                    🔍
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-text,#FFFFFF)] group-hover:text-[#00E699] transition-colors">
                      İçtihat & Emsal Araştırması Yap
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted,#94A3B8)] leading-tight mt-0.5">
                      18 milyon karar ve güncel mevzuat içinde arama yapın.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleComplete('drafting')}
                  className="p-4 rounded-2xl bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] hover:border-[#A78BFA] text-left transition-all group cursor-pointer shadow-sm hover:shadow-[#A78BFA]/10 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                    ✍️
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-text,#FFFFFF)] group-hover:text-[#A78BFA] transition-colors">
                      Hızlı Dilekçe Taslağı Hazırla
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted,#94A3B8)] leading-tight mt-0.5">
                      Yapay zeka asistanı ile hukuki gerekçeli dilekçe yazın.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleComplete('overview')}
                  className="p-4 rounded-2xl bg-[var(--color-bg-base,#0A101D)] border border-[var(--color-divider,#222F46)] hover:border-[#F59E0B] text-left transition-all group cursor-pointer shadow-sm hover:shadow-[#F59E0B]/10 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                    📊
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-text,#FFFFFF)] group-hover:text-[#FBBF24] transition-colors">
                      Genel Bakış Paneline Geç
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted,#94A3B8)] leading-tight mt-0.5">
                      Büronuzun takvimini ve aktif dosyalarını inceleyin.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* BOTTOM CONTROLS (Next / Back / Skip) */}
          <div className="flex items-center justify-between pt-6 border-t border-[var(--color-divider,#222F46)] mt-6">
            <div>
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="px-4 py-2 rounded-xl border border-[var(--color-divider,#222F46)] text-[var(--color-text-muted,#94A3B8)] hover:text-white text-[13px] font-mono font-medium transition-all cursor-pointer hover:bg-[var(--color-bg-base,#0A101D)]"
                >
                  ← Geri
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < 4 ? (
                <>
                  <button
                    onClick={() => handleComplete('overview')}
                    className="px-4 py-2 rounded-xl text-[var(--color-text-muted,#94A3B8)] hover:text-[var(--color-text,#FFFFFF)] text-[12px] font-mono transition-colors cursor-pointer"
                  >
                    Atla
                  </button>
                  <button
                    onClick={() => setStep((s) => Math.min(4, s + 1))}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] font-mono shadow-lg shadow-[#3B82F6]/25 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <span>Devam Et</span>
                    <span>→</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleComplete('overview')}
                  className="bg-[#00E699] hover:bg-[#00C885] text-[#052E23] px-6 py-2.5 rounded-xl font-bold text-[13px] font-mono shadow-lg shadow-[#00E699]/25 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Çalışma Alanına Başla</span>
                  <span>🚀</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
