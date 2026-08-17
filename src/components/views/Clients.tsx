import { ClientDetail } from './ClientDetail';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ClientRow } from '@/types';
import { formatTL } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

export function Clients() {
  const { toast, confirm } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Bireysel' | 'Kurumsal'>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Bireysel' | 'Kurumsal'>('Kurumsal');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [{ data: clientsData }, { data: ledgerData }] = await Promise.all([
        supabase.from('clients').select('id, name, client_type, notes, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('client_ledger').select('client_id, amount, entry_type').eq('user_id', user.id),
      ]);
      setClients((clientsData as ClientRow[]) || []);
      const balanceMap: Record<string, number> = {};
      ((ledgerData as { client_id: string; amount: number; entry_type: string }[]) || []).forEach(l => {
        balanceMap[l.client_id] = (balanceMap[l.client_id] || 0) + (l.entry_type === 'alacak' ? l.amount : -l.amount);
      });
      setBalances(balanceMap);
    } catch {
      // Ignore background errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { (async () => { await loadClients(); })(); }, [loadClients]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('clients').insert([{ user_id: user.id, name: newName.trim(), client_type: newType, notes: newNotes.trim() || null }]);
      if (!error) {
        setIsModalOpen(false);
        setNewName(''); setNewType('Kurumsal'); setNewNotes('');
        await loadClients();
        toast.success('Yeni müvekkil başarıyla kaydedildi.');
      } else {
        toast.error('Müvekkil kaydedilirken bir hata oluştu.');
      }
    } catch {
      toast.error('Bağlantı hatası: Müvekkil kaydedilemedi.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Müvekkil Kaydını Sil',
      message: 'Bu müvekkili ve ilişkili tüm cari hesap/bakiye hareketlerini silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) {
      setClients(prev => prev.filter(c => c.id !== id));
      toast.success('Müvekkil kaydı silindi.');
    } else {
      toast.error('Müvekkil silinirken bir hata oluştu.');
    }
  };

  if (selectedClientId) {
    return <ClientDetail clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />;
  }

  const displayList = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const normType = (c.client_type === 'Corporate' || c.client_type === 'Kurumsal') ? 'Kurumsal' : 'Bireysel';
    const matchesType = filterType === 'ALL' || normType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-1 flex flex-col gap-6 p-3 bg-[var(--color-bg-base)] text-[var(--color-text)] cyber-juris font-sans overflow-y-auto min-h-full">
      
      {/* Üst Başlık ve Arama Araçları */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-1">
        <div>
          <h1 className="text-[30px] sm:text-[34px] font-extrabold text-[var(--color-text)] tracking-tight leading-none mb-2">
            Müvekkiller
          </h1>
          <p className="text-[13.5px] text-[var(--color-text-muted)] font-medium">
            Müvekkil listesi, iletişim bilgileri ve cari bakiye takip paneli.
          </p>
        </div>

        {/* Arama, Filtreleme ve Ekleme Butonları */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-divider)] focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent-light)] rounded-xl px-3 py-2 shadow-sm w-full md:w-64 transition-all">
            <svg className="w-4 h-4 text-[var(--color-text-muted)] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Müvekkillerde ara..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[var(--color-text)] text-[13px] w-full placeholder-[var(--color-text-muted)]"
            />
          </div>

          <button 
            onClick={() => setFilterType(prev => prev === 'ALL' ? 'Kurumsal' : prev === 'Kurumsal' ? 'Bireysel' : 'ALL')}
            className={`p-2.5 rounded-xl border transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5 ${
              filterType !== 'ALL' 
                ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)] text-[var(--color-accent)] font-semibold' 
                : 'bg-[var(--color-surface)] border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            title={`Tür Filtresi: ${filterType === 'ALL' ? 'Tümü' : filterType}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {filterType !== 'ALL' && (
              <span className="text-[12px] pr-1">{filterType}</span>
            )}
          </button>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[var(--color-accent)] hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold text-[13px] tracking-wide transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-white">Yeni Müvekkil</span>
          </button>
        </div>
      </div>

      {/* Müvekkil Tablosu */}
      <div className="relative bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto cyber-juris-scroll">
          <table className="w-full text-left border-collapse">
            
            {/* Tablo Başlıkları */}
            <thead>
              <tr className="border-b border-[var(--color-divider)] bg-[var(--color-bg-glow)] text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
                <th className="py-4 px-6">MÜVEKKİL ADI</th>
                <th className="py-4 px-6">TÜR</th>
                <th className="py-4 px-6">İLETİŞİM / NOTLAR</th>
                <th className="py-4 px-6 text-right">İŞLEM</th>
              </tr>
            </thead>

            {/* Tablo Gövdesi */}
            <tbody className="divide-y divide-[var(--color-divider)]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[var(--color-text-muted)] text-[13px] animate-pulse">
                    Müvekkil listesi yükleniyor...
                  </td>
                </tr>
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[var(--color-text-muted)] text-[13px]">
                    Kayıtlı müvekkil bulunamadı.
                  </td>
                </tr>
              ) : (
                displayList.map((c: ClientRow & { email?: string; phone?: string }) => {
                  const isCorporate = c.client_type === 'Kurumsal' || c.client_type === 'Corporate';
                  const bal = balances[c.id] || 0;

                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => !c.id.startsWith('demo') && setSelectedClientId(c.id)}
                      className="group hover:bg-[var(--color-surface-hover)] transition-colors duration-150 cursor-pointer"
                    >
                      {/* MÜVEKKİL ADI ve İkon */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                            isCorporate 
                              ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)]/30 text-[var(--color-accent)]' 
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isCorporate ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M9 8h.01M15 16h.01M15 12h.01M15 8h.01" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          
                          <div>
                            <div className="text-[14.5px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors leading-snug">
                              {c.name}
                            </div>
                            {bal !== 0 && (
                              <div className={`text-[11.5px] font-mono font-semibold mt-0.5 ${bal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {formatTL(Math.abs(bal))} {bal > 0 ? 'Alacak' : 'Borç'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* TÜR Rozeti */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center text-[11.5px] px-3 py-1 rounded-full border font-semibold ${
                          isCorporate 
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' 
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isCorporate ? 'Kurumsal' : 'Bireysel'}
                        </span>
                      </td>

                      {/* İLETİŞİM / NOTLAR */}
                      <td className="py-4 px-6">
                        <div className="text-[13px] text-[var(--color-text-muted)] truncate max-w-sm">
                          {c.email || c.notes || '—'}
                        </div>
                        {c.phone && (
                          <div className="text-[11.5px] text-[var(--color-text-muted)] font-mono mt-0.5">
                            {c.phone}
                          </div>
                        )}
                      </td>

                      {/* İŞLEMLER */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {!c.id.startsWith('demo') && (
                            <button 
                              onClick={(e) => handleDelete(c.id, e)}
                              className="text-[var(--color-text-muted)] hover:text-rose-500 p-2 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Sil"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <div className="p-1.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
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

      {/* Yeni Müvekkil Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-4">
              <h2 className="text-[18px] font-bold text-[var(--color-text)] tracking-tight">Yeni Müvekkil Ekle</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[18px] p-1 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11.5px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
                  Müvekkil Adı / Ünvanı
                </label>
                <input 
                  type="text" 
                  placeholder="Örn: Ahmet Yılmaz veya ABC Ltd. Şti." 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text)] outline-none transition-all placeholder-[var(--color-text-muted)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
                  Müvekkil Türü
                </label>
                <select 
                  value={newType} 
                  onChange={e => setNewType(e.target.value as 'Bireysel' | 'Kurumsal')}
                  className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)] rounded-xl px-4 py-2.5 text-[14px] text-[var(--color-text)] outline-none transition-all cursor-pointer"
                >
                  <option value="Kurumsal">Kurumsal</option>
                  <option value="Bireysel">Bireysel</option>
                </select>
              </div>

              <div>
                <label className="text-[11.5px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1.5">
                  İletişim & Notlar
                </label>
                <textarea 
                  placeholder="E-posta, telefon, T.C./Vergi No veya ek notlar..." 
                  value={newNotes} 
                  onChange={e => setNewNotes(e.target.value)} 
                  className="w-full bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-light)] rounded-xl px-4 py-2.5 text-[13px] text-[var(--color-text)] outline-none transition-all resize-none h-24 placeholder-[var(--color-text-muted)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-divider)]">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] text-[13px] font-semibold transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button 
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="bg-[var(--color-accent)] hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Ekleniyor...' : 'Müvekkil Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}