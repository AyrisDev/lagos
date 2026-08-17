import { CaseDetail } from './CaseDetail';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/constants';
import { normalizeTr, useSupabaseToken } from '@/lib/utils';
import { CaseRow } from '@/types';
import { useToast } from '@/components/ToastProvider';

export function Cases() {
  const { toast, confirm } = useToast();
  const [q, setQ] = useState('');
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [activeFilterStatus, setActiveFilterStatus] = useState<string | null>(null);

  const token = useSupabaseToken();

  const loadCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('cases').select('id, title, created_at, parties').eq('user_id', user.id).eq('kind', 'case').order('created_at', { ascending: false });
      setCases((data as CaseRow[]) || []);
    } catch {
      // Ignore background error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadCases();
    })();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const submitNewCase = async () => {
    if (!newCaseTitle || !newCaseTitle.trim() || creating) return;
    setCreating(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_URL}cases`, { method: 'POST', headers, body: JSON.stringify({ title: newCaseTitle.trim(), kind: 'case' }) });
      const data = await res.json();
      if (res.ok && data.case) {
        setCases(prev => [data.case, ...prev]);
        setIsModalOpen(false);
        setNewCaseTitle('');
        toast.success('Yeni dava dosyası oluşturuldu.');
      } else {
        toast.error('Dava dosyası oluşturulamadı.');
      }
    } catch {
      toast.error('Bağlantı hatası: Dava dosyası oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Dava Dosyasını Sil',
      message: 'Bu dava dosyasını silmek istediğinizden emin misiniz? Sohbet geçmişi, belgeler ve analizler de birlikte kalıcı olarak silinecektir.',
      confirmText: 'Evet, Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_URL}cases/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      if (res.ok) {
        setCases(prev => prev.filter(c => c.id !== id));
        toast.success('Dava dosyası başarıyla silindi.');
      } else {
        toast.error('Dava dosyası silinemedi.');
      }
    } catch {
      toast.error('Bağlantı hatası: Dava dosyası silinemedi.');
    }
  };

  if (selectedCaseId) {
    return <CaseDetail caseId={selectedCaseId} onBack={() => setSelectedCaseId(null)} />;
  }

  const displayCases = cases.filter(c => {
    if (!q || !q.trim()) return true;
    const qNorm = normalizeTr(q);
    const titleMatch = normalizeTr(c.title || '').includes(qNorm);
    const partyMatch = Array.isArray(c.parties) && c.parties.some(p => p?.adi && normalizeTr(p.adi).includes(qNorm));
    return titleMatch || partyMatch;
  });

  return (
    <div className="flex-1 flex flex-col gap-6 p-3 bg-[var(--color-bg-base)] text-[var(--color-text)] cyber-juris font-sans overflow-y-auto min-h-full">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-1">
        <div>
          <h1 className="text-[34px] font-extrabold text-[var(--color-text)] tracking-tight leading-none mb-2 uppercase">
            DOSYA ARŞİVİ
          </h1>
          <p className="font-mono text-[12px] text-[var(--color-text-muted)] font-semibold tracking-widest uppercase">
            AKTİF VE KAPANMIŞ TÜM DAVA DOSYALARININ DİJİTAL DÖKÜMÜ.
          </p>
        </div>

        {/* Search & New Case Action Tools */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-divider)] focus-within:border-[#3B82F6] rounded-xl px-3 py-2 shadow-sm w-full md:w-72 transition-all relative">
            <svg className="w-4 h-4 text-[var(--color-text-muted)] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="DOSYA VEYA TARAF ARA..." 
              value={q}
              onChange={e => setQ(e.target.value)}
              className="bg-transparent border-none outline-none text-[var(--color-text)] font-mono text-[12px] tracking-wider w-full uppercase placeholder-[#94A3B8] pr-5"
            />
            {q && (
              <button 
                onClick={() => setQ('')}
                className="absolute right-3 text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[12px] font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2 rounded-xl font-bold text-[13px] tracking-wide transition-all shadow-lg shadow-[#3B82F6]/25 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline text-white">Yeni Dosya</span>
          </button>
        </div>
      </div>

      {/* Active Search Filter Pill Row */}
      {q.trim() && (
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-bg-glow)] border border-[var(--color-divider)] text-[#3B82F6] font-mono text-[11px] px-3 py-1 rounded-lg flex items-center gap-2 shadow-sm font-semibold">
            <span>ARAMA: &quot;{q}&quot;</span>
            <button onClick={() => setQ('')} className="hover:text-[var(--color-text)] cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {/* Main Glass Case Archive Table Container */}
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl overflow-hidden shadow-sm">
        
        {/* Top Highlight Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>

        <div className="overflow-x-auto cyber-juris-scroll">
          <table className="w-full text-left border-collapse">
            
            {/* Table Header */}
            <thead>
              <tr className="border-b border-[var(--color-divider)] bg-[var(--color-bg-glow)] text-[11px] font-mono font-bold tracking-widest text-[var(--color-text-muted)] uppercase">
                <th className="py-4 px-6">DOSYA ID</th>
                <th className="py-4 px-6">TARAFLAR</th>
                <th className="py-4 px-6">DURUM</th>
                <th className="py-4 px-6">SON İŞLEM</th>
                <th className="py-4 px-6 text-right"></th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[var(--color-divider)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--color-text-muted)] font-mono text-[13px] animate-pulse">
                    Dava dosyaları yükleniyor...
                  </td>
                </tr>
              ) : displayCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--color-text-muted)] font-mono text-[13px]">
                    Kayıtlı dava dosyası bulunamadı.
                  </td>
                </tr>
              ) : (
                displayCases.map((c) => {
                  const dosyaNo = c.title.split(' ')[0] || 'Esas Kaydı';
                  const tarafMain = c.title;
                  const tarafSub = c.parties?.[0]?.adi ? `v. ${c.parties[0].adi}` : '';
                  const durumText = 'AKTİF';
                  const sonIslemMain = 'Dosya Kaydı Oluşturuldu';
                  const sonIslemDate = new Date(c.created_at).toLocaleDateString('tr-TR');

                  const badgeStyle = 'bg-[#00E699]/15 border-[#00E699]/40 text-[#00E699]';

                  return (
                    <tr 
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className="group hover:bg-[var(--color-bg-glow)] transition-all duration-200 cursor-pointer"
                    >
                      {/* DOSYA ID */}
                      <td className="py-4 px-6 font-mono font-bold text-[var(--color-text)] text-[14px] whitespace-nowrap">
                        {dosyaNo}
                      </td>

                      {/* TARAFLAR */}
                      <td className="py-4 px-6">
                        <div className="text-[15px] font-bold text-[var(--color-text)] group-hover:text-[#3B82F6] transition-colors leading-snug">
                          {tarafMain}
                        </div>
                        <div className="text-[12px] text-[var(--color-text-muted)] font-medium mt-0.5">
                          {tarafSub}
                        </div>
                      </td>

                      {/* DURUM BADGE */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center font-mono text-[11px] font-bold px-3 py-1 rounded-lg border uppercase tracking-wider ${badgeStyle}`}>
                          {durumText}
                        </span>
                      </td>

                      {/* SON İŞLEM */}
                      <td className="py-4 px-6">
                        <div className="text-[13px] font-medium text-[var(--color-text)]">
                          {sonIslemMain}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--color-text-muted)] mt-0.5">
                          {sonIslemDate}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleDelete(c.id, e)}
                            className="text-[#64748B] hover:text-[#FB7185] p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Sil"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <div className="p-1 text-[#64748B] group-hover:text-white group-hover:translate-x-1 transition-all">
                            →
                          </div>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Footer / Pagination Controls */}
      <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[#64748B]">
        <div className="tracking-wider uppercase">
          TOPLAM {cases.length} KAYIT {q.trim() ? `(${displayCases.length} GÖSTERİLİYOR)` : ''}
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl bg-[#151C2C] border border-[#1E293B] hover:border-[#3B82F6]/50 text-[#8C9BB4] hover:text-white transition-all cursor-pointer">
            ‹
          </button>
          <button className="p-2 rounded-xl bg-[#151C2C] border border-[#1E293B] hover:border-[#3B82F6]/50 text-[#8C9BB4] hover:text-white transition-all cursor-pointer">
            ›
          </button>
        </div>
      </div>

      {/* Modal for Creating New Case */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-[#151C2C] border border-[#26334D] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent"></div>

            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <h2 className="text-[18px] font-bold text-white tracking-tight">Yeni Dava Dosyası Ekle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#64748B] hover:text-white text-[18px]">✕</button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-mono text-[#8C9BB4] uppercase tracking-wider block mb-1.5">Dosya Adı / Esas No</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder='Örn: 2024/145 E. Kozmos vs. Demirtaş' 
                  value={newCaseTitle} 
                  onChange={e => setNewCaseTitle(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitNewCase();
                    if (e.key === 'Escape') setIsModalOpen(false);
                  }}
                  className="w-full bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[14px] text-white outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#1E293B] text-[#94A3B8] hover:text-white text-[13px] font-semibold transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={submitNewCase}
                disabled={creating || !newCaseTitle.trim()}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-lg shadow-[#3B82F6]/25 transition-all disabled:opacity-50"
              >
                {creating ? 'Oluşturuluyor...' : 'Dosya Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}