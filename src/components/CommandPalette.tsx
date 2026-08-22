'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View } from '@/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: View) => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectView,
  onToggleTheme,
  onSignOut,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: CommandItem[] = useMemo(
    () => [
      // Sayfalar
      {
        id: 'nav-overview',
        title: 'Genel Bakış (Komuta Merkezi)',
        category: 'Sayfalar & Modüller',
        icon: '📊',
        shortcut: 'G',
        action: () => onSelectView('overview'),
      },
      {
        id: 'nav-cases',
        title: 'Dava Dosyaları & Arşiv',
        category: 'Sayfalar & Modüller',
        icon: '📁',
        shortcut: 'D',
        action: () => onSelectView('cases'),
      },
      {
        id: 'nav-research',
        title: 'İçtihat Arama (Yargıtay, Danıştay, BAM)',
        category: 'Sayfalar & Modüller',
        icon: '🔍',
        shortcut: 'I',
        action: () => onSelectView('research'),
      },
      {
        id: 'nav-drafting',
        title: 'Dilekçe Hazırlama Stüdyosu',
        category: 'Sayfalar & Modüller',
        icon: '✍️',
        shortcut: 'L',
        action: () => onSelectView('drafting'),
      },
      {
        id: 'nav-calendar',
        title: 'Duruşma Takvimi & Süreler',
        category: 'Sayfalar & Modüller',
        icon: '📅',
        shortcut: 'T',
        action: () => onSelectView('calendar'),
      },
      {
        id: 'nav-templates',
        title: 'Hukuki Belge & Dilekçe Şablonları',
        category: 'Sayfalar & Modüller',
        icon: '📝',
        shortcut: 'S',
        action: () => onSelectView('templates'),
      },
      {
        id: 'nav-clients',
        title: 'Müvekkiller & Cari Hesaplar',
        category: 'Sayfalar & Modüller',
        icon: '👥',
        shortcut: 'M',
        action: () => onSelectView('clients'),
      },
      {
        id: 'nav-chat',
        title: 'AyrisLegal Hukuki Yapay Zeka Sohbeti',
        category: 'Sayfalar & Modüller',
        icon: '💬',
        shortcut: 'A',
        action: () => onSelectView('chat'),
      },
      {
        id: 'nav-settings',
        title: 'Ayarlar & Sistem Yapılandırması',
        category: 'Sayfalar & Modüller',
        icon: '⚙️',
        action: () => onSelectView('settings'),
      },

      // Hızlı Aksiyonlar
      {
        id: 'act-onboarding',
        title: 'Başlangıç Rehberi & UYAP Chrome Eklentisi',
        category: 'Hızlı İşlemler',
        icon: '🚀',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-onboarding'));
        },
      },
      {
        id: 'act-tutorials',
        title: 'Kullanım & Video Eğitimleri (Akademi)',
        category: 'Hızlı İşlemler',
        icon: '🎓',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-tutorials'));
        },
      },
      {
        id: 'act-theme',
        title: 'Temayı Değiştir (Açık / Koyu Mod)',
        category: 'Hızlı İşlemler',
        icon: '🌓',
        action: onToggleTheme,
      },
      {
        id: 'act-logout',
        title: 'Oturumu Kapat / Çıkış Yap',
        category: 'Hızlı İşlemler',
        icon: '🚪',
        action: onSignOut,
      },
    ],
    [onSelectView, onToggleTheme, onSignOut]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] bg-black/75 backdrop-blur-md flex items-start justify-center pt-20 sm:pt-28 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[var(--color-surface,#0C1324)] border border-[var(--color-divider,#1E293B)] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-divider,#1E293B)] bg-[var(--color-bg-base,#080D1A)]">
          <span className="text-slate-400 text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Bir sayfa veya komut arayın... (Örn: Dava, Dilekçe, İçtihat, Tema)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[14px] text-[var(--color-text,#FFFFFF)] placeholder:text-[var(--color-text-muted,#64748B)] outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              Temizle
            </button>
          )}
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--color-surface,#151C2C)] border border-[var(--color-divider,#1E293B)] text-[var(--color-text-muted,#8C9BB4)]">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1 cyber-juris-scroll">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-[13px] font-mono text-[var(--color-text-muted,#64748B)]">
              Sonuç bulunamadı.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#3B82F6] text-white font-semibold shadow-md shadow-blue-500/20'
                      : 'text-[var(--color-text,#CBD5E1)] hover:bg-[var(--color-bg-glow,rgba(255,255,255,0.05))]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <span className="text-[13px] truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-700/50 text-blue-100'
                          : 'bg-[var(--color-bg-base,#080D1A)] text-[var(--color-text-muted,#64748B)] border border-[var(--color-divider,#1E293B)]'
                      }`}
                    >
                      {item.category}
                    </span>
                    {isSelected && (
                      <span className="text-[11px] font-mono opacity-80">↵</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-[var(--color-divider,#1E293B)] bg-[var(--color-bg-base,#080D1A)] flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted,#64748B)]">
          <div className="flex items-center gap-3">
            <span>↑↓ Gezin</span>
            <span>↵ Seç</span>
            <span>ESC Kapat</span>
          </div>
          <span className="text-[#3B82F6] font-semibold">AyrisLegal Spotlight</span>
        </div>
      </div>
    </div>
  );
}
