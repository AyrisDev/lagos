'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Download, RotateCw } from 'lucide-react';
import { startOrGetUpdateCheck } from '@/lib/updatePrefetch';

// Electron main sürecindeki 'update:*' IPC handler'ları (bkz. electron/main.js,
// electron/lib/updateService.js). Asıl indirme/kurulum electron-updater'da
// yapılıyor — burası sadece PRD'nin istediği özel UI'ı (mandatory/release notes/
// ilerleme) sürüyor.
interface UpdateCheckResult {
  checked: boolean;
  dev?: boolean;
  networkError?: boolean;
  updateAvailable?: boolean;
  version?: string | null;
  mandatory?: boolean;
  releaseNotes?: string[];
}

interface UpdateElectronApi {
  updateCheck?: () => Promise<UpdateCheckResult>;
  updateDownload?: () => Promise<{ started: boolean; error?: string }>;
  updateInstall?: () => Promise<void>;
  onUpdateDownloadProgress?: (cb: (data: { percent: number; transferred: number; total: number }) => void) => () => void;
  onUpdateDownloaded?: (cb: () => void) => () => void;
  onUpdateError?: (cb: (data: { message: string }) => void) => () => void;
}

function getUpdateApi(): UpdateElectronApi | undefined {
  return (window as unknown as { electron?: UpdateElectronApi }).electron;
}

function formatBytes(n: number): string {
  if (!n || n <= 0) return '0 MB';
  const mb = n / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

type Phase = 'checking' | 'idle' | 'prompt' | 'downloading' | 'ready' | 'error';

// LicenseGate'in İÇİNE yerleştiriliyor (bkz. layout.tsx) — bu yüzden burası
// sadece lisans zaten geçerliyken mount olur, PRD'nin istediği "License Valid
// → Update Check" sırası böyle sağlanıyor. Lisans sistemine dokunmuyoruz.
export default function UpdateGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [version, setVersion] = useState<string | null>(null);
  const [mandatory, setMandatory] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);
  const [progress, setProgress] = useState({ percent: 0, transferred: 0, total: 0 });
  const [error, setError] = useState('');
  const mandatoryRef = useRef(false);
  // Bazı sürümler content-length header'ı olmadan Storage'dan servis ediliyor
  // (bkz. builder-util-runtime/httpExecutor.js configurePipes) — bu durumda
  // electron-updater 'download-progress' olayını HİÇ ateşlemiyor, dosya arka
  // planda düzgün iniyor ama çubuk sonsuza dek 0%'de donuk görünüyor. Birkaç
  // saniye içinde hiç ilerleme gelmezse belirsiz (indeterminate) göstergeye
  // geçip kullanıcıya "donmuş" değil "ilerleme gösterilemiyor" mesajı veriyoruz.
  const [indeterminate, setIndeterminate] = useState(false);

  const startDownload = useCallback(async () => {
    setPhase('downloading');
    setError('');
    setIndeterminate(false);
    setProgress({ percent: 0, transferred: 0, total: 0 });
    const api = getUpdateApi();
    const result = await api?.updateDownload?.();
    if (result && result.started === false && !result.error) {
      // Electron dışında (tarayıcıda) ya da dev modda — indirme hiç başlamadı,
      // engellemenin bir anlamı yok.
      setPhase('idle');
    }
  }, []);

  // 'downloading' fazına girdikten 2.5sn sonra hâlâ hiç 'download-progress'
  // gelmediyse (content-length'siz sürüm), belirsiz göstergeye geç.
  useEffect(() => {
    if (phase !== 'downloading') return;
    const timer = setTimeout(() => {
      setProgress((p) => {
        if (p.total === 0 && p.transferred === 0) setIndeterminate(true);
        return p;
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    let active = true;
    (async () => {
      const api = getUpdateApi();
      if (!api?.updateCheck) {
        setPhase('idle');
        return;
      }
      // LicenseGate mount olur olmaz bu isteği zaten ateşlemişti (bkz.
      // src/lib/updatePrefetch.ts) — burada tekrar network isteği atmak
      // yerine o isteğin sonucunu bekliyoruz, muhtemelen zaten gelmiştir.
      const result = await startOrGetUpdateCheck();
      if (!active) return;

      // Kontrol başarısız oldu (dev modu, ağ hatası, sunucuya ulaşılamadı) —
      // PRD §24: bu tek başına uygulamanın açılmasını engellememeli.
      if (!result.checked || !result.updateAvailable) {
        setPhase('idle');
        return;
      }

      setVersion(result.version || null);
      setMandatory(!!result.mandatory);
      mandatoryRef.current = !!result.mandatory;
      setReleaseNotes(result.releaseNotes || []);

      if (result.mandatory) {
        // Zorunlu güncellemede kullanıcıya seçim sunulmuyor, indirme hemen başlıyor.
        startDownload();
      } else {
        setPhase('prompt');
      }
    })();
    return () => { active = false; };
  }, [startDownload]);

  useEffect(() => {
    const api = getUpdateApi();
    const offProgress = api?.onUpdateDownloadProgress?.((data) => {
      setIndeterminate(false);
      setProgress(data);
    });
    const offDownloaded = api?.onUpdateDownloaded?.(() => setPhase('ready'));
    const offError = api?.onUpdateError?.((data) => {
      setError(data.message || 'Son güncelleme indirilemedi.');
      // Zorunlu değilse hata kullanıcıyı uygulamadan alıkoymamalı (PRD §23).
      setPhase(mandatoryRef.current ? 'error' : 'idle');
    });
    return () => {
      offProgress?.();
      offDownloaded?.();
      offError?.();
    };
  }, []);

  const handleInstall = () => {
    getUpdateApi()?.updateInstall?.();
  };

  if (phase === 'checking' || phase === 'idle') return <>{children}</>;

  return (
    <div className="flex h-screen bg-[#060b14] text-[#eef1f4] font-sans items-center justify-center">
      <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
        {phase === 'prompt' && (
          <>
            <h1 className="text-xl font-bold tracking-tight text-white mb-1">Yeni güncelleme mevcut</h1>
            <p className="text-gray-400 text-sm mb-4">Yeni sürüm: <span className="text-white font-medium">{version}</span></p>
            {releaseNotes.length > 0 && (
              <ul className="text-sm text-gray-300 space-y-1 mb-6 list-disc list-inside">
                {releaseNotes.map((note, i) => <li key={i}>{note}</li>)}
              </ul>
            )}
            <div className="flex gap-3">
              <button
                onClick={startDownload}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" /> Güncellemeyi İndir
              </button>
              <button
                onClick={() => setPhase('idle')}
                className="px-4 py-3 rounded-xl text-gray-400 hover:text-white transition-colors text-sm"
              >
                Daha Sonra
              </button>
            </div>
          </>
        )}

        {phase === 'downloading' && (
          <>
            <h1 className="text-xl font-bold tracking-tight text-white mb-1">Güncelleme indiriliyor…</h1>
            <p className="text-gray-400 text-sm mb-6">{version}</p>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              {indeterminate ? (
                <div className="h-full w-1/3 bg-teal-500 rounded-full animate-[indeterminate_1.2s_ease-in-out_infinite]" />
              ) : (
                <div className="h-full bg-teal-500 transition-all" style={{ width: `${Math.round(progress.percent)}%` }} />
              )}
            </div>
            {indeterminate ? (
              <p className="text-xs text-gray-500">İlerleme yüzdesi bu sürüm için gösterilemiyor, indirme arka planda sürüyor — birkaç dakika sürebilir.</p>
            ) : (
              <div className="flex justify-between text-xs text-gray-500">
                <span>{Math.round(progress.percent)}%</span>
                <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total)}</span>
              </div>
            )}
            {mandatory && <p className="text-xs text-gray-500 mt-6 text-center">Bu, atlanamayan zorunlu bir güncellemedir.</p>}
          </>
        )}

        {phase === 'ready' && (
          <>
            <h1 className="text-xl font-bold tracking-tight text-white mb-2">Güncelleme hazır</h1>
            <p className="text-gray-400 text-sm mb-6">AyrisLegal yeniden başlatılarak güncellenecek.</p>
            <button
              onClick={handleInstall}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-all"
            >
              <RotateCw className="w-4 h-4" /> Yeniden Başlat ve Güncelle
            </button>
          </>
        )}

        {phase === 'error' && (
          <>
            <h1 className="text-xl font-bold tracking-tight text-white mb-2">Son güncelleme indirilemedi</h1>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={startDownload}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 transition-all"
            >
              <Loader2 className="w-4 h-4" /> Tekrar Dene
            </button>
          </>
        )}
      </div>
    </div>
  );
}
