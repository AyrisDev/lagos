'use client';

import React from 'react';

// Renderer'daki hataları main sürece (bkz. electron/lib/crashReporter.js) IPC
// ile iletir — renderer backend'e HİÇBİR ZAMAN doğrudan rapor göndermiyor,
// sanitizasyon/kuyruk/gönderim main process'te yapılıyor (PRD mimarisi).
interface CrashElectronApi {
  crashReport?: (payload: { eventType: string; severity: string; module: string; error: { name: string; message: string; stack?: string } }) => Promise<unknown>;
}

function getCrashApi(): CrashElectronApi | undefined {
  return (window as unknown as { electron?: CrashElectronApi }).electron;
}

export function reportRendererError(error: Error, module = 'ui') {
  const api = getCrashApi();
  api?.crashReport?.({
    eventType: 'crash',
    severity: 'fatal',
    module,
    error: { name: error.name, message: error.message, stack: error.stack },
  })?.catch(() => {});
}

interface State { hasError: boolean; }

// React Error Boundary'ler class component OLMAK ZORUNDA — hook'larla
// karşılığı yok (componentDidCatch/getDerivedStateFromError).
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportRendererError(error, 'react-render');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen bg-[#060b14] text-[#eef1f4] font-sans items-center justify-center">
          <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
            <h1 className="text-xl font-bold tracking-tight text-white mb-2">Beklenmeyen bir hata oluştu</h1>
            <p className="text-gray-400 text-sm mb-6">Hata raporu anonim olarak gönderildi.</p>
            <div className="flex gap-3">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl transition-all"
              >
                Tekrar Dene
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-all"
              >
                Uygulamayı Yenile
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
