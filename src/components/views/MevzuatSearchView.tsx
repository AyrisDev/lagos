'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, BookOpen, FileText, Scale, ExternalLink, Copy, Check, Sparkles, Filter, ChevronRight, WifiOff } from 'lucide-react';
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

interface MevzuatSearchViewProps {
  onSearchPrecedentForMadde?: (searchPhrase: string) => void;
}

const POPULAR_LAWS = [
  { no: '6100', name: 'HMK', fullName: 'Hukuk Muhakemeleri Kanunu' },
  { no: '5237', name: 'TCK', fullName: 'Türk Ceza Kanunu' },
  { no: '5271', name: 'CMK', fullName: 'Ceza Muhakemesi Kanunu' },
  { no: '4721', name: 'TMK', fullName: 'Türk Medeni Kanunu' },
  { no: '6098', name: 'TBK', fullName: 'Türk Borçlar Kanunu' },
  { no: '2004', name: 'İİK', fullName: 'İcra ve İflas Kanunu' },
  { no: '2577', name: 'İYUK', fullName: 'İdari Yargılama Usulü' },
  { no: '4857', name: 'İŞK', fullName: 'İş Kanunu' },
  { no: '6102', name: 'TTK', fullName: 'Türk Ticaret Kanunu' },
];

export function MevzuatSearchView({ onSearchPrecedentForMadde }: MevzuatSearchViewProps) {
  const [selectedLawNo, setSelectedLawNo] = useState<string>('6100');
  const [maddeNoQuery, setMaddeNoQuery] = useState('');
  const [keywordQuery, setKeywordQuery] = useState('');
  const [results, setResults] = useState<MaddeItem[]>([]);
  const [selectedMadde, setSelectedMadde] = useState<MaddeItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isOfflineResult, setIsOfflineResult] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setIsOfflineResult(false);
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
        `, { count: 'exact' })
        .limit(40);

      if (selectedLawNo) {
        const { data: mevzuatList } = await supabase
          .from('mevzuat')
          .select('id')
          .eq('mevzuat_no', selectedLawNo)
          .limit(1);

        if (mevzuatList && mevzuatList.length > 0) {
          query = query.eq('mevzuat_id', mevzuatList[0].id);
        }
      }

      if (maddeNoQuery.trim()) {
        const cleanNo = maddeNoQuery.replace(/[^0-9A-Za-z]/g, '').trim();
        if (cleanNo) {
          query = query.eq('madde_no', cleanNo);
        }
      }

      if (keywordQuery.trim() && !maddeNoQuery.trim()) {
        query = query.ilike('metin', `%${keywordQuery.trim()}%`);
      }

      const { data, count, error } = await query;
      if (!error && data && data.length > 0) {
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
        setTotalCount(count || formatted.length);
        setSelectedMadde(formatted[0]);

        // Yerel önbelleğe kaydet
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
        const offlineResults = await searchOfflineMevzuat(selectedLawNo, maddeNoQuery || keywordQuery);
        if (offlineResults.length > 0) {
          setIsOfflineResult(true);
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
          setTotalCount(formattedOffline.length);
          setSelectedMadde(formattedOffline[0]);
        } else {
          setResults([]);
          setTotalCount(0);
          setSelectedMadde(null);
        }
      }
    } catch (e) {
      console.error('Mevzuat arama hatası, offline fallback:', e);
      const offlineResults = await searchOfflineMevzuat(selectedLawNo, maddeNoQuery || keywordQuery);
      if (offlineResults.length > 0) {
        setIsOfflineResult(true);
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
        setTotalCount(formattedOffline.length);
        setSelectedMadde(formattedOffline[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedLawNo, maddeNoQuery, keywordQuery]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden bg-[var(--color-bg-base)]">
      {/* Üst Filtre ve Hızlı Kanun Seçim Alanı */}
      <div className="p-4 sm:p-5 border-b border-[var(--color-divider)] bg-[var(--color-surface)] flex flex-col gap-3.5 shrink-0 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[var(--color-text)] flex items-center gap-2">
                <span>Resmi Mevzuat Külliyatı</span>
                <span className="text-[11px] font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 px-2 py-0.5 rounded-full font-bold">
                  891 Kanun · 26.933 Madde (CDN Aktif)
                </span>
                {isOfflineResult && (
                  <span className="text-[11px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    <span>Yerel Çevrimdışı Depo</span>
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="text-[12px] font-mono text-[var(--color-text-muted)]">
            {totalCount !== null && <span>{totalCount} madde listelendi</span>}
          </div>
        </div>

        {/* Temel Kanun Butonları */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10.5px] font-mono font-bold text-[var(--color-text-muted)] mr-1">TEMEL KANUNLAR:</span>
          {POPULAR_LAWS.map(law => (
            <button
              key={law.no}
              type="button"
              onClick={() => {
                setSelectedLawNo(law.no);
                setMaddeNoQuery('');
              }}
              className={`px-3 py-1.5 rounded-xl text-[11.5px] font-mono transition-all cursor-pointer ${
                selectedLawNo === law.no
                  ? 'bg-[#3B82F6] text-white font-bold shadow-md shadow-[#3B82F6]/20'
                  : 'bg-[var(--color-bg-base)] border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[#3B82F6]/50'
              }`}
            >
              {law.name} ({law.no})
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedLawNo('')}
            className={`px-3 py-1.5 rounded-xl text-[11.5px] font-mono transition-all cursor-pointer ${
              selectedLawNo === ''
                ? 'bg-[#3B82F6] text-white font-bold shadow-md shadow-[#3B82F6]/20'
                : 'bg-[var(--color-bg-base)] border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Tüm Kanunlar (891)
          </button>
        </div>

        {/* Arama Kutuları */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4 flex items-center bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus-within:border-[#3B82F6] rounded-xl px-3.5 py-2 shadow-inner">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] mr-2 shrink-0" />
            <input 
              type="text"
              placeholder="Madde No (Örn: 119, 49, 86)..."
              value={maddeNoQuery}
              onChange={e => setMaddeNoQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] text-[var(--color-text)] font-mono w-full"
            />
          </div>

          <div className="sm:col-span-8 flex items-center bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus-within:border-[#3B82F6] rounded-xl px-3.5 py-2 shadow-inner">
            <FileText className="w-4 h-4 text-[var(--color-text-muted)] mr-2 shrink-0" />
            <input 
              type="text"
              placeholder="Madde metninde veya başlığında kelime ara (Örn: haksız fiil zamanaşımı, ihtiyati tedbir)..."
              value={keywordQuery}
              onChange={e => setKeywordQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] text-[var(--color-text)] font-sans w-full"
            />
          </div>
        </div>
      </div>

      {/* İçerik Alanı: 2 Sütunlu Madde Gezgini */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
        {/* Sol Sütun: Madde Listesi */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-[var(--color-divider)] overflow-y-auto cyber-juris-scroll p-3 flex flex-col gap-2 bg-[var(--color-surface)]">
          {loading ? (
            <div className="py-20 text-center text-xs font-mono text-[var(--color-text-muted)] animate-pulse">
              Mevzuat maddeleri yükleniyor...
            </div>
          ) : results.length === 0 ? (
            <div className="py-20 text-center text-xs font-mono text-[var(--color-text-muted)]">
              Kriterlere uygun kanun maddesi bulunamadı.
            </div>
          ) : (
            results.map(item => {
              const isSelected = selectedMadde?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedMadde(item)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#3B82F6]/15 border-[#3B82F6]/50 text-[var(--color-text)] shadow-sm'
                      : 'bg-[var(--color-bg-base)] border-[var(--color-divider)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-[13px] text-[#3B82F6]">
                      Madde {item.madde_no}
                    </span>
                    <span className="text-[10.5px] font-mono text-[var(--color-text-muted)]">
                      {item.mevzuat?.mevzuat_no ? `${item.mevzuat.mevzuat_no} SK.` : ''}
                    </span>
                  </div>
                  <div className="font-semibold text-[12px] text-[var(--color-text)] truncate">
                    {item.baslik || (item.mevzuat?.ad ? `${item.mevzuat.ad}` : 'Kanun Maddesi')}
                  </div>
                  <div className="text-[11.5px] text-[var(--color-text-muted)] line-clamp-2 mt-1 leading-relaxed">
                    {item.metin}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sağ Sütun: Madde Detayı & Emsal İçtihat Köprüsü */}
        <div className="md:col-span-7 lg:col-span-8 p-6 sm:p-8 overflow-y-auto cyber-juris-scroll bg-[var(--color-bg-base)] flex flex-col justify-between">
          {selectedMadde ? (
            <div className="max-w-3xl flex flex-col gap-5">
              {/* Başlık Kartı */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-bold text-[#3B82F6] px-2.5 py-1 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30">
                      {selectedMadde.mevzuat?.mevzuat_no || ''} Sayılı Kanun
                    </span>
                    <span className="text-[15px] font-bold text-[var(--color-text)]">
                      Madde {selectedMadde.madde_no} {selectedMadde.baslik ? `— ${selectedMadde.baslik}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(`${selectedMadde.mevzuat?.ad || ''} m. ${selectedMadde.madde_no}\n\n${selectedMadde.metin}`)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-bg-base)] hover:bg-[var(--color-divider)] text-[12px] font-mono text-[var(--color-text)] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-[12px] text-[var(--color-text-muted)] font-mono">
                  {selectedMadde.mevzuat?.ad}
                </div>
              </div>

              {/* Madde Metni */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 shadow-sm">
                <h3 className="text-[11.5px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                  RESMİ MADDE METNİ
                </h3>
                <div className="text-[14px] text-[var(--color-text)] leading-[1.8] whitespace-pre-wrap font-sans">
                  {selectedMadde.metin}
                </div>
              </div>

              {/* İlgili Emsal Kararları Arama Köprüsü (Action Banner) */}
              {onSearchPrecedentForMadde && (
                <div className="bg-gradient-to-r from-[#3B82F6]/15 via-[#3B82F6]/10 to-transparent border border-[#3B82F6]/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center text-white shadow-md shadow-[#3B82F6]/30 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-bold text-[var(--color-text)]">
                        Bu Maddeye Dayanan Yargıtay & Emsal Kararları
                      </h4>
                      <p className="text-[11.5px] text-[var(--color-text-muted)]">
                        {selectedMadde.mevzuat?.mevzuat_no} SK. m. {selectedMadde.madde_no} ({selectedMadde.baslik || ''}) ile ilgili tüm yüksek yargı içtihatlarını görüntüleyin.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const phrase = `${selectedMadde.mevzuat?.mevzuat_no || ''} sayılı kanun madde ${selectedMadde.madde_no} ${selectedMadde.baslik || ''}`;
                      onSearchPrecedentForMadde(phrase);
                    }}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2.5 rounded-xl text-[12.5px] font-bold transition-all shadow-md shadow-[#3B82F6]/25 flex items-center gap-2 cursor-pointer"
                  >
                    <span>Emsal Kararları Bul</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* CDN Kaynak Bilgisi */}
              {selectedMadde.cdn_url && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-divider)] px-4 py-2.5 rounded-xl">
                  <span className="text-[#10B981]">●</span>
                  <span>Cloudflare CDN Doğrulandı:</span>
                  <a 
                    href={selectedMadde.cdn_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[#3B82F6] hover:underline truncate"
                  >
                    {selectedMadde.cdn_url}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-muted)] text-xs font-mono py-20">
              Detayları ve emsal kararları görüntülemek için soldan bir madde seçin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
