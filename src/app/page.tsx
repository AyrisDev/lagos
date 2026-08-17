'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { DS, Icon, NAV_ITEMS } from '@/lib/constants';
import { CurrentUser, View, Theme } from '@/types';

import { Overview } from '@/components/views/Overview';

import { Cases } from '@/components/views/Cases';
import { Research } from '@/components/views/Research';
import { Drafting } from '@/components/views/Drafting';
import { CalendarView } from '@/components/views/CalendarView';
import { Templates } from '@/components/views/Templates';

import { Clients } from '@/components/views/Clients';
import { Chat } from '@/components/views/Chat';
import { Settings } from '@/components/views/Settings';
import { ToastProvider } from '@/components/ToastProvider';
import { CommandPalette } from '@/components/CommandPalette';


export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>('overview');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tema: varsayılan koyu (dark). document üzerindeki data-theme, layout.tsx'teki
  // erken init script'i tarafından ilk boyamadan önce zaten set ediliyor;
  // burada sadece o değeri okuyup state'e alıyoruz (lazy initializer — efekt yok).
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'dark';
    return (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';
  });

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ayrislegal-theme', next); } catch { }
  };

  // Kenar çubuğu daraltma — sadece ikonların göründüğü dar moda geçer.
  // Tercih localStorage'da kalıcı (her açılışta aynı durumda başlasın diye).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('ayrislegal-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('ayrislegal-sidebar-collapsed', next ? '1' : '0'); } catch { }
      return next;
    });
  };

  useEffect(() => {
    let active = true;

    // Plan/abonelik durumu artık ayrı PC-lisans sistemi (LicenseGate, bkz.
    // layout.tsx) tarafından uygulamaya girişte zaten doğrulanıyor — buraya
    // kadar gelindiyse lisans geçerli demektir. Eskiden burada "kayıttan 3 gün
    // sonra deneme biter" şeklinde ayrı, çakışan bir kontrol vardı; kaldırıldı.
    const loadUser = async (user: User) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (active) setCurrentUser({ email: user.email ?? '', fullName: profile?.full_name ?? null });
    };

    // Electron ana sürecine (yerel UYAP köprü sunucusu için) oturum token'ını ilet.
    // window.electron sadece Electron içinde var — tarayıcıda (npm run dev) sessizce atlanır.
    const syncAuthToken = (token: string | null) => {
      (window as unknown as { electron?: { setAuthToken?: (t: string | null) => void } }).electron?.setAuthToken?.(token);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (!session) {
        syncAuthToken(null);
        router.push('/login');
        return;
      }
      loadUser(session.user);
      syncAuthToken(session.access_token);
      setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUser(null);
        syncAuthToken(null);
        router.push('/login');
      } else {
        loadUser(session.user);
        syncAuthToken(session.access_token);
      }
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, [router]);

  const handleSignOut = async () => {
    // Clear device license cache before signing out
    const win = window as unknown as Record<string, { license?: { clear?: () => Promise<void> } }>;
    if (typeof window !== 'undefined' && win.electron?.license?.clear) {
      await win.electron.license.clear();
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Ziyaret edilen görünümleri bellekte (DOM'da) tutarak arka plandaki işlemleri
  // (Asistan yapay zeka yanıt akışı, dilekçe oluşturma, arama sonuçları vb.)
  // ekranlar arası geçişte kesintiye uğramadan devam ettiriyoruz.
  const [visitedViews, setVisitedViews] = useState<Set<View>>(() => new Set(['overview']));

  useEffect(() => {
    setVisitedViews(prev => {
      if (prev.has(view)) return prev;
      const next = new Set(prev);
      next.add(view);
      return next;
    });
  }, [view]);

  if (isCheckingAuth) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: DS.bg, color: DS.text, fontFamily: '"Inter", system-ui, sans-serif' }}>
        Yükleniyor…
      </div>
    );
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', height: '100vh', background: DS.bg, color: DS.text, fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: sidebarCollapsed ? 64 : 252,
          flexShrink: 0,
          borderRight: '1px solid var(--sidebar-border, #1E293B)',
          background: 'var(--sidebar-bg, #0C1324)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          transition: 'background 0.2s ease, border-color 0.2s ease'
        }}>
          <div>
            {/* Brand */}
            <div style={{
              padding: sidebarCollapsed ? '20px 0 12px' : '24px 16px 16px',
              borderBottom: '1px solid var(--sidebar-border, #1E293B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: 10
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/logo-mark.png" alt="AyrisLegal" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
              {!sidebarCollapsed && (
                <div style={{ fontFamily: '"Archivo",system-ui,sans-serif', fontWeight: 800, fontSize: 20, letterSpacing: '-0.01em', color: 'var(--color-text, #FFFFFF)' }}>AyrisLegal</div>
              )}
            </div>

            {/* Daralt/Genişlet */}
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-end', gap: 6,
                width: '100%', padding: sidebarCollapsed ? '8px 0' : '8px 16px', border: 'none', borderBottom: '1px solid var(--sidebar-border, #1E293B)',
                background: 'transparent', cursor: 'pointer', color: 'var(--sidebar-text, #94A3B8)', opacity: 0.8, font: 'inherit',
              }}
            >
              {sidebarCollapsed ? Icon.chevR : <>{Icon.chevL}<span style={{ fontSize: 11 }}>Daralt</span></>}
            </button>

            {/* Spotlight / Command Search Bar Button */}
            <div style={{ padding: sidebarCollapsed ? '8px 6px' : '10px 10px 4px' }}>
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                title="Hızlı Arama & Komutlar (Cmd+K)"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: sidebarCollapsed ? '8px 0' : '7px 10px',
                  justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                  borderRadius: 8, border: '1px solid var(--sidebar-border, #1E293B)',
                  background: 'var(--color-bg-base, #080D1A)', color: 'var(--sidebar-text, #94A3B8)',
                  cursor: 'pointer', fontSize: 12, transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔍</span>
                  {!sidebarCollapsed && <span>Hızlı Ara...</span>}
                </div>
                {!sidebarCollapsed && (
                  <span style={{ fontSize: 10, fontFamily: 'monospace', padding: '1px 5px', borderRadius: 4, background: 'var(--color-surface, #151C2C)', border: '1px solid var(--color-divider, #1E293B)' }}>
                    ⌘K
                  </span>
                )}
              </button>
            </div>

            {/* Nav */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 8px' }}>
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => setView(item.id)} title={sidebarCollapsed ? item.label : undefined} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600,
                  color: view === item.id ? 'var(--sidebar-active-text, #FFFFFF)' : 'var(--sidebar-text, #94A3B8)',
                  background: view === item.id ? 'var(--sidebar-active-bg, #3B82F6)' : 'transparent',
                  borderRadius: '8px', marginBottom: '4px',
                  textAlign: 'left', width: '100%', transition: 'all 0.15s ease'
                }}>
                  {item.icon}{!sidebarCollapsed && item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Controls & User */}
          <div>
            {/* Quick Theme Toggle Button */}
            <div style={{ padding: sidebarCollapsed ? '8px 4px' : '8px 12px', borderTop: '1px solid var(--sidebar-border, #1E293B)' }}>
              <button
                onClick={toggleTheme}
                title={theme === 'light' ? 'Koyu Temaya Geç' : 'Açık Temaya Geç'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: sidebarCollapsed ? '8px 0' : '8px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  border: '1px solid var(--sidebar-border, #1E293B)', cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 600,
                  color: 'var(--color-text, #E2E8F0)',
                  background: 'var(--color-neutral-100, rgba(255,255,255,0.05))',
                  borderRadius: '8px', width: '100%', transition: 'all 0.15s ease'
                }}
              >
                {theme === 'light' ? Icon.moon : Icon.sun}
                {!sidebarCollapsed && <span>{theme === 'light' ? 'Koyu Mod' : 'Aydınlık Mod'}</span>}
              </button>
            </div>

            {/* User Profile */}
            <div style={{ padding: sidebarCollapsed ? '16px 0' : 16, borderTop: '1px solid var(--sidebar-border, #1E293B)', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 10 }}>
              <div
                onClick={sidebarCollapsed ? handleSignOut : undefined}
                title={sidebarCollapsed ? `${currentUser?.fullName || currentUser?.email || 'Kullanıcı'} — çıkış yap` : undefined}
                style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'var(--color-accent, #3B82F6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, cursor: sidebarCollapsed ? 'pointer' : 'default' }}
              >
                {(currentUser?.fullName || currentUser?.email || '?').slice(0, 2).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text, #FFFFFF)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser?.fullName || currentUser?.email || 'Kullanıcı'}
                  </div>
                  <div
                    onClick={handleSignOut}
                    style={{ fontSize: 11, color: 'var(--color-text-muted, #64748B)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                  >
                    Çıkış yap
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100%' }}>

          {/* Content (Views persist in background) */}
          {visitedViews.has('overview') && (
            <div style={{ display: view === 'overview' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '24px', overflowY: 'auto' }}>
              <Overview setView={setView} />
            </div>
          )}

          {visitedViews.has('cases') && (
            <div style={{ display: view === 'cases' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '24px', overflowY: 'auto' }}>
              <Cases />
            </div>
          )}

          {visitedViews.has('research') && (
            <div style={{ display: view === 'research' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '16px', overflowY: 'hidden' }}>
              <Research />
            </div>
          )}

          {visitedViews.has('drafting') && (
            <div style={{ display: view === 'drafting' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '16px', overflowY: 'hidden' }}>
              <Drafting />
            </div>
          )}

          {visitedViews.has('calendar') && (
            <div style={{ display: view === 'calendar' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '24px', overflowY: 'auto' }}>
              <CalendarView />
            </div>
          )}

          {visitedViews.has('templates') && (
            <div style={{ display: view === 'templates' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '24px', overflowY: 'auto' }}>
              <Templates />
            </div>
          )}

          {visitedViews.has('clients') && (
            <div style={{ display: view === 'clients' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '24px', overflowY: 'auto' }}>
              <Clients />
            </div>
          )}

          {visitedViews.has('chat') && (
            <div style={{ display: view === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '16px', overflowY: 'hidden' }}>
              <Chat />
            </div>
          )}

          {visitedViews.has('settings') && (
            <div style={{ display: view === 'settings' ? 'flex' : 'none', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, padding: '24px', overflowY: 'auto' }}>
              <Settings currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} handleSignOut={handleSignOut} />
            </div>
          )}
        </div>

        {/* Global Spotlight / Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectView={setView}
          onToggleTheme={toggleTheme}
          onSignOut={handleSignOut}
        />
      </div>
    </ToastProvider>
  );
}
