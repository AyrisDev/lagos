'use client';

import { useEffect, useState } from 'react';

// Electron main sürecindeki 'crash:*' IPC handler'ları (bkz. electron/main.js,
// electron/lib/crashReporter.js).
interface SafeModeElectronApi {
  crashGetSafeModePrompt?: () => Promise<boolean>;
  crashResolveSafeMode?: (enterSafeMode: boolean) => Promise<void>;
}

function getApi(): SafeModeElectronApi | undefined {
  return (window as unknown as { electron?: SafeModeElectronApi }).electron;
}

type Phase = 'checking' | 'idle' | 'prompt';

// En dıştaki gate (layout.tsx'te LicenseGate'den bile önce) — kısa süre
// içinde art arda birden fazla çökme tespit edildiyse (bkz. crashReporter.js
// recordCrash), uygulama otomatik yedekleme/güncelleme kontrolünü atlayıp
// kullanıcıya seçim sunuyor (PRD §35-36).
export default function SafeModeGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking');

  useEffect(() => {
    (async () => {
      const api = getApi();
      if (!api?.crashGetSafeModePrompt) {
        setPhase('idle');
        return;
      }
      const needsPrompt = await api.crashGetSafeModePrompt();
      setPhase(needsPrompt ? 'prompt' : 'idle');
    })();
  }, []);

  const resolve = async (enterSafeMode: boolean) => {
    await getApi()?.crashResolveSafeMode?.(enterSafeMode);
    setPhase('idle');
  };

  if (phase === 'checking') return null; // anlık kontrol, boş ekran flaşı önemsiz
  if (phase === 'idle') return <>{children}</>;

  return (
    <div className="flex h-screen bg-[#060b14] text-[#eef1f4] font-sans items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
        <h1 className="text-xl font-bold tracking-tight text-white mb-2">AyrisLegal beklenmedik şekilde tekrar tekrar kapanıyor</h1>
        <p className="text-gray-400 text-sm mb-6">
          Sorunu atlatmak için güvenli modda başlatabilirsiniz — bu oturumda otomatik yedekleme ve güncelleme kontrolü çalışmaz.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => resolve(false)}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-all"
          >
            Normal Başlat
          </button>
          <button
            onClick={() => resolve(true)}
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl transition-all"
          >
            Güvenli Modda Başlat
          </button>
        </div>
      </div>
    </div>
  );
}
