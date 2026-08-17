'use client';

import { useEffect } from 'react';
import { reportRendererError } from './ErrorBoundary';

// React'in Error Boundary'si SADECE render/lifecycle sırasındaki hataları
// yakalar — event handler'larda veya async kodda (fetch .then, setTimeout vb.)
// atılan hatalar oraya hiç uğramaz. window.onerror/unhandledrejection bu
// boşluğu kapatıyor (PRD §12).
export default function GlobalErrorListeners() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : new Error(String(event.message || 'Unknown error'));
      reportRendererError(error, 'window-error');
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      reportRendererError(error, 'unhandled-rejection');
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
