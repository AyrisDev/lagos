import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MONTH_NAMES_TR } from '@/lib/constants';
import { sameDay } from '@/lib/utils';
import { CalendarEventRow } from '@/types';
import { useToast } from '@/components/ToastProvider';

export function CalendarView() {
  const { toast, confirm } = useToast();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [events, setEvents] = useState<CalendarEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'hearing' | 'meeting' | 'deadline'>('hearing');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const loadEvents = useCallback((uid: string) => {
    setLoading(true);
    (async () => {
      try {
        const { data: directEvents, error: directErr } = await supabase
          .from('events')
          .select('id, title, description, date, type, location')
          .eq('user_id', uid)
          .order('date', { ascending: true });

        if (!directErr && directEvents) {
          const list = (directEvents as CalendarEventRow[]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setEvents(list);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error('Error loading calendar events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      loadEvents(user.id);
    });
  }, [loadEvents]);

  useEffect(() => {
    if (!modalOpen && !selectedDay) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
        setSelectedDay(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, selectedDay]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newTitle.trim() || !newDate) return;
    const { error } = await supabase.from('events').insert([{
      title: newTitle.trim(), type: newType, date: new Date(newDate).toISOString(),
      location: newLocation.trim() || null, user_id: userId,
    }]);
    if (!error) {
      setModalOpen(false);
      setNewTitle(''); setNewLocation(''); setNewDate(''); setNewType('hearing');
      loadEvents(userId);
      toast.success('Duruşma / etkinlik takvime eklendi.');
    } else {
      toast.error('Etkinlik eklenirken bir hata oluştu.');
    }
  };

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Etkinliği Sil',
      message: 'Bu duruşma / takvim kaydını silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    const { error } = await supabase.from('events').delete().eq('id', id);

    if (!error) {
      setEvents(prev => prev.filter(ev => ev.id !== id));
      toast.success('Etkinlik takvimden silindi.');
    } else {
      toast.error('Etkinlik silinirken bir hata oluştu.');
    }
  };

  // Calendar Cell calculations (Monday is first day of week)
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build complete 35-cell or 42-cell calendar grid
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  
  // Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(year, month, d),
      isCurrentMonth: true
    });
  }

  // Next month leading days
  const remaining = 35 - cells.length > 0 ? 35 - cells.length : (42 - cells.length);
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false
    });
  }

  // Active Week Calculation (Monday to Sunday)
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const activeWeekStart = getMonday(selectedDay || currentMonth);

  const activeWeekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(activeWeekStart);
    d.setDate(activeWeekStart.getDate() + i);
    activeWeekDays.push(d);
  }

  const formatHeaderTitle = () => {
    if (viewMode === 'month') {
      return `${MONTH_NAMES_TR[month]} ${year}`;
    }
    const start = activeWeekDays[0];
    const end = activeWeekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES_TR[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTH_NAMES_TR[start.getMonth()]} - ${end.getDate()} ${MONTH_NAMES_TR[end.getMonth()]} ${end.getFullYear()}`;
  };

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonth(new Date(year, month - 1, 1));
    } else {
      const prevWeek = new Date(activeWeekStart);
      prevWeek.setDate(activeWeekStart.getDate() - 7);
      setCurrentMonth(prevWeek);
      setSelectedDay(prevWeek);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth(new Date(year, month + 1, 1));
    } else {
      const nextWeek = new Date(activeWeekStart);
      nextWeek.setDate(activeWeekStart.getDate() + 7);
      setCurrentMonth(nextWeek);
      setSelectedDay(nextWeek);
    }
  };

  const allEvents = events;

  const eventsOnDay = (day: Date) => allEvents.filter(e => sameDay(new Date(e.date), day));
  const today = new Date();

  const daysHeader = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];

  return (
    <div className="flex-1 flex flex-col gap-6 p-3 bg-[var(--color-bg-base)] text-[var(--color-text)] cyber-juris font-sans overflow-y-auto min-h-full">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-1">
        
        {/* Month / Week Title & Prev/Next Buttons */}
        <div className="flex items-center gap-4">
          <h1 className="text-[34px] font-extrabold text-[var(--color-text)] tracking-tight leading-none">
            {formatHeaderTitle()}
          </h1>

          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-xl p-1 shadow-sm">
            <button 
              onClick={handlePrev}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-glow)] rounded-lg transition-colors cursor-pointer"
              title={viewMode === 'month' ? "Önceki Ay" : "Önceki Hafta"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentMonth(now);
                setSelectedDay(now);
              }}
              className="px-2.5 py-1 text-[11px] font-mono font-bold text-[#3B82F6] hover:bg-[var(--color-bg-glow)] rounded-lg transition-colors cursor-pointer"
              title="Bugüne Git"
            >
              Bugün
            </button>
            <button 
              onClick={handleNext}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-glow)] rounded-lg transition-colors cursor-pointer"
              title={viewMode === 'month' ? "Sonraki Ay" : "Sonraki Hafta"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* View Mode Toggle (Ay / Hafta) & Add Event Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          
          {/* Ay / Hafta Pill Box */}
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-xl p-1 shadow-sm font-mono text-[12px]">
            <button 
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'month' 
                  ? 'bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/25' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Ay
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'week' 
                  ? 'bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/25' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              Hafta
            </button>
          </div>

          {/* New Event Button */}
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] tracking-wide transition-all shadow-lg shadow-[#3B82F6]/25 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline text-white">Yeni Etkinlik</span>
          </button>
        </div>

      </div>

      {/* Main Calendar Glass Grid Container */}
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl overflow-hidden shadow-sm">
        
        {/* Top Highlight Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>

        {/* Calendar Table Grid */}
        <div className="w-full">
          
          {/* Day Headers (PZT, SAL, ÇAR, PER, CUM, CMT, PAZ) */}
          <div className="grid grid-cols-7 border-b border-[var(--color-divider)] bg-[var(--color-bg-glow)]">
            {daysHeader.map(dh => (
              <div key={dh} className="py-3 px-2 text-center font-mono font-bold text-[11px] tracking-widest text-[var(--color-text-muted)] uppercase">
                {dh}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          {loading ? (
            <div className="py-24 text-center text-[var(--color-text-muted)] font-mono text-[13px] animate-pulse">
              Takvim yükleniyor...
            </div>
          ) : viewMode === 'week' ? (
            <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[var(--color-divider)] border-b border-[var(--color-divider)]">
              {activeWeekDays.map((day, idx) => {
                const dayEvents = eventsOnDay(day);
                const isToday = sameDay(day, today);
                const isSelected = selectedDay && sameDay(day, selectedDay);

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[380px] p-3 flex flex-col justify-between transition-all duration-150 cursor-pointer relative group ${
                      isSelected
                        ? 'bg-[#3B82F6]/15 ring-1 ring-[#3B82F6]/40'
                        : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <div>
                      {/* Day Header Info */}
                      <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-2 mb-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-bold text-[var(--color-text-muted)] uppercase">
                            {daysHeader[idx]}
                          </span>
                          <span className="font-mono text-[13px] font-bold text-[var(--color-text)]">
                            {day.getDate()} {MONTH_NAMES_TR[day.getMonth()].slice(0, 3)}
                          </span>
                        </div>
                        {isToday && (
                          <span className="bg-[#3B82F6] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-sm">
                            BUGÜN
                          </span>
                        )}
                      </div>

                      {/* Events List for this Day */}
                      {dayEvents.length === 0 ? (
                        <div className="py-12 text-center text-[var(--color-text-muted)] font-mono text-[11px] opacity-60">
                          Etkinlik yok
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {dayEvents.map(ev => {
                            const isGreen = ev.title.includes('İş Mahkemesi') || ev.title.includes('Görüşme');
                            const isPurple = ev.title.includes('Ticaret') || ev.title.includes('Süre');

                            let chipStyle = 'bg-blue-500/15 text-[#2563EB] dark:text-[#60A5FA] border-blue-500/30 dark:bg-[#1E2A42]/90 dark:border-[#3B82F6]/50 shadow-sm';
                            if (isGreen) {
                              chipStyle = 'bg-emerald-500/15 text-emerald-600 dark:text-[#00E699] border-emerald-500/30 dark:bg-[#052E23]/90 dark:border-[#00E699]/50 shadow-sm';
                            } else if (isPurple) {
                              chipStyle = 'bg-purple-500/15 text-purple-600 dark:text-[#A78BFA] border-purple-500/30 dark:bg-[#251D3A]/90 dark:border-[#A78BFA]/50 shadow-sm';
                            }

                            return (
                              <div
                                key={ev.id}
                                title={`${ev.title} ${ev.location ? `(${ev.location})` : ''}`}
                                className={`p-2.5 rounded-xl border font-mono text-[11.5px] transition-all flex flex-col gap-1 ${chipStyle}`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span className="truncate">{ev.title}</span>
                                  <button
                                    onClick={(e) => handleDeleteEvent(ev.id, e)}
                                    className="opacity-60 hover:opacity-100 hover:text-red-500 transition-opacity ml-1"
                                    title="Sil"
                                  >
                                    ✕
                                  </button>
                                </div>
                                {ev.location && (
                                  <span className="text-[10.5px] opacity-80 flex items-center gap-1 truncate">
                                    📍 {ev.location}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Add Button at Bottom of Column */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const isoStr = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setNewDate(isoStr);
                        setModalOpen(true);
                      }}
                      className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-[var(--color-divider)] hover:border-[#3B82F6] text-[var(--color-text-muted)] hover:text-[#3B82F6] font-mono text-[11px] font-bold transition-all text-center cursor-pointer"
                    >
                      + Etkinlik Ekle
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-[var(--color-divider)] border-b border-[var(--color-divider)]">
              {cells.map((cell, idx) => {
                const dayEvents = eventsOnDay(cell.date);
                const isToday = sameDay(cell.date, today);
                const isSelected = selectedDay && sameDay(cell.date, selectedDay);

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDay(cell.date)}
                    className={`min-h-[110px] p-2.5 flex flex-col justify-start items-start transition-all duration-150 cursor-pointer relative group ${
                      !cell.isCurrentMonth 
                        ? 'bg-[var(--color-bg-glow)]/80 text-[var(--color-text-muted)] opacity-50 hover:opacity-80' 
                        : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                    } ${isSelected ? 'bg-[#3B82F6]/15 ring-1 ring-[#3B82F6] z-10' : ''}`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className={`font-mono text-[13px] ${
                        isToday 
                          ? 'bg-[#3B82F6] text-white w-6 h-6 rounded-full flex items-center justify-center font-extrabold shadow-[0_0_10px_#3B82F6]' 
                          : cell.isCurrentMonth ? 'text-[var(--color-text)] font-bold' : 'text-[var(--color-text-muted)] font-medium'
                      }`}>
                        {cell.date.getDate()}
                      </span>
                    </div>

                    {/* Events List inside Day Cell */}
                    <div className="flex flex-col gap-1.5 w-full">
                      {dayEvents.map(ev => {
                        const isGreen = ev.title.includes('İş Mahkemesi') || ev.title.includes('Görüşme');
                        const isPurple = ev.title.includes('Ticaret') || ev.title.includes('Süre');

                        let chipStyle = 'bg-blue-500/15 text-[#2563EB] dark:text-[#60A5FA] border-blue-500/30 dark:bg-[#1E2A42]/90 dark:border-[#3B82F6]/50 shadow-sm';
                        if (isGreen) {
                          chipStyle = 'bg-emerald-500/15 text-emerald-600 dark:text-[#00E699] border-emerald-500/30 dark:bg-[#052E23]/90 dark:border-[#00E699]/50 shadow-sm';
                        } else if (isPurple) {
                          chipStyle = 'bg-purple-500/15 text-purple-600 dark:text-[#A78BFA] border-purple-500/30 dark:bg-[#251D3A]/90 dark:border-[#A78BFA]/50 shadow-sm';
                        }

                        return (
                          <div
                            key={ev.id}
                            title={`${ev.title} ${ev.location ? `(${ev.location})` : ''}`}
                            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] font-bold tracking-tight truncate w-full transition-all hover:scale-[1.02] flex items-center justify-between group/chip ${chipStyle}`}
                          >
                            <span className="truncate">{ev.title}</span>
                            <button
                              onClick={(e) => handleDeleteEvent(ev.id, e)}
                              className="opacity-0 group-hover/chip:opacity-100 hover:text-red-400 ml-1 transition-opacity"
                              title="Sil"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Selected Day Details Modal (Centered Overlay) */}
      {selectedDay && (
        <div 
          className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 relative overflow-hidden"
          >
            {/* Top Glowing Bar */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] text-sm">
                  📅
                </div>
                <h3 className="text-[16px] font-bold text-[var(--color-text)] tracking-tight font-sans">
                  {selectedDay.getDate()} {MONTH_NAMES_TR[selectedDay.getMonth()]} {selectedDay.getFullYear()} — Etkinlikler
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDay(null)} 
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[18px] cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Events List */}
            {eventsOnDay(selectedDay).length === 0 ? (
              <div className="text-[13px] text-[var(--color-text-muted)] font-mono py-8 text-center bg-[var(--color-bg-base)] border border-[var(--color-divider)] rounded-xl">
                Bu tarihte kayıtlı bir duruşma veya etkinlik bulunmuyor.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto cyber-juris-scroll pr-1">
                {eventsOnDay(selectedDay).map(ev => (
                  <div key={ev.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-divider)] shadow-sm hover:border-[#3B82F6]/40 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shrink-0"></span>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[var(--color-text)]">{ev.title}</span>
                        {ev.location && (
                          <span className="text-[11.5px] text-[var(--color-text-muted)] font-mono flex items-center gap-1 mt-0.5">
                            <span>📍</span>
                            <span>{ev.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteEvent(ev.id, e)}
                      className="text-[var(--color-text-muted)] hover:text-[#FB7185] text-[12px] font-mono transition-colors cursor-pointer px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between border-t border-[var(--color-divider)] pt-3.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  const d = selectedDay;
                  const isoStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  setNewDate(isoStr);
                  setModalOpen(true);
                }}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-xl text-[12px] font-mono font-bold transition-all shadow-md shadow-[#3B82F6]/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>Bu Tarihe Etkinlik Ekle</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-glow)] text-[12px] font-mono cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Modal (Cyber-Juris Glassmorphism) */}
      {modalOpen && (
        <div 
          className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <form 
            onSubmit={handleCreateEvent}
            onClick={(e) => e.stopPropagation()} 
            className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent"></div>

            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-4">
              <h2 className="text-[18px] font-bold text-[var(--color-text)] tracking-tight">Yeni Duruşma / Etkinlik Ekle</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[18px] cursor-pointer">✕</button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Etkinlik / Duruşma Başlığı</label>
                <input 
                  type="text" 
                  placeholder="Örn: 10:30 - İş Mahkemesi" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  required
                  className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text)] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Etkinlik Türü</label>
                <select 
                  value={newType} 
                  onChange={e => setNewType(e.target.value as 'hearing' | 'meeting' | 'deadline')}
                  className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text)] outline-none transition-colors font-mono"
                >
                  <option value="hearing">Duruşma (Hearing)</option>
                  <option value="meeting">Görüşme (Meeting)</option>
                  <option value="deadline">Süre / Son Tarih (Deadline)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Tarih & Saat</label>
                <input 
                  type="datetime-local" 
                  value={newDate} 
                  onChange={e => setNewDate(e.target.value)} 
                  required
                  className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text)] outline-none transition-colors font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">Mahkeme / Konum</label>
                <input 
                  type="text" 
                  placeholder="Örn: Ankara 2. İş Mahkemesi" 
                  value={newLocation} 
                  onChange={e => setNewLocation(e.target.value)} 
                  className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text)] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-divider)]">
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-glow)] text-[13px] font-semibold transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button 
                type="submit"
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-lg shadow-[#3B82F6]/25 transition-all cursor-pointer"
              >
                Etkinlik Oluştur
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}