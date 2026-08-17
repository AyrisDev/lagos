'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    opts: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const toast = {
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
    info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
    warning: useCallback((msg: string) => addToast(msg, 'warning'), [addToast]),
  };

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ opts, resolve });
    });
  }, []);

  const handleConfirmClose = useCallback((result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  }, [confirmState]);

  // Escape key handler for confirmation modal
  useEffect(() => {
    if (!confirmState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleConfirmClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState, handleConfirmClose]);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-surface,#0F172A)] border border-[var(--color-divider,#334155)] text-[var(--color-text,#FFFFFF)] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <span className="text-base shrink-0">
              {t.type === 'success' && '✅'}
              {t.type === 'error' && '❌'}
              {t.type === 'warning' && '⚠️'}
              {t.type === 'info' && 'ℹ️'}
            </span>
            <span className="text-[13px] font-medium leading-snug flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer shrink-0"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Custom Confirmation Modal */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => handleConfirmClose(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--color-surface,#0C1324)] border border-[var(--color-divider,#1E293B)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  confirmState.opts.confirmVariant === 'danger'
                    ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                    : 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                }`}
              >
                {confirmState.opts.confirmVariant === 'danger' ? '⚠️' : '❓'}
              </div>
              <div className="flex-1">
                <h3 className="text-[16px] font-bold text-[var(--color-text,#FFFFFF)] tracking-tight leading-snug">
                  {confirmState.opts.title}
                </h3>
                <p className="text-[13px] text-[var(--color-text-muted,#94A3B8)] mt-1.5 leading-relaxed">
                  {confirmState.opts.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-divider,#1E293B)]">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[var(--color-text-muted,#94A3B8)] hover:text-[var(--color-text,#FFFFFF)] hover:bg-[var(--color-bg-glow,rgba(255,255,255,0.05))] transition-colors cursor-pointer"
              >
                {confirmState.opts.cancelText || 'İptal'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all shadow-md cursor-pointer ${
                  confirmState.opts.confirmVariant === 'danger'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                    : 'bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-blue-500/20'
                }`}
              >
                {confirmState.opts.confirmText || 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
