import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { View, CaseRow, CalendarEventRow } from '@/types';
import { formatRelativeTr } from '@/lib/utils';

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
}

interface UrgentTaskItem {
  id: string;
  priority: 'urgent' | 'warning' | 'info';
  badge: string;
  title: string;
  description: string;
  viewTarget: View;
}

export function Overview({ setView }: OverviewProps) {
  const [stats, setStats] = useState({ casesCount: 0, clientsCount: 0, hearingsCount: 0 });
  const [nextHearing, setNextHearing] = useState<CalendarEventRow | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLogItem[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<UrgentTaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
          { data: docData },
          { data: draftData }
        ] = await Promise.all([
          supabase.from('cases').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', 'case'),
          supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('events').select('*').eq('user_id', user.id).gte('date', todayStr).order('date', { ascending: true }).limit(10),
          supabase.from('cases').select('id, title, created_at').eq('user_id', user.id).eq('kind', 'case').order('created_at', { ascending: false }).limit(5),
          supabase.from('documents').select('id, filename, uploaded_at, case_id').order('uploaded_at', { ascending: false }).limit(5),
          supabase.from('drafts').select('id, petition_type, created_at').order('created_at', { ascending: false }).limit(5)
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

        // 2. Dynamic Sistem İşlemi Günlüğü
        const logs: SystemLogItem[] = [];

        if (Array.isArray(docData)) {
          docData.forEach(d => {
            logs.push({
              id: `doc-${d.id}`,
              icon: '📄',
              title: 'Evrak / Belge Yüklendi',
              description: `"${d.filename || 'Belge'}" sisteme yüklendi ve işlendi.`,
              timeStr: formatRelativeTr(d.uploaded_at || new Date().toISOString()),
              createdAt: d.uploaded_at || new Date().toISOString(),
              viewTarget: 'cases'
            });
          });
        }

        if (Array.isArray(draftData)) {
          draftData.forEach(dr => {
            logs.push({
              id: `draft-${dr.id}`,
              icon: '✍️',
              title: 'Dilekçe Taslağı Oluşturuldu',
              description: `"${dr.petition_type || 'Dilekçe Taslağı'}" inceleme için kaydedildi.`,
              timeStr: formatRelativeTr(dr.created_at || new Date().toISOString()),
              createdAt: dr.created_at || new Date().toISOString(),
              viewTarget: 'drafting'
            });
          });
        }

        if (Array.isArray(cData)) {
          cData.forEach(c => {
            logs.push({
              id: `case-${c.id}`,
              icon: '⚖️',
              title: 'Dava Dosyası İçe Aktarıldı',
              description: `"${c.title || 'Dava Dosyası'}" sisteme kaydedildi.`,
              timeStr: formatRelativeTr(c.created_at || new Date().toISOString()),
              createdAt: c.created_at || new Date().toISOString(),
              viewTarget: 'cases'
            });
          });
        }

        logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSystemLogs(logs.slice(0, 5));

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
    })();
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

      {/* Main Two-Column Outer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN (2 Spans): Aktif Dosyalar Card (Top Left) + Sistem İşlem Günlüğü (Bottom Left) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Aktif Dava Dosyaları */}
            <div
              onClick={() => setView('cases')}
              className="relative group bg-[var(--color-surface)] border border-[var(--color-divider)] hover:border-[#3B82F6]/60 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm flex flex-col justify-between overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[11px] font-mono font-bold tracking-widest text-[var(--color-text-muted)] uppercase">
                  Aktif Dava Dosyaları
                </span>
                <div className="p-2.5 rounded-xl bg-[var(--color-bg-glow)] border border-[var(--color-divider)] text-[#3B82F6] transition-colors">
                  ⚖️
                </div>
              </div>

              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-[44px] font-black text-[var(--color-text)] leading-none font-mono tracking-tight">
                  {loading ? '...' : stats.casesCount}
                </span>
                <span className="text-[12px] font-mono font-bold text-[#00E699] bg-[#00E699]/10 px-2.5 py-0.5 rounded border border-[#00E699]/20">
                  Aktif Kayıt
                </span>
              </div>

              <div className="w-full bg-[var(--color-bg-glow)] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#3B82F6] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(15, stats.casesCount * 5))}%` }} />
              </div>
            </div>

            {/* Card 2: En Yakın Duruşma (100% Dynamic) */}
            <div
              onClick={() => setView('calendar')}
              className="relative group bg-[var(--color-surface)] border border-[var(--color-divider)] hover:border-[#3B82F6]/60 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm flex flex-col justify-between overflow-hidden"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[11px] font-mono font-bold tracking-widest text-[var(--color-text-muted)] uppercase">
                  En Yakın Duruşma Günü
                </span>
                <div className="p-2.5 rounded-xl bg-[var(--color-bg-glow)] border border-[var(--color-divider)] text-[#3B82F6] transition-colors">
                  📅
                </div>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <span className="text-[44px] font-black text-[var(--color-text)] leading-none font-mono tracking-tight">
                  {loading ? '...' : stats.hearingsCount}
                </span>
                {nextHearing ? (
                  <span className="text-[11px] font-mono font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-lg">
                    Duruşma Var
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold text-[#00E699] bg-[#00E699]/10 border border-[#00E699]/20 px-2.5 py-1 rounded-lg">
                    Takvim Temiz
                  </span>
                )}
              </div>

              <div className="text-[12px] font-mono text-[var(--color-text-muted)] truncate">
                En Yakın: <strong className="text-[var(--color-text)]">
                  {nextHearing ? `${nextHearing.title} (${nextHearing.date}${nextHearing.time ? ' ' + nextHearing.time : ''})` : 'Yaklaşan duruşma bulunmuyor'}
                </strong>
              </div>
            </div>
          </div>

          {/* Bottom Left Card: Sistem İşlem Günlüğü (100% Dynamic) */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 shadow-sm flex flex-col gap-5 flex-1">
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3">
              <h2 className="text-[18px] font-extrabold text-[var(--color-text)] tracking-tight">
                Sistem İşlem Günlüğü
              </h2>
              <span className="text-[11px] font-mono text-[#00E699] font-bold">CANLI AKIŞ</span>
            </div>

            {loading ? (
              <div className="py-12 text-center font-mono text-[13px] text-[var(--color-text-muted)] animate-pulse">
                İşlem günlüğü yükleniyor...
              </div>
            ) : systemLogs.length === 0 ? (
              <div className="py-12 text-center font-mono text-[13px] text-[var(--color-text-muted)]">
                Henüz sistem işlem kaydı bulunmuyor. Dosya yüklediğinizde veya duruşma eklediğinizde işlemleriniz burada listelenecektir.
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
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[14px] font-bold text-[var(--color-text)] truncate">
                          {log.title}
                        </h4>
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0 ml-2">{log.timeStr}</span>
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