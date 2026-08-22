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
  const [step, setStep] = useState<number>(2); // Default preview to step 2 or 1
  const [fullName, setFullName] = useState<string>(initialFullName || '');
  const [officeName, setOfficeName] = useState<string>('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>(['is_tazminat', 'ticaret_sirket']);
  const [extensionInstalled, setExtensionInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (initialFullName) setFullName(initialFullName);
  }, [initialFullName]);

  // Reset to step 1 whenever modal is newly opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  // Listen to Chrome extension handshake message
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
      if (user && fullName.trim()) {
        await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
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
    const chromeUrl = 'https://chromewebstore.google.com/detail/ayris-legal-uyap-aktar%C4%B1/ayrislegal';
    if (typeof window !== 'undefined') {
      window.open(chromeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const stepsMeta = [
    { num: 1, title: 'Welcome', subtitle: 'Büro Profili' },
    { num: 2, title: 'Chrome Extension & UYAP Integration', subtitle: 'Kurulum & Eklenti' },
    { num: 3, title: 'Features Spotlight', subtitle: 'Temel Güçler' },
    { num: 4, title: 'Ready to Go', subtitle: 'Başlangıç' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#070A13]/85 backdrop-blur-xl animate-fadeIn">
      {/* Outer Glow & Main Modal Box */}
      <div className="relative w-full max-w-5xl bg-[#0C1222] border border-[#1E293B]/90 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col min-h-[580px] max-h-[92vh]">
        
        {/* Top subtle blue neon gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent z-10"></div>

        {/* TOP MODAL BAR */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-[#1E293B]/70 bg-[#090E1B]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse"></span>
            <span className="font-mono text-[12px] font-bold uppercase tracking-widest text-[#94A3B8]">
              AYRIS LEGAL ONBOARDING
            </span>
          </div>
          <button
            onClick={() => handleComplete('overview')}
            className="text-[#64748B] hover:text-white text-[19px] p-1 transition-colors cursor-pointer"
            title="Kapat"
          >
            ✕
          </button>
        </div>

        {/* MAIN BODY: 2 COLUMNS */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT SIDEBAR: STEPPER NAVIGATION */}
          <div className="w-full md:w-80 bg-[#090E1B]/80 border-b md:border-b-0 md:border-r border-[#1E293B]/70 p-6 sm:p-8 flex flex-col justify-between shrink-0">
            <div className="relative">
              
              {/* Vertical connecting line */}
              <div className="hidden md:block absolute left-[19px] top-6 bottom-6 w-[2px] bg-[#1E293B] -z-0"></div>

              <div className="flex flex-row md:flex-col gap-3 md:gap-5 relative z-10">
                {stepsMeta.map((s) => {
                  const isActive = step === s.num;
                  const isPassed = step > s.num;
                  return (
                    <div
                      key={s.num}
                      onClick={() => setStep(s.num)}
                      className={`relative flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#15203B] border border-[#3B82F6]/70 shadow-[0_0_30px_rgba(59,130,246,0.22)]'
                          : 'hover:bg-[#11182B] border border-transparent'
                      }`}
                    >
                      {/* Step Indicator Dot / Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-all ${
                          isActive
                            ? 'bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/50'
                            : isPassed
                            ? 'bg-[#00E699]/15 border border-[#00E699]/40 text-[#00E699]'
                            : 'bg-[#111827] border border-[#1E293B] text-[#64748B]'
                        }`}
                      >
                        {isPassed ? (
                          '✓'
                        ) : isActive ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ) : (
                          s.num
                        )}
                      </div>

                      {/* Step Label */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-[13.5px] font-bold leading-tight truncate ${
                              isActive
                                ? 'text-white'
                                : isPassed
                                ? 'text-[#CBD5E1]'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {s.num}. {s.title}
                          </p>
                          {isActive && (
                            <span className="text-[#3B82F6] text-xs font-mono font-bold ml-1">›</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* User Session Footer */}
            <div className="hidden md:block pt-6 border-t border-[#1E293B]/70">
              <p className="text-[10.5px] font-mono uppercase text-[#64748B] tracking-wider mb-1 font-semibold">Oturum</p>
              <p className="text-[12px] font-mono text-[#CBD5E1] truncate">{userEmail || 'Avukat Hesabı'}</p>
            </div>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col justify-between overflow-y-auto bg-[#0C1222]">
            
            {/* STEP 1: WELCOME & OFFICE PROFILE */}
            {step === 1 && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div>
                  <p className="text-[12px] font-mono text-[#64748B] mb-1">Step 1: Büro Yapılandırması</p>
                  <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-snug">
                    Ayris Legal&apos;e Hoş Geldiniz! ⚖️
                  </h1>
                  <p className="text-[13.5px] text-[#94A3B8] mt-1">
                    Yapay zeka asistanınızı ve şablonlarınızı büronuzun uzmanlık alanlarına göre özelleştirelim.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block mb-1.5 font-bold">
                      Avukat Adı Soyadı
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Av. Mehmet Yılmaz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block mb-1.5 font-bold">
                      Hukuk Bürosu Unvanı (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Yılmaz & Ortakları Hukuk Bürosu"
                      value={officeName}
                      onChange={(e) => setOfficeName(e.target.value)}
                      className="w-full bg-[#080D1A] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider block mb-2 font-bold flex items-center justify-between">
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
                              ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-white font-bold shadow-sm shadow-[#3B82F6]/10'
                              : 'bg-[#080D1A] border-[#1E293B] text-[#94A3B8] hover:border-[#3B82F6]/50 hover:text-white'
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

            {/* STEP 2: CHROME EXTENSION & UYAP INTEGRATION (EXACT MATCH TO DESIGN MOCKUP) */}
            {step === 2 && (
              <div className="flex flex-col gap-5 animate-fadeIn">
                <div>
                  <p className="text-[12px] font-mono text-[#64748B] mb-1">
                    Step 2: Kurulum ve Entegrasyon
                  </p>
                  <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-snug">
                    Chrome Eklentisi & UYAP Entegrasyonu
                  </h1>
                  <p className="text-[13.5px] text-[#94A3B8] mt-1">
                    Ayris&apos;i tarayıcınıza ekleyin ve UYAP verilerinizi tek tıkla uygulamaya aktarın.
                  </p>
                </div>

                {/* GRAPHIC CARD: CHROME STORE BADGE + UYAP VISUAL FLOW */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-[#080E1B] border border-[#1E293B] rounded-2xl p-5 sm:p-6 shadow-inner relative overflow-hidden">
                  
                  {/* Subtle background glow */}
                  <div className="absolute right-0 top-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

                  {/* Left part: Chrome Web Store Badge */}
                  <div className="lg:col-span-5 flex flex-col items-start justify-center gap-3 border-b lg:border-b-0 lg:border-r border-[#1E293B] pb-4 lg:pb-0 lg:pr-5">
                    <button
                      onClick={handleOpenChromeStore}
                      className="group w-full flex items-center gap-3.5 bg-[#121A2D] hover:bg-[#18233C] border border-[#2A3B5C] hover:border-[#3B82F6] p-3.5 rounded-2xl transition-all shadow-md text-left cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        {/* Chrome Logo */}
                        <svg className="w-full h-full" viewBox="0 0 192 192" fill="none">
                          <circle cx="96" cy="96" r="40" fill="#4285F4"/>
                          <path d="M96 56h83.14C163.66 23.36 132.32 0 96 0 59.68 0 28.34 23.36 12.86 56l41.57 72L96 56z" fill="#EA4335"/>
                          <path d="M12.86 56C4.66 70.2 0 82.58 0 96c0 36.32 23.36 67.66 56 83.14l41.57-72-43.14-74.86-41.57 23.72z" fill="#FBBC05"/>
                          <path d="M96 136l-41.57 23.72C70.2 187.34 82.58 192 96 192c53.02 0 96-42.98 96-96 0-13.42-4.66-25.8-12.86-40H96v40z" fill="#34A853"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-wider font-semibold">Available in the</p>
                        <p className="text-[14px] font-bold text-white group-hover:text-[#60A5FA] transition-colors leading-tight">
                          Chrome Web Store
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748B] pl-1">
                      <span className={`w-2 h-2 rounded-full ${extensionInstalled ? 'bg-[#00E699]' : 'bg-[#F59E0B]'}`}></span>
                      <span>{extensionInstalled ? 'Eklenti bağlı ve aktif ✓' : 'Kurulum 10 saniye sürer'}</span>
                    </div>
                  </div>

                  {/* Right part: Interactive UYAP -> Ayris Data Flow Visual */}
                  <div className="lg:col-span-7 flex flex-col items-center justify-center p-2">
                    <div className="w-full bg-[#11192A] border border-[#1E293B] rounded-xl p-3.5 shadow-lg relative overflow-hidden">
                      
                      {/* Browser header mockup */}
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1E293B]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80"></span>
                        </div>
                        <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#080D1A] border border-[#1E293B] text-[10px] font-mono text-[#94A3B8]">
                          <span>⚖️ vatandas.uyap.gov.tr</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] bg-[#3B82F6]/20 text-[#60A5FA] px-1.5 py-0.5 rounded font-mono font-bold border border-[#3B82F6]/30">
                            Ayris Extension
                          </span>
                        </div>
                      </div>

                      {/* Graphic Flow Representation */}
                      <div className="flex items-center justify-between gap-3 px-2 py-1">
                        
                        {/* UYAP Side */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-xs font-bold text-[#FCA5A5]">
                            UYAP
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-[11px] font-bold text-white">Avukat Portalı</p>
                            <p className="text-[9px] font-mono text-[#64748B]">Tensip & Evraklar</p>
                          </div>
                        </div>

                        {/* Animated Transfer Beam */}
                        <div className="flex-1 flex flex-col items-center justify-center px-2">
                          <div className="w-full flex items-center justify-center gap-1">
                            <span className="text-sm animate-bounce">📄</span>
                            <div className="h-[2px] flex-1 bg-gradient-to-r from-[#DC2626]/60 via-[#3B82F6] to-[#3B82F6] rounded-full"></div>
                            <span className="text-xs text-[#60A5FA]">➔</span>
                          </div>
                          <span className="text-[9px] font-mono text-[#3B82F6] mt-1 tracking-tight">Tek Tıkla Aktarım</span>
                        </div>

                        {/* Ayris Side */}
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] border border-[#60A5FA]/60 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                            A
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-[11px] font-bold text-[#60A5FA]">Ayris Masaüstü</p>
                            <p className="text-[9px] font-mono text-[#00E699]">AI Analiz Hazır</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    <p className="text-[11.5px] text-[#94A3B8] font-mono text-center mt-3">
                      UYAP dosyalarını tek tıkla Ayris&apos;e aktarın. Güvenli ve Hızlı Veri Transferi
                    </p>
                  </div>
                </div>

                {/* 3 Short Feature Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#080E1B] border border-[#1E293B]">
                    <h4 className="text-[12px] font-bold text-white mb-0.5">⚡ Hızlı Aktarım</h4>
                    <p className="text-[11px] text-[#94A3B8]">Evrakları tek tek indirmeden doğrudan panele çekin.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#080E1B] border border-[#1E293B]">
                    <h4 className="text-[12px] font-bold text-white mb-0.5">🔒 Güvenli Şifreleme</h4>
                    <p className="text-[11px] text-[#94A3B8]">Verileriniz yerel olarak bilgisayarınızda işlenir.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#080E1B] border border-[#1E293B]">
                    <h4 className="text-[12px] font-bold text-white mb-0.5">📑 Otomatik Dava Kartı</h4>
                    <p className="text-[11px] text-[#94A3B8]">Dava no, taraf ve tensip bilgileri anında ayrıştırılır.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: FEATURES SPOTLIGHT */}
            {step === 3 && (
              <div className="flex flex-col gap-5 animate-fadeIn">
                <div>
                  <p className="text-[12px] font-mono text-[#64748B] mb-1">Step 3: Özellik Turu</p>
                  <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-snug">
                    Ayris Legal&apos;in Süper Güçleri 🚀
                  </h1>
                  <p className="text-[13.5px] text-[#94A3B8] mt-1">
                    Büronuzun dava hazırlık ve araştırma süreçlerini hızlandıracak temel modüller:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Feature 1 */}
                  <div className="bg-[#080E1B] border border-[#1E293B] hover:border-[#3B82F6]/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] text-xl mb-3 group-hover:scale-105 transition-transform">
                        🔍
                      </div>
                      <h3 className="text-[15px] font-bold text-white mb-1.5">
                        18M+ İçtihat Arama
                      </h3>
                      <p className="text-[12px] text-[#94A3B8] leading-relaxed">
                        Yargıtay, Danıştay ve BAM kararlarında semantik tarama yaparak davanıza en uygun emsalleri bulun.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#1E293B] text-[10.5px] font-mono text-[#3B82F6]">
                      Semantik & Madde Motoru
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="bg-[#080E1B] border border-[#1E293B] hover:border-[#00E699]/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#00E699]/10 border border-[#00E699]/30 flex items-center justify-center text-[#00E699] text-xl mb-3 group-hover:scale-105 transition-transform">
                        🤖
                      </div>
                      <h3 className="text-[15px] font-bold text-white mb-1.5">
                        AI Dilekçe & Savunma
                      </h3>
                      <p className="text-[12px] text-[#94A3B8] leading-relaxed">
                        Tensip zaptını veya dava dosyasını yükleyin; sistem talepleri, savunma noktalarını ve dilekçe taslağını hazırlasın.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#1E293B] text-[10.5px] font-mono text-[#00E699]">
                      Hukuki Mantık Asistanı
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="bg-[#080E1B] border border-[#1E293B] hover:border-[#A78BFA]/60 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA] text-xl mb-3 group-hover:scale-105 transition-transform">
                        📚
                      </div>
                      <h3 className="text-[15px] font-bold text-white mb-1.5">
                        Mevzuat & Şablonlar
                      </h3>
                      <p className="text-[12px] text-[#94A3B8] leading-relaxed">
                        1000+ kanun maddesine çevrimdışı erişin, büronuzun özel şablonlarını yükleyip tek tıkla kullanın.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#1E293B] text-[10.5px] font-mono text-[#A78BFA]">
                      Kişiselleştirilmiş Kütüphane
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: READY TO GO */}
            {step === 4 && (
              <div className="flex flex-col gap-5 animate-fadeIn">
                <div>
                  <p className="text-[12px] font-mono text-[#64748B] mb-1">Step 4: Başlangıç</p>
                  <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-snug">
                    Tebrikler, Hazırsınız! 🎉
                  </h1>
                  <p className="text-[13.5px] text-[#94A3B8] mt-1">
                    Çalışma alanınız hazırlandı. Nereden başlamak istersiniz?
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={() => handleComplete('cases')}
                    className="p-4 rounded-2xl bg-[#080E1B] border border-[#1E293B] hover:border-[#3B82F6] text-left transition-all group cursor-pointer shadow-sm hover:shadow-[#3B82F6]/10 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      📁
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white group-hover:text-[#60A5FA] transition-colors">
                        İlk Dava Dosyamı Oluştur
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] leading-tight mt-0.5">
                        Evrakları yükleyin ve yapay zeka analizini başlatın.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleComplete('research')}
                    className="p-4 rounded-2xl bg-[#080E1B] border border-[#1E293B] hover:border-[#00E699] text-left transition-all group cursor-pointer shadow-sm hover:shadow-[#00E699]/10 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#00E699]/10 border border-[#00E699]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      🔍
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white group-hover:text-[#00E699] transition-colors">
                        İçtihat & Emsal Araştırması Yap
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] leading-tight mt-0.5">
                        18 milyon karar ve güncel mevzuat içinde arama yapın.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleComplete('drafting')}
                    className="p-4 rounded-2xl bg-[#080E1B] border border-[#1E293B] hover:border-[#A78BFA] text-left transition-all group cursor-pointer shadow-sm hover:shadow-[#A78BFA]/10 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      ✍️
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white group-hover:text-[#A78BFA] transition-colors">
                        Hızlı Dilekçe Taslağı Hazırla
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] leading-tight mt-0.5">
                        Yapay zeka asistanı ile hukuki gerekçeli dilekçe yazın.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleComplete('overview')}
                    className="p-4 rounded-2xl bg-[#080E1B] border border-[#1E293B] hover:border-[#F59E0B] text-left transition-all group cursor-pointer shadow-sm hover:shadow-[#F59E0B]/10 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      📊
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-white group-hover:text-[#FBBF24] transition-colors">
                        Genel Bakış Paneline Geç
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] leading-tight mt-0.5">
                        Büronuzun takvimini ve aktif dosyalarını inceleyin.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* BOTTOM CONTROLS (MATCHES DESIGN MOCKUP BUTTONS) */}
            <div className="flex items-center justify-between pt-6 border-t border-[#1E293B] mt-6">
              <div>
                {step > 1 && (
                  <button
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                    className="px-4 py-2.5 rounded-xl border border-[#1E293B] text-[#94A3B8] hover:text-white text-[12.5px] font-mono transition-all cursor-pointer hover:bg-[#080E1B]"
                  >
                    ← Geri
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {step === 2 ? (
                  <>
                    <button
                      onClick={handleOpenChromeStore}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] shadow-[0_0_25px_rgba(37,99,235,0.4)] transition-all cursor-pointer flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8a7.2 7.2 0 016.928 5.2h-6.928l-3.6-6.235A7.16 7.16 0 0112 4.8zm-7.2 7.2a7.16 7.16 0 012.072-5.064l3.6 6.235-3.6 6.235A7.16 7.16 0 014.8 12zm7.2 7.2a7.16 7.16 0 01-5.328-2.4l3.6-6.235 3.6 6.235A7.16 7.16 0 0112 19.2zm0-4.8a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8z" />
                      </svg>
                      <span>Chrome Eklentisini Kur</span>
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="px-5 py-2.5 rounded-xl border border-[#1E293B] hover:border-[#334155] bg-[#111827] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white text-[12.5px] font-semibold transition-all cursor-pointer"
                    >
                      Daha Sonra Hatırlat
                    </button>
                  </>
                ) : step < 4 ? (
                  <>
                    <button
                      onClick={() => handleComplete('overview')}
                      className="px-4 py-2.5 rounded-xl text-[#94A3B8] hover:text-white text-[12px] font-mono transition-colors cursor-pointer"
                    >
                      Atla
                    </button>
                    <button
                      onClick={() => setStep((s) => Math.min(4, s + 1))}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-xl font-bold text-[13px] shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all cursor-pointer flex items-center gap-2"
                    >
                      <span>Devam Et</span>
                      <span>→</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleComplete('overview')}
                    className="bg-[#00E699] hover:bg-[#00C885] text-[#052E23] px-6 py-2.5 rounded-xl font-bold text-[13px] font-mono shadow-[0_0_25px_rgba(0,230,153,0.35)] transition-all cursor-pointer flex items-center gap-2"
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
    </div>
  );
}
