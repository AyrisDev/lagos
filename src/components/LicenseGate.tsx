'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { startOrGetUpdateCheck } from '@/lib/updatePrefetch';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

// Supabase profiles tablosundan plan durumunu çeker.
// - 'active': Web sitesinden satın alınmış veya admin tarafından aktifleştirilmiş.
// - 'trial': Deneme süresi devam ediyor.
// - null: Deneme süresi dolmuş veya henüz kayıt yok.
async function fetchPlanStatus(): Promise<{ status: 'active' | 'trial' | null; daysLeft?: number }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { status: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('license_status, license_expires_at, trial_end_date')
      .eq('id', session.user.id)
      .single();

    if (!profile) return { status: null };

    if (profile.license_status === 'active') {
      if (profile.license_expires_at && new Date(profile.license_expires_at).getTime() <= Date.now()) {
        return { status: null };
      }
      return { status: 'active' };
    }

    if (profile.license_status === 'trial' && profile.trial_end_date) {
      const diffMs = new Date(profile.trial_end_date).getTime() - Date.now();
      if (diffMs > 0) {
        return { status: 'trial', daysLeft: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) };
      }
    }

    return { status: null };
  } catch {
    return { status: null };
  }
}

type GateState = 'checking' | 'valid' | 'trial-active' | 'expired';

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<GateState>('checking');

  const runCheck = useCallback(async () => {
    // Login sayfasında plan kontrolü gerekmez
    if (pathname === '/login') {
      setState('valid');
      return;
    }

    setState('checking');

    const { data: { session } } = await supabase.auth.getSession();
    // Oturum yoksa page.tsx /login'e yönlendirir, burada geçici izin
    if (!session) {
      setState('valid');
      return;
    }

    const { status } = await fetchPlanStatus();

    if (status === 'active') {
      setState('valid');
    } else if (status === 'trial') {
      setState('trial-active');
    } else {
      setState('expired');
    }
  }, [pathname]);

  useEffect(() => {
    // Güncelleme kontrolünü lisans sonucunu beklemeden hemen başlat
    startOrGetUpdateCheck().catch(() => {});
    runCheck();
  }, [runCheck]);

  // Trial ve valid: uygulamayı göster (trial badge sidebar'da yönetiliyor)
  if (state === 'valid' || state === 'trial-active') {
    return <>{children}</>;
  }

  if (state === 'checking') {
    return (
      <div className="flex h-screen bg-[#060b14] text-[#eef1f4] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
          <div className="text-sm text-gray-400">Yükleniyor…</div>
        </div>
      </div>
    );
  }

  // expired — web'den satın alma ekranı
  return (
    <div className="flex h-screen bg-[#060b14] text-[#eef1f4] font-sans items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/logo-mark.png" alt="AyrisLegal" className="w-16 h-16 rounded-2xl mb-4 mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Deneme Süreniz Doldu</h1>
        <p className="text-gray-400 text-sm mb-8">
          Ayris Legal&apos;i kullanmaya devam etmek için{' '}
          <strong className="text-white">ayrislegal.com</strong> üzerinden bir plan satın alın.
          Satın almanız otomatik olarak hesabınıza tanımlanır.
        </p>
        <button
          onClick={() => {
            const win = window as unknown as { electron?: { openUrl?: (url: string) => void } };
            if (win.electron?.openUrl) {
              win.electron.openUrl('https://ayrislegal.com/pricing');
            } else {
              window.open('https://ayrislegal.com/pricing', '_blank');
            }
          }}
          className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-all mb-3"
        >
          Plan Satın Al →
        </button>
        <button
          onClick={runCheck}
          className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-all"
        >
          Satın aldıysanız yenile
        </button>
      </div>
    </div>
  );
}
