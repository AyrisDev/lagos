'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, BookOpen, Check, X, Loader2, FileText, ArrowRight } from 'lucide-react';
import { saveMaddelerToOffline, searchOfflineMevzuat } from '@/lib/mevzuatOfflineStore';

interface MevzuatItem {
  id: string;
  ad: string;
  mevzuat_no: string;
  tur: string;
}

interface MaddeItem {
  id: string;
  madde_no: string;
  baslik: string | null;
  metin: string;
  cdn_url: string | null;
  mevzuat_id: string;
  mevzuat?: MevzuatItem;
}

interface MevzuatInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (htmlContent: string) => void;
}

// En sık kullanılan temel kanunlar listesi (Hızlı seçim için)
const POPULAR_LAWS = [
  { no: '6100', name: 'HMK (Hukuk Muhakemeleri Kanunu)' },
  { no: '5237', name: 'TCK (Türk Ceza Kanunu)' },
  { no: '5271', name: 'CMK (Ceza Muhakemesi Kanunu)' },
  { no: '4721', name: 'TMK (Türk Medeni Kanunu)' },
  { no: '6098', name: 'TBK (Türk Borçlar Kanunu)' },
  { no: '2004', name: 'İİK (İcra ve İflas Kanunu)' },
  { no: '2577', name: 'İYUK (İdari Yargılama Usulü)' },
  { no: '4857', name: 'İŞK (İş Kanunu)' },
  { no: '6102', name: 'TTK (Türk Ticaret Kanunu)' },
];

export function MevzuatInsertModal({ isOpen, onClose, onInsert }: MevzuatInsertModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLawNo, setSelectedLawNo] = useState<string>('6100');
  const [maddeQuery, setMaddeQuery] = useState('');
  const [results, setResults] = useState<MaddeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMadde, setSelectedMadde] = useState<MaddeItem | null>(null);

  // Arama Fonksiyonu
  const searchMevzuat = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('mevzuat_madde')
        .select(`
          id,
          madde_no,
          baslik,
          metin,
          cdn_url,
          mevzuat_id,
          mevzuat:mevzuat_id ( id, ad, mevzuat_no, tur )
        `)
        .limit(25);

      if (selectedLawNo) {
        // Belirli bir kanun seçiliyse önce onun mevzuat_id'sini bul
        const { data: mevzuatList } = await supabase
          .from('mevzuat')
          .select('id')
          .eq('mevzuat_no', selectedLawNo)
          .limit(1);

        if (mevzuatList && mevzuatList.length > 0) {
          query = query.eq('mevzuat_id', mevzuatList[0].id);
        }
      }

      if (maddeQuery.trim()) {
        const cleanNo = maddeQuery.replace(/[^0-9A-Za-z]/g, '').trim();
        if (cleanNo) {
          query = query.eq('madde_no', cleanNo);
        }
      }

      if (searchQuery.trim() && !maddeQuery.trim()) {
        query = query.ilike('metin', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        // Supabase join array/object normalization
        const formatted: MaddeItem[] = data.map((item: any) => ({
          id: item.id,
          madde_no: item.madde_no,
          baslik: item.baslik,
          metin: item.metin,
          cdn_url: item.cdn_url,
          mevzuat_id: item.mevzuat_id,
          mevzuat: Array.isArray(item.mevzuat) ? item.mevzuat[0] : item.mevzuat,
        }));
        setResults(formatted);
        setSelectedMadde(formatted[0]);

        // Yerel önbelleğe (IndexedDB) arka planda kaydet
        saveMaddelerToOffline(formatted.map(f => ({
          id: f.id,
          madde_no: f.madde_no,
          baslik: f.baslik,
          metin: f.metin,
          cdn_url: f.cdn_url,
          mevzuat_id: f.mevzuat_id,
          mevzuat_no: f.mevzuat?.mevzuat_no,
          mevzuat_ad: f.mevzuat?.ad,
        })));
      } else {
        // Çevrimdışı (Offline) fallback dene
        const offlineResults = await searchOfflineMevzuat(selectedLawNo, maddeQuery || searchQuery);
        if (offlineResults.length > 0) {
          const formattedOffline: MaddeItem[] = offlineResults.map(o => ({
            id: o.id,
            madde_no: o.madde_no,
            baslik: o.baslik,
            metin: o.metin,
            cdn_url: o.cdn_url,
            mevzuat_id: o.mevzuat_id,
            mevzuat: {
              id: o.mevzuat_id,
              ad: o.mevzuat_ad || 'Kanun',
              mevzuat_no: o.mevzuat_no || selectedLawNo,
              tur: 'kanun',
            }
          }));
          setResults(formattedOffline);
          setSelectedMadde(formattedOffline[0]);
        } else {
          setResults([]);
          setSelectedMadde(null);
        }
      }
    } catch (e) {
      console.error('Mevzuat arama hatası, offline fallback deneniyor:', e);
      const offlineResults = await searchOfflineMevzuat(selectedLawNo, maddeQuery || searchQuery);
      if (offlineResults.length > 0) {
        const formattedOffline: MaddeItem[] = offlineResults.map(o => ({
          id: o.id,
          madde_no: o.madde_no,
          baslik: o.baslik,
          metin: o.metin,
          cdn_url: o.cdn_url,
          mevzuat_id: o.mevzuat_id,
          mevzuat: {
            id: o.mevzuat_id,
            ad: o.mevzuat_ad || 'Kanun',
            mevzuat_no: o.mevzuat_no || selectedLawNo,
            tur: 'kanun',
          }
        }));
        setResults(formattedOffline);
        setSelectedMadde(formattedOffline[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedLawNo, maddeQuery, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      searchMevzuat();
    }
  }, [isOpen, searchMevzuat]);

  if (!isOpen) return null;

  const handleInsertSelected = () => {
    if (!selectedMadde) return;
    const lawName = selectedMadde.mevzuat?.ad || `${selectedMadde.mevzuat?.mevzuat_no || ''} Sayılı Kanun`;
    const title = selectedMadde.baslik ? ` - ${selectedMadde.baslik}` : '';
    const header = `<strong>${selectedMadde.mevzuat?.mevzuat_no || ''} Sayılı ${lawName} m. ${selectedMadde.madde_no}${title}:</strong>`;
    const body = selectedMadde.metin.replace(/\n/g, '<br />');

    const htmlToInsert = `<blockquote>${header}<br /><em>${body}</em></blockquote><p></p>`;
    onInsert(htmlToInsert);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        onClick={e => e.stopPropagation()} 
        className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden relative animate-fadeIn"
      >
        {/* Modal Başlığı */}
        <div className="px-6 py-4 border-b border-[var(--color-divider)] flex items-center justify-between bg-[var(--color-bg-base)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[var(--color-text)] flex items-center gap-2">
                <span>Mevzuat Maddesi Alıntıla</span>
                <span className="text-[10.5px] font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-2 py-0.5 rounded font-bold">
                  26.900+ Madde (CDN Aktif)
                </span>
              </h2>
              <p className="text-[11.5px] text-[var(--color-text-muted)]">
                Resmi kanun maddesini tek tıkla dilekçenize hukuki alıntı olarak ekleyin.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hızlı Kanun Seçim Çubuğu */}
        <div className="px-6 py-3 border-b border-[var(--color-divider)] bg-[var(--color-surface)] flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-mono font-bold text-[var(--color-text-muted)] mr-1">TEMEL KANUNLAR:</span>
          {POPULAR_LAWS.map(law => (
            <button
              key={law.no}
              type="button"
              onClick={() => {
                setSelectedLawNo(law.no);
                setMaddeQuery('');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                selectedLawNo === law.no
                  ? 'bg-[#3B82F6] text-white font-bold shadow-sm'
                  : 'bg-[var(--color-bg-base)] border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[#3B82F6]/50'
              }`}
            >
              {law.name.split(' ')[0]} ({law.no})
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedLawNo('')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
              selectedLawNo === ''
                ? 'bg-[#3B82F6] text-white font-bold shadow-sm'
                : 'bg-[var(--color-bg-base)] border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Tüm Kanunlar (891)
          </button>
        </div>

        {/* Arama Filtreleri */}
        <div className="px-6 py-3 border-b border-[var(--color-divider)] bg-[var(--color-bg-base)] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-divider)] focus-within:border-[#3B82F6] rounded-xl px-3 py-1.5 shadow-sm">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Madde No (Örn: 119, 49, 86)..."
              value={maddeQuery}
              onChange={e => setMaddeQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[12px] text-[var(--color-text)] font-mono w-full"
            />
          </div>

          <div className="md:col-span-2 flex items-center bg-[var(--color-surface)] border border-[var(--color-divider)] focus-within:border-[#3B82F6] rounded-xl px-3 py-1.5 shadow-sm">
            <FileText className="w-4 h-4 text-[var(--color-text-muted)] mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Madde metninde veya başlığında kelime ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[12px] text-[var(--color-text)] font-sans w-full"
            />
          </div>
        </div>

        {/* Sonuçlar ve Önizleme (2 Sütun) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[350px]">
          {/* Sol: Madde Listesi */}
          <div className="md:col-span-5 border-r border-[var(--color-divider)] overflow-y-auto cyber-juris-scroll p-3 flex flex-col gap-1.5 bg-[var(--color-surface)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)] gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#3B82F6]" />
                <span className="text-xs font-mono">Mevzuat aranıyor...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 text-[var(--color-text-muted)] text-xs font-mono">
                Eşleşen madde bulunamadı.
              </div>
            ) : (
              results.map(item => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedMadde(item)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedMadde?.id === item.id 
                      ? 'bg-[#3B82F6]/15 border-[#3B82F6]/50 text-[var(--color-text)] shadow-sm'
                      : 'bg-[var(--color-bg-base)] border-[var(--color-divider)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-[12px] text-[#3B82F6]">
                      Madde {item.madde_no}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                      {item.mevzuat?.mevzuat_no ? `${item.mevzuat.mevzuat_no} SK.` : ''}
                    </span>
                  </div>
                  <div className="font-semibold text-[11.5px] text-[var(--color-text)] truncate">
                    {item.baslik || (item.mevzuat?.ad ? `${item.mevzuat.ad}` : 'Kanun Maddesi')}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                    {item.metin}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sağ: Seçili Madde Tam Metin Önizleme */}
          <div className="md:col-span-7 p-5 overflow-y-auto cyber-juris-scroll bg-[var(--color-bg-base)] flex flex-col justify-between">
            {selectedMadde ? (
              <div className="flex flex-col gap-3">
                <div className="border-b border-[var(--color-divider)] pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-bold text-[#3B82F6] px-2 py-0.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30">
                      {selectedMadde.mevzuat?.mevzuat_no || ''} Sayılı Kanun
                    </span>
                    <span className="text-[13px] font-bold text-[var(--color-text)]">
                      Madde {selectedMadde.madde_no} {selectedMadde.baslik ? `— ${selectedMadde.baslik}` : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">
                    {selectedMadde.mevzuat?.ad}
                  </div>
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-xl p-4 text-[13px] text-[var(--color-text)] leading-relaxed whitespace-pre-wrap font-sans shadow-inner max-h-[260px] overflow-y-auto cyber-juris-scroll">
                  {selectedMadde.metin}
                </div>

                {selectedMadde.cdn_url && (
                  <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[var(--color-text-muted)]">
                    <span>🌐 CDN Doğrulandı:</span>
                    <span className="truncate text-[#3B82F6]">{selectedMadde.cdn_url}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-muted)] text-xs font-mono py-12">
                Önizlemek ve dilekçeye eklemek için soldan bir madde seçin.
              </div>
            )}

            {/* Ekle Butonu */}
            <div className="mt-4 pt-3 border-t border-[var(--color-divider)] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[12px] font-mono text-[var(--color-text-muted)] hover:bg-[var(--color-divider)] transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleInsertSelected}
                disabled={!selectedMadde}
                className="bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white px-5 py-2 rounded-xl text-[12.5px] font-bold transition-all shadow-md shadow-[#3B82F6]/20 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Dilekçeye Alıntı Olarak Ekle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
