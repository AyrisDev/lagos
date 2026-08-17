'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, KeyRound, Clock } from 'lucide-react';
import { startOrGetUpdateCheck } from '@/lib/updatePrefetch';
import { supabase } from '@/lib/supabase';

// Electron main sürecindeki 'license:*' IPC handler'ları (bkz. electron/main.js,
// electron/lib/licenseService.js) — renderer backend'e hiç doğrudan bağlanmıyor.
interface LicenseElectronApi {
  licenseValidate?: (email?: string) => Promise<{ valid: boolean; networkError?: boolean; needsActivation?: boolean; message?: string }>;
  licenseActivate?: (licenseKey: string, email?: string) => Promise<{ valid: boolean; networkError?: boolean; message?: string }>;
}

function getLicenseApi(): LicenseElectronApi | undefined {
  return (window as unknown as { electron?: LicenseElectronApi }).electron;
}

// Supabase profiles tablosundan trial bilgisini çek
async function fetchTrialInfo(): Promise<{ daysLeft: number; endDate: Date } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('license_status, trial_end_date')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.license_status !== 'trial' || !profile.trial_end_date) return null;

    const endDate = new Date(profile.trial_end_date);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    if (diffMs <= 0) return null; // Süresi dolmuş
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { daysLeft, endDate };
  } catch {
    return null;
  }
}

type GateState = 'checking' | 'valid' | 'trial-active' | 'needs-activation' | 'network-error' | 'not-electron';

// Uygulama, kullanıcı ana içeriği (Dava Dosyaları, Sohbet, hatta Giriş ekranı
// dahil) görmeden önce online lisans doğrulamasını tamamlar — bkz. PRD "Electron
// License System". Tarayıcıda (npm run dev, Electron dışında) çalışırken bu
// kontrol anlamsız olduğu için sessizce atlanır (geliştirme kolaylığı için).
import { usePathname } from 'next/navigation';

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<GateState>('checking');
  const [error, setError] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [trialExpanded, setTrialExpanded] = useState(false);

  const runValidate = useCallback(async () => {
    // Login sayfasındaysak lisans kontrolünü atla
    if (pathname === '/login') {
      setState('valid');
      return;
    }

    setState('checking');
    setError('');
    const api = getLicenseApi();
    if (!api?.licenseValidate) {
      // Electron dışında (tarayıcı/dev mod) — trial bilgisini Supabase'den al
      const trialInfo = await fetchTrialInfo();
      if (trialInfo) {
        setTrialDaysLeft(trialInfo.daysLeft);
        setState('trial-active');
      } else {
        setState('not-electron');
      }
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    // Kullanıcı henüz giriş yapmamışsa lisans sormaya gerek yok; uygulamanın (page.tsx) 
    // kullanıcıyı /login sayfasına yönlendirebilmesi için geçici olarak izin ver.
    if (!session) {
      setState('valid');
      return;
    }

    const email = session.user.email;

    const result = await api.licenseValidate(email);
    if (result.valid) {
      // Eğer geçerli bir lisans anahtarı (1 yıllık vb.) varsa trial badge göstermeyip doğrudan içeri alıyoruz
      setState('valid');
      return;
    }

    // Geçerli lisans anahtarı YOKSA Supabase'den trial günlerini kontrol et
    const trialInfo = await fetchTrialInfo();
    if (trialInfo) {
      setTrialDaysLeft(trialInfo.daysLeft);
      setState('trial-active');
      return;
    }
    if (result.networkError) {
      setError(result.message || 'İnternet bağlantısı gerekli. Lisansınız doğrulanamadı.');
      setState('network-error');
      return;
    }
    if (result.message) setError(result.message);
    setState('needs-activation');
  }, [pathname]);

  useEffect(() => {
    // Güncelleme kontrolünü lisans sonucunu beklemeden hemen ateşliyoruz —
    // UpdateGate (lisans geçerli olduktan sonra mount olacak) bunu tekrar
    // istemek yerine bu isteği bekleyecek. Sonucu burada kullanmıyoruz, hata
    // olsa da lisans akışını etkilemesin diye .catch ile yutuluyor.
    startOrGetUpdateCheck().catch(() => {});
    (async () => { await runValidate(); })();
  }, [runValidate]);


  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = licenseKey.trim();
    if (!trimmed || activating) return;
    setActivating(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;

      const api = getLicenseApi();
      const result = await api?.licenseActivate?.(trimmed, email);
      if (result?.valid) {
        setState('valid');
      } else {
        setError(result?.message || 'Lisans doğrulanamadı.');
      }
    } catch {
      setError('Lisans doğrulanamadı.');
    } finally {
      setActivating(false);
    }
  };

  // Trial aktif → uygulamayı göster, uyarıyı artık sidebar'da yapıyoruz
  if (state === 'trial-active') {
    return <>{children}</>;
  }

  if (state === 'valid' || state === 'not-electron') return <>{children}</>;

  if (state === 'checking') {
    return (
      <div className="flex h-screen bg-[#060b14] text-[#eef1f4] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
          <div className="text-sm text-gray-400">Lisans doğrulanıyor…</div>
        </div>
      </div>
    );
  }

  if (state === 'network-error') {
    return (
      <div className="flex h-screen bg-[#060b14] text-[#eef1f4] font-sans items-center justify-center">
        <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/logo-mark.png" alt="AyrisLegal" className="w-16 h-16 rounded-2xl mb-4 mx-auto" />
          <h1 className="text-xl font-bold tracking-tight text-white mb-3">Bağlantı Hatası</h1>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={runValidate}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl transition-all"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // needs-activation
  return (
    <div className="flex h-screen bg-[#060b14] text-[#eef1f4] font-sans selection:bg-teal-500/30 items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/logo-mark.png" alt="AyrisLegal" className="w-16 h-16 rounded-2xl mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">AyrisLegal</h1>
          <p className="text-gray-400 text-sm text-center">Lisans Aktivasyonu</p>
        </div>

        <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
          <p className="text-amber-400 text-sm font-medium">Deneme süreniz doldu</p>
          <p className="text-gray-400 text-xs mt-0.5">Kullanmaya devam etmek için lisans anahtarınızı girin</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Lisans anahtarınızı girin</label>
            <div className="relative">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                required
                disabled={activating}
                autoFocus
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-teal-500/50 focus:bg-white/10 transition-all text-white placeholder-gray-600 tracking-wider"
                placeholder="XXXX-XXXX-XXXX-XXXX"
              />
              <KeyRound className="w-5 h-5 text-gray-500 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={activating || !licenseKey.trim()}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-all mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Aktivasyon kontrol ediliyor…
              </>
            ) : (
              'Aktivasyonu Yap'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
