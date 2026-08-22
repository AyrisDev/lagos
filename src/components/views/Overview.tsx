import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { View, CaseRow, CalendarEventRow } from '@/types';
import { formatRelativeTr } from '@/lib/utils';
import { getUyapNotifications, UyapNotificationItem } from '@/lib/localData';

interface OverviewProps {
  setView: (v: View) => void;
}

interface SystemLogItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  timeStr: string;
  createdAt: string;
  viewTarget?: View;
  badge?: string;
  badgeColor?: string;
}

interface UrgentTaskItem {
  id: string;
  priority: 'urgent' | 'warning' | 'info';
  badge: string;
  title: string;
  description: string;
  viewTarget: View;
}

function formatUyapLog(item: UyapNotificationItem): SystemLogItem {
  let icon = '⚡';
  let badge = 'UYAP • CANLI';
  let badgeColor = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  let title = item.baslik || 'UYAP Dosya Hareketi';

  const kat = item.kategori || '';
  if (kat === 'BILIRKISI') {
    icon = '🩺';
    badge = 'UYAP • BİLİRKİŞİ';
    badgeColor = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    title = 'Bilirkişi Raporu / Mütalaa';
  } else if (kat === 'KARAR') {
    icon = '⚖️';
    badge = 'UYAP • KARAR';
    badgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    title = 'Mahkeme Kararı / Tensip';
  } else if (kat === 'ICRA') {
    icon = '💰';
    badge = 'UYAP • İCRA';
    badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    title = 'İcra Tahsilat / Reddiyat';
  } else if (kat === 'TEBLIGAT') {
    icon = '📬';
    badge = 'UYAP • TEBLİGAT';
    badgeColor = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    title = 'Tebligat / Müzekkere';
  } else if (kat === 'DILEKCE') {
    icon = '✍️';
    badge = 'UYAP • DİLEKÇE';
    badgeColor = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    title = 'Dilekçe / İtiraz';
  } else if (kat === 'VEKIL') {
    icon = '👤';
    badge = 'UYAP • VEKALET';
    badgeColor = 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
    title = 'Taraf / Vekalet Kaydı';
  }

  let description = item.mesaj || item.baslik;
  if (item.birim_adi && item.dosya_no && !description.includes(item.dosya_no)) {
    description = `${item.birim_adi} (${item.dosya_no}) - ${description}`;
  }

  return {
    id: `uyap-${item.id}`,
    icon,
    title,
    description,
    timeStr: formatRelativeTr(item.gonderilme_tarihi || item.created_at || new Date().toISOString()),
    createdAt: item.gonderilme_tarihi || item.created_at || new Date().toISOString(),
    viewTarget: 'cases',
    badge,
    badgeColor,
  };
}

export function Overview({ setView }: OverviewProps) {
  const [stats, setStats] = useState({ casesCount: 0, clientsCount: 0, hearingsCount: 0 });
  const [nextHearing, setNextHearing] = useState<CalendarEventRow | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLogItem[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const todayStr = new Date().toISOString().split('T')[0];

        const [
          { count: casesCount },
          { count: clientsCount },
          { count: hearingsCount },
          { data: evData },
          { data: cData },
          uyapNotifications
        ] = await Promise.all([
          supabase.from('cases').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', 'case'),
          supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('events').select('*').eq('user_id', user.id).gte('date', todayStr).order('date', { ascending: true }).limit(10),
          supabase.from('cases').select('id, title, created_at').eq('user_id', user.id).eq('kind', 'case').order('created_at', { ascending: false }).limit(5),
          getUyapNotifications(30)
        ]);

        setStats({
          casesCount: casesCount || 0,
          clientsCount: clientsCount || 0,
          hearingsCount: hearingsCount || 0,
        });

        // 1. Dynamic En Yakın Duruşma Günü
        if (evData && evData.length > 0) {
          setNextHearing(evData[0] as unknown as CalendarEventRow);
        } else {
          setNextHearing(null);
        }

        // 2. Dynamic Sistem İşlemi Günlüğü (SADECE UYAP Eklentisi Bildirimleri)
        const logs: SystemLogItem[] = [];

        if (Array.isArray(uyapNotifications) && uyapNotifications.length > 0) {
          uyapNotifications.forEach(un => {
            logs.push(formatUyapLog(un));
          });
        }

        // UYAP Bildirimlerini Sistem İşlem Günlüğü'ne Ekle
        if (typeof window !== 'undefined' && (window as any).electron?.localDataGetUyapNotifications) {
          try {
            const uyapNotifs = await (window as any).electron.localDataGetUyapNotifications({ limit: 20 });
            if (Array.isArray(uyapNotifs)) {
              uyapNotifs.forEach((n: any) => {
                let icon = '🔔';
                if (n.kategori === 'BILIRKISI') icon = '📋';
                else if (n.kategori === 'KARAR') icon = '📜';
                else if (n.kategori === 'ICRA') icon = '💵';
                else if (n.kategori === 'TEBLIGAT') icon = '📬';
                else if (n.kategori === 'DILEKCE') icon = '✍️';
                else if (n.kategori === 'VEKIL') icon = '⚖️';

                logs.push({
                  id: `uyap-notif-${n.id}`,
                  icon: icon,
                  title: n.baslik || 'UYAP Bildirimi',
                  description: n.mesaj,
                  timeStr: formatRelativeTr(n.gonderilme_tarihi || n.created_at),
                  createdAt: n.gonderilme_tarihi || n.created_at,
                  viewTarget: 'cases'
                });
              });
            }
          } catch (_) {}
        }

        

        logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSystemLogs(logs.slice(0, 15));

        // 3. Dynamic Acil İşlemler
        const urgent: UrgentTaskItem[] = [];

        if (Array.isArray(evData)) {
          evData.forEach(ev => {
            const evDateStr = ev.date;
            const diffTime = new Date(evDateStr).getTime() - new Date(todayStr).getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

            if (diffDays <= 0) {
              urgent.push({
                id: `ev-${ev.id}`,
                priority: 'urgent',
                badge: '• BUGÜN DURUŞMA VAR',
                title: ev.title || 'Duruşma Katılımı',
                description: `Tarih: ${ev.date} ${ev.time || ''} ${ev.location ? '· ' + ev.location : ''}`,
                viewTarget: 'calendar'
              });
            } else if (diffDays <= 2) {
              urgent.push({
                id: `ev-${ev.id}`,
                priority: 'warning',
                badge: 'SÜRESİ YAKLAŞIYOR',
                title: ev.title || 'Yaklaşan Duruşma',
                description: `Tarih: ${ev.date} ${ev.time || ''}`,
                viewTarget: 'calendar'
              });
            } else if (diffDays <= 7) {
              urgent.push({
                id: `ev-${ev.id}`,
                priority: 'info',
                badge: '7 GÜN İÇİNDE',
                title: ev.title || 'Duruşma / Takvim',
                description: `Tarih: ${ev.date}`,
                viewTarget: 'calendar'
              });
            }
          });
        }

        if (urgent.length < 3 && Array.isArray(cData) && cData.length > 0) {
          cData.slice(0, 2).forEach(c => {
            urgent.push({
              id: `case-rev-${c.id}`,
              priority: 'info',
              badge: 'DOSYA İNCELEME',
              title: `Dosya Analizini İnceleyin: ${c.title}`,
              description: `Dosya evrakları ve yapay zeka özetleri hazır.`,
              viewTarget: 'cases'
            });
          });
        }

        setUrgentTasks(urgent.slice(0, 4));
      } catch {
        // Ignore background load error
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Electron canlı bildirim akışı dinleyicisi
    const unbind = (window as any)?.electron?.onUyapNotificationsSynced?.(() => {
      loadData();
    });

    return () => {
      if (typeof unbind === 'function') unbind();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-6 p-3 bg-[var(--color-bg-base)] text-[var(--color-text)] cyber-juris font-sans overflow-y-auto min-h-full">

      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-1 border-b border-[var(--color-divider)] pb-4">
        <div>
          <h1 className="text-[32px] sm:text-[38px] font-black text-[var(--color-text)] tracking-tight leading-none mb-1 font-sans">
            Komuta Merkezi
          </h1>
          <p className="text-[13px] font-mono text-[var(--color-text-muted)] tracking-wide">
            Sistem canlı verileri senkronize edildi. Gerçek duruşma takvimi ve işlem günlükleri gösteriliyor.
          </p>
        </div>

        {/* AI Engine Status Badge with Neon Glow */}
        <div className="flex items-center gap-2.5 bg-[#052E23]/90 border border-[#00E699]/50 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(0,230,153,0.18)] backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E699] animate-pulse shadow-[0_0_8px_#00E699]" />
          <span className="text-[12px] font-mono font-bold tracking-widest text-[#00E699] uppercase">
            AYRIS AI: CANLI
          </span>
        </div>
      </div>

      {/* Main Grid: Left 2 Cols (Stats + Logs), Right 1 Col (Urgent Tasks) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

        {/* LEFT COLUMN (2 Spans): Aktif Dosyalar Card (Top Left) + Sistem İşlem Günlüğü (Bottom Left) */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Top Row Stat Cards (Side-by-Side: 1. Aktif Dosyalar, 2. En Yakın Duruşma) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Stat Card 1: Aktif Dava Dosyaları */}
            <div 
              onClick={() => setView('cases')}
              className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 cursor-pointer hover:border-[#3B82F6]/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[var(--color-text-muted)] tracking-widest uppercase">
                  AKTİF DAVA DOSYALARI
                </span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-glow)] border border-[var(--color-divider)] flex items-center justify-center text-[15px] text-[#3B82F6] group-hover:scale-105 transition-transform">
                  ⚖️
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-[34px] font-black text-[var(--color-text)] font-sans leading-none tracking-tight">
                  {stats.casesCount}
                </span>
                <span className="text-[12px] font-mono text-[#00E699] font-bold bg-[#00E699]/10 border border-[#00E699]/20 px-2 py-0.5 rounded-full">
                  Aktif Kayıt
                </span>
              </div>

              {/* Progress Tracker Line */}
              <div className="w-full bg-[var(--color-bg-glow)] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#3B82F6] h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(stats.casesCount * 10, 100)}%` }}
                />
              </div>
            </div>

            {/* Stat Card 2: En Yakın Duruşma Günü */}
            <div 
              onClick={() => setView('calendar')}
              className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 cursor-pointer hover:border-[#3B82F6]/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[var(--color-text-muted)] tracking-widest uppercase">
                  EN YAKIN DURUŞMA GÜNÜ
                </span>
                <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-glow)] border border-[var(--color-divider)] flex items-center justify-center text-[15px] text-[#3B82F6] group-hover:scale-105 transition-transform">
                  🗓️
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-[34px] font-black text-[var(--color-text)] font-sans leading-none tracking-tight">
                  {stats.hearingsCount}
                </span>
                <span className="text-[12px] font-mono text-[#00E699] font-bold bg-[#00E699]/10 border border-[#00E699]/20 px-2 py-0.5 rounded-full">
                  Takvim Temiz
                </span>
              </div>

              <div className="text-[12px] font-mono text-[var(--color-text-muted)] truncate">
                En Yakın: <strong className="text-[var(--color-text)]">
                  {nextHearing ? `${nextHearing.title} (${nextHearing.date}${nextHearing.time ? ' ' + nextHearing.time : ''})` : 'Yaklaşan duruşma bulunmuyor'}
                </strong>
              </div>
            </div>
          </div>

          {/* Bottom Left Card: Sistem İşlem Günlüğü (100% Dynamic UYAP Stream) */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 shadow-sm flex flex-col gap-5 flex-1">
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3">
              <h2 className="text-[18px] font-extrabold text-[var(--color-text)] tracking-tight">
                Bildirimler
              </h2>
              <span className="text-[11px] font-mono text-[#00E699] font-bold">CANLI AKIŞ</span>
            </div>

            {loading ? (
              <div className="py-12 text-center font-mono text-[13px] text-[var(--color-text-muted)] animate-pulse">
                Bildirimler yükleniyor...
              </div>
            ) : systemLogs.length === 0 ? (
              <div className="py-12 text-center font-mono text-[13px] text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-glow)] border border-[var(--color-divider)] flex items-center justify-center text-lg text-[#3B82F6] mb-1">
                  ⚡
                </div>
                <div className="font-bold text-[13.5px] text-[var(--color-text)]">UYAP Bildirim Akışı Bekleniyor</div>
                <p className="text-[11.5px] opacity-75 max-w-sm leading-relaxed mb-1">
                  UYAP eklentinizden dosya hareketleri, tebligatlar ve mahkeme bildirimleri aktarıldığında canlı akış burada listelenecektir.
                </p>
                <a
                  href="https://chromewebstore.google.com/detail/ayrislegal-uyap-dosya-ara/eceeinhnailmlfgbfdjakfegokfcjplj"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#60A5FA] text-xs font-bold font-mono transition-all cursor-pointer shadow-sm mt-1"
                >
                  <span>🌐</span>
                  <span>Chrome Eklentisini İndir & Kur</span>
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {systemLogs.map(log => (
                  <div 
                    key={log.id}
                    onClick={() => log.viewTarget && setView(log.viewTarget)}
                    className="flex items-start gap-4 p-4 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-divider)] hover:border-[#3B82F6]/40 cursor-pointer transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-glow)] border border-[var(--color-divider)] text-[#3B82F6] flex items-center justify-center shrink-0 font-mono text-[16px]">
                      {log.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <h4 className="text-[14px] font-bold text-[var(--color-text)] truncate">
                            {log.title}
                          </h4>
                          {log.badge && (
                            <span className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${log.badgeColor || 'bg-blue-500/15 text-blue-400 border-blue-500/30'}`}>
                              {log.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0">{log.timeStr}</span>
                      </div>
                      <p className="text-[12.5px] text-[var(--color-text-muted)] leading-relaxed truncate">
                        {log.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (1 Span): Acil İşlemler Card (100% Dynamic) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 flex-1 h-full">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3 mb-4">
                <h2 className="text-[18px] font-extrabold text-[var(--color-text)] tracking-tight">
                  Acil İşlemler
                </h2>
                <span className="text-[11px] font-mono text-red-400 bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 rounded-lg font-bold">
                  {urgentTasks.length} Acil
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center font-mono text-[13px] text-[var(--color-text-muted)] animate-pulse">
                  Acil işlemler taranıyor...
                </div>
              ) : urgentTasks.length === 0 ? (
                <div className="p-6 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-divider)] flex flex-col items-center justify-center text-center gap-2 py-10">
                  <div className="w-12 h-12 rounded-full bg-[#00E699]/10 border border-[#00E699]/30 text-[#00E699] flex items-center justify-center text-xl mb-1">
                    ✓
                  </div>
                  <h4 className="text-[14px] font-bold text-[var(--color-text)]">Acil İşlem Bulunmuyor</h4>
                  <p className="text-[12.5px] font-mono text-[var(--color-text-muted)] max-w-xs">
                    Önümüzdeki 7 gün içinde acil duruşma veya süresi dolan işlem kaydı bulunmamaktadır.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {urgentTasks.map(task => {
                    let badgeBg = 'text-red-500 bg-red-500/10 border-red-500/20';
                    if (task.priority === 'warning') badgeBg = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                    if (task.priority === 'info') badgeBg = 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20';

                    return (
                      <div
                        key={task.id}
                        onClick={() => setView(task.viewTarget)}
                        className="p-4 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-divider)] hover:border-[#3B82F6]/50 cursor-pointer transition-all flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${badgeBg}`}>
                            {task.badge}
                          </span>
                          <span className="text-[#3B82F6] font-mono text-[12px]">→</span>
                        </div>
                        <h4 className="text-[13.5px] font-bold text-[var(--color-text)]">
                          {task.title}
                        </h4>
                        <p className="text-[12px] font-mono text-[var(--color-text-muted)]">
                          {task.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setView('cases')}
              className="w-full bg-[var(--color-bg-glow)] hover:bg-[var(--color-divider)] text-[var(--color-text)] border border-[var(--color-divider)] font-mono font-bold text-[12.5px] py-2.5 rounded-xl transition-all cursor-pointer text-center mt-2"
            >
              Tüm Dosya Görevlerini Görüntüle →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}