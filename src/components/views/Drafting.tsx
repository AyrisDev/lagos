import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/constants';
import * as localData from '@/lib/localData';
import { exportDraftAsWord, exportDraftAsPdf, exportDraftAsUdf, stripHtml } from '@/lib/utils';
import { TiptapPetitionEditor } from '@/components/editor/TiptapPetitionEditor';
import { CaseOption } from '@/types';
import {
  PETITION_CATEGORIES,
  PETITION_TYPES_CATALOG,
  getPetitionById,
  getPetitionsByCategory,
  searchPetitions,
  buildPetitionPromptContext,
  PetitionTypeItem
} from '@/lib/petitionController';

interface SavedDraft {
  id: string;
  petition_type: string;
  content: string;
  case_id: string;
  created_at: string;
  cases?: { title?: string };
}

interface TemplateOption {
  id: string;
  name: string;
  category?: string;
}

interface DraftingProps {
  initialCaseId?: string;
  initialPetitionTypeId?: string;
  hideCaseSelector?: boolean;
  onBack?: () => void;
}

export function Drafting({ initialCaseId, initialPetitionTypeId, hideCaseSelector, onBack }: DraftingProps = {}) {
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [caseId, setCaseId] = useState(initialCaseId || '');
  
  // Dilekçe Türleri & Kategorileri State'leri
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [petitionTypeId, setPetitionTypeId] = useState<string>(initialPetitionTypeId || 'hmk-dava');
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [showGuideDetails, setShowGuideDetails] = useState<boolean>(true);

  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [aiUpdating, setAiUpdating] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  // Seçili Dilekçe Nesnesi
  const currentPetitionItem = useMemo(() => {
    return getPetitionById(petitionTypeId) || PETITION_TYPES_CATALOG[0];
  }, [petitionTypeId]);

  // Kategoriye Göre Filtrelenmiş Dilekçeler
  const availablePetitions = useMemo(() => {
    return getPetitionsByCategory(selectedCategory);
  }, [selectedCategory]);

  // Katalog Modal Araması
  const filteredCatalogItems = useMemo(() => {
    let items = catalogSearch ? searchPetitions(catalogSearch) : PETITION_TYPES_CATALOG;
    if (selectedCategory && selectedCategory !== 'all') {
      items = items.filter(i => i.categoryId === selectedCategory);
    }
    return items;
  }, [catalogSearch, selectedCategory]);

  // 1. Kullanıcının Dava Dosyalarını, Şablonlarını ve Kayıtlı Taslaklarını Yükle
  const loadDrafts = useCallback(async (selectedCaseId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('drafts')
        .select('id, petition_type, content, case_id, created_at, cases(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (selectedCaseId) {
        query = query.eq('case_id', selectedCaseId);
      }

      const { data, error: draftErr } = await query;
      if (!draftErr && data) {
        setSavedDrafts(data as unknown as SavedDraft[]);
      }
    } catch (e) {
      console.error('Drafts fetch error:', e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setCasesLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setCasesLoading(false); return; }

      // Dava Dosyaları
      const { data: caseRows } = await supabase
        .from('cases')
        .select('id, title, parties')
        .eq('user_id', user.id)
        .eq('kind', 'case')
        .order('created_at', { ascending: false });

      // Büro Şablonları
      const { data: tmplRows } = await supabase
        .from('templates')
        .select('id, name, category')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!active) return;
      if (tmplRows) setTemplates(tmplRows as TemplateOption[]);

      const rows = (caseRows as CaseOption[]) || [];
      setCases(rows);
      
      const targetCaseId = initialCaseId || (rows.length > 0 ? rows[0].id : '');
      setCaseId(targetCaseId);
      if (targetCaseId) {
        await loadDrafts(targetCaseId);
      } else {
        await loadDrafts();
      }
      
      setCasesLoading(false);
    })();
    return () => { active = false; };
  }, [initialCaseId, loadDrafts]);

  // Dava değiştiğinde ilgili taslakları filtrele
  const handleCaseChange = async (newCaseId: string) => {
    setCaseId(newCaseId);
    await loadDrafts(newCaseId);
  };

  // Kayıtlı bir taslağı düzenleyiciye yükle
  const selectDraft = (d: SavedDraft) => {
    setActiveDraftId(d.id);
    const matched = PETITION_TYPES_CATALOG.find(p => p.title === d.petition_type || p.shortTitle === d.petition_type);
    if (matched) {
      setPetitionTypeId(matched.id);
      setSelectedCategory(matched.categoryId);
    }
    setDraftContent(d.content || '');
  };

  // Örnek Notları Doldurma
  const handleFillSuggestedNotes = () => {
    if (currentPetitionItem?.suggestedNotes) {
      setUserNotes(prev => {
        if (!prev.trim()) return currentPetitionItem.suggestedNotes;
        return `${prev}\n\n[Rehber Notu]: ${currentPetitionItem.suggestedNotes}`;
      });
    }
  };

  // 2. Gerçek Yapay Zeka Dilekçe Taslağı Üretme (Gelişmiş Hukuki Kontekst ile)
  const handleGenerateDraft = async (overrideNotes?: string) => {
    if (!caseId) {
      setError('Lütfen önce bir dava dosyası seçin.');
      return;
    }

    setLoading(true);
    setError('');
    const notesToUse = overrideNotes !== undefined ? overrideNotes : userNotes;

    // Hukuki Kontekst Oluşturucu Controller Çağrısı
    const promptContext = buildPetitionPromptContext(petitionTypeId, notesToUse);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Faz 2 — son analiz artık Postgres'te kalıcı tutulmuyor; yerel
      // SQLite'tan okuyup isteğe ekliyoruz (yerelde yoksa backend kendi
      // Postgres yedeğine düşer).
      let latestAnalysisSummaryJson: unknown;
      try {
        const selectedCaseTitle = cases.find(c => c.id === caseId)?.title;
        const bundle = await localData.getCaseBundle(selectedCaseTitle, caseId);
        if (bundle.aData.length > 0) latestAnalysisSummaryJson = bundle.aData[0].summary_json;
      } catch (e) {
        console.warn('[Drafting] Yerel dava bundle\'ı okunamadı, backend Postgres yedeğine düşecek:', e);
      }

      const res = await fetch(`${API_URL}drafting/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          case_id: caseId,
          petition_type: currentPetitionItem.id || currentPetitionItem.title,
          template_id: templateId || undefined,
          notes: userNotes,
          latest_analysis_summary_json: latestAnalysisSummaryJson,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let errorMsg = data.error || 'Dilekçe oluşturulurken bir hata oluştu.';
        if (typeof errorMsg === 'string' && (errorMsg.includes('aborted') || errorMsg.includes('abort') || errorMsg.includes('timeout'))) {
          errorMsg = 'Yapay zeka yanıt verme süresi aşıldı. Lütfen tekrar deneyin.';
        }
        throw new Error(errorMsg);
      }

      setDraftContent(data.draft || '');
      if (data.draftId) setActiveDraftId(data.draftId);

      // Faz 1 çift yazma: backend'in kaydettiği taslağı (Postgres'e zaten
      // yazılmış) aynı şekilde yerel SQLite'a da yaz. IPC hazır değilse/tarayıcı
      // modundaysa sessizce atlanır — backend'in kaydı zaten kalıcı.
      try {
        const selectedCaseTitle = cases.find(c => c.id === caseId)?.title;
        const fn = (window as unknown as { electron?: { localDataSaveDraft?: (p: { caseTitle: string; draft: unknown }) => Promise<unknown> } }).electron?.localDataSaveDraft;
        if (fn && selectedCaseTitle && data.draftId) {
          await fn({
            caseTitle: selectedCaseTitle,
            draft: {
              id: data.draftId,
              petition_type: currentPetitionItem.title,
              content: data.draft || '',
              template_id: templateId || null,
              used_legislation: data.usedLegislation || null,
            },
          });
        }
      } catch (e) {
        console.warn('[Drafting] Taslak yerel SQLite\'a yazılamadı (backend kaydı etkilenmedi):', e);
      }

      // Taslak listesini güncelle
      await loadDrafts(caseId);

    } catch (err: any) {
      console.error('Dilekçe Üretim Hatası:', err);
      let errMsg = err?.message || 'Dilekçe servisine bağlanılamadı.';
      if (typeof errMsg === 'string' && (errMsg.includes('aborted') || errMsg.includes('abort') || errMsg.includes('timeout') || errMsg.includes('signal'))) {
        errMsg = 'Yapay zeka yanıt verme süresi aşıldı veya bağlantı kesildi. Lütfen tekrar deneyin.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Dilekçeyi Yapay Zeka Komutuyla Canlı Revize Etme
  const handleSendChatInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || aiUpdating || !caseId) return;

    setAiUpdating(true);
    const instruction = chatInput.trim();
    setChatInput('');

    const updatedNotes = userNotes 
      ? `${userNotes}\nEk Talimat: ${instruction}` 
      : `Ek Talimat: ${instruction}`;
    
    setUserNotes(updatedNotes);
    await handleGenerateDraft(updatedNotes);
    setAiUpdating(false);
  };

  // Çoklu Format İndirme (Word / PDF / UDF) & Kopyalama
  const handleDownloadFormat = (format: 'doc' | 'pdf' | 'udf') => {
    if (!draftContent.trim()) return;
    const selectedCase = cases.find(c => c.id === caseId);
    const label = `${selectedCase?.title || 'Dilekce'}_${currentPetitionItem.shortTitle}`;

    if (format === 'doc') {
      exportDraftAsWord(draftContent, label);
    } else if (format === 'pdf') {
      exportDraftAsPdf(draftContent, label);
    } else if (format === 'udf') {
      exportDraftAsUdf(draftContent, label);
    }
  };

  const handleCopy = () => {
    if (!draftContent) return;
    const textToCopy = /<[a-z][\s\S]*>/i.test(draftContent) ? stripHtml(draftContent) : draftContent;
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const plainTextContent = /<[a-z][\s\S]*>/i.test(draftContent) ? stripHtml(draftContent) : draftContent;
  const draftLines = plainTextContent ? plainTextContent.split('\n') : [];

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-4 p-2 sm:p-3 bg-[var(--color-bg-base)] text-[var(--color-text)] cyber-juris font-sans overflow-hidden min-h-full">
      
      {/* Sol Panel: Dilekçe Oluşturucu & Parametreler */}
      {isLeftPanelOpen && (
        <div className="w-full md:w-[320px] lg:w-[350px] bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-4 shadow-sm flex flex-col justify-between shrink-0 overflow-hidden relative animate-fadeIn">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>

          <div className="flex flex-col gap-3.5 overflow-y-auto cyber-juris-scroll flex-1 pr-0.5">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="w-7 h-7 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-divider)] hover:border-[#3B82F6] flex items-center justify-center text-[var(--color-text)] hover:text-[#3B82F6] transition-all cursor-pointer mr-0.5 shrink-0"
                    title="Dilekçeler Listesine Dön"
                  >
                    ←
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6] shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="truncate">
                  <h2 className="text-[14px] font-bold text-[var(--color-text)] tracking-tight truncate">AI Dilekçe Asistanı</h2>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono">HMK / CMK / İİK</span>
                </div>
              </div>

              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="w-7 h-7 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-divider)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-divider)] flex items-center justify-center text-[12px] cursor-pointer transition-all shrink-0 ml-2"
                title="Paneli Gizle (Genişletilmiş Düzenleyici)"
              >
                ◀
              </button>
            </div>

          {/* Form Alanı */}
          <div className="flex flex-col gap-3 shrink-0 bg-[var(--color-bg-base)] border border-[var(--color-divider)] p-3.5 rounded-xl">
            
            {/* 1. Dava Dosyası */}
            <div>
              <label className="text-[10.5px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">1. Dava Dosyası</label>
              {hideCaseSelector ? (
                <div className="w-full bg-[#0C1324] border border-[#3B82F6]/40 rounded-lg px-3 py-2 text-[12.5px] text-[#93C5FD] font-mono truncate flex items-center gap-2 shadow-inner">
                  <span className="text-[#3B82F6]">⚖️</span>
                  <span className="truncate font-semibold">{cases.find(c => c.id === caseId)?.title || 'Mevcut Dava Dosyası'}</span>
                </div>
              ) : casesLoading ? (
                <div className="text-[12px] text-[var(--color-text-muted)] font-mono animate-pulse">Dosyalar yükleniyor...</div>
              ) : (
                <select 
                  value={caseId} 
                  onChange={e => handleCaseChange(e.target.value)}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-lg px-3 py-1.5 text-[12.5px] text-[var(--color-text)] outline-none font-mono truncate"
                >
                  {cases.length === 0 && <option value="">(Kayıtlı Dava Yok)</option>}
                  {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              )}
            </div>

            {/* 2. Hukuk Alanı & Dilekçe Türü */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block">2. Hukuk Alanı ve Dilekçe Türü</label>
              
              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="w-full bg-[var(--color-surface)] hover:bg-[var(--color-divider)] border border-[var(--color-divider)] hover:border-[#3B82F6]/50 rounded-xl p-2.5 text-left transition-all flex items-center justify-between gap-2 cursor-pointer group shadow-sm"
                title="80+ Dilekçe Türü Kataloğundan Seç"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10.5px] font-mono font-bold text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-2 py-0.5 rounded shrink-0">
                    {currentPetitionItem?.lawRef || 'HMK'}
                  </span>
                  <span className="text-[12px] font-semibold text-[var(--color-text)] truncate">
                    {currentPetitionItem?.title || 'Dilekçe Türü Seçin'}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#3B82F6] group-hover:translate-x-0.5 transition-transform shrink-0 flex items-center gap-1">
                  <span>Katalog (80+)</span>
                  <span>🔍</span>
                </span>
              </button>
            </div>

            {/* Seçili Dilekçeye Özel Hukuki Rehber Kartı */}
            {currentPetitionItem && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-[#3B82F6] px-2 py-0.5 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/30">
                      {currentPetitionItem.lawRef}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--color-text)] truncate max-w-[180px]">
                      {currentPetitionItem.shortTitle}
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowGuideDetails(prev => !prev)}
                    className="text-[10px] font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
                  >
                    {showGuideDetails ? 'Gizle ▲' : 'Detay ▼'}
                  </button>
                </div>

                {showGuideDetails && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-[var(--color-divider)] text-[11px]">
                    <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
                      <span>🏛️ <strong className="text-[var(--color-text)]">Makam:</strong></span>
                      <span className="truncate">{currentPetitionItem.courtType}</span>
                    </div>

                    <div>
                      <span className="text-[10.5px] font-mono font-bold text-[var(--color-text-muted)] block mb-1">ZORUNLU HUKUKİ UNSURLAR:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentPetitionItem.keyElements.map((el, i) => (
                          <span key={i} className="text-[10px] font-mono bg-[var(--color-bg-base)] border border-[var(--color-divider)] px-1.5 py-0.5 rounded text-[var(--color-text-muted)]">
                            • {el}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleFillSuggestedNotes}
                      className="mt-1 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-[10.5px] font-mono font-bold py-1 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>💡 Tavsiye Edilen Not Şablonunu Ekle</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. Büro Şablonu */}
            <div>
              <label className="text-[10.5px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">3. Büro Şablonu (Opsiyonel)</label>
              <select 
                value={templateId} 
                onChange={e => setTemplateId(e.target.value)}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-text)] outline-none font-mono truncate"
              >
                <option value="">(Şablon Yok — Standart Format)</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    📜 {t.name} {t.category ? `(${t.category})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Notlar & Vurgular */}
            <div>
              <label className="text-[10.5px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">4. Vurgulanacak Notlar & Talepler</label>
              <textarea 
                rows={3}
                placeholder="Örn: Manevi tazminatı 50.000 TL iste, emsal Yargıtay kararlarına vurgu yap..."
                value={userNotes}
                onChange={e => setUserNotes(e.target.value)}
                className="w-full bg-[var(--color-surface)] border border-[var(--color-divider)] focus:border-[#3B82F6] rounded-lg p-2.5 text-[12px] text-[var(--color-text)] outline-none placeholder-[#94A3B8] resize-none"
              />
            </div>

            {/* Üretim Butonu */}
            <button 
              onClick={() => handleGenerateDraft()}
              disabled={loading || !caseId}
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white py-2.5 rounded-xl text-[13px] font-bold tracking-wide transition-all shadow-md shadow-[#3B82F6]/20 cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Dilekçe Kaleme Alınıyor...</span>
                </>
              ) : (
                <>
                  <span>✨ [{currentPetitionItem.shortTitle}] Oluştur</span>
                </>
              )}
            </button>
          </div>

          {/* Kayıtlı Taslaklar Listesi */}
          <div className="flex flex-col gap-2 mt-1">
            <h3 className="text-[11px] font-mono font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Kayıtlı Dilekçelerim ({savedDrafts.length})</h3>
            
            {savedDrafts.length === 0 ? (
              <div className="text-[11.5px] text-[var(--color-text-muted)] font-mono py-3 text-center bg-[var(--color-bg-base)] border border-[var(--color-divider)] rounded-xl">
                Henüz kayıtlı bir dilekçe taslağı bulunmuyor.
              </div>
            ) : (
              savedDrafts.map(d => (
                <div 
                  key={d.id}
                  onClick={() => selectDraft(d)}
                  className={`p-2.5 rounded-xl border text-[12px] cursor-pointer transition-all ${
                    activeDraftId === d.id 
                      ? 'bg-[#3B82F6]/15 border-[#3B82F6]/50 text-[var(--color-text)] shadow-md' 
                      : 'bg-[var(--color-bg-base)] border-[var(--color-divider)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <div className="font-semibold text-[var(--color-text)] mb-0.5 truncate">{d.petition_type || 'Dilekçe'}</div>
                  <div className="text-[10.5px] font-mono text-[var(--color-text-muted)] flex justify-between">
                    <span className="truncate max-w-[170px]">{d.cases?.title || 'Dava Dosyası'}</span>
                    <span>{new Date(d.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alt Asistan Canlı Revizyon Formu */}
        <form onSubmit={handleSendChatInstruction} className="mt-3 pt-3 border-t border-[var(--color-divider)] shrink-0">
          <div className="flex items-center bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus-within:border-[#3B82F6] rounded-xl px-3 py-1.5 shadow-sm transition-all">
            <input 
              type="text" 
              placeholder={aiUpdating ? 'Revize ediliyor...' : 'Dilekçeyi revize etmek için talimat ver...'}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={aiUpdating || loading || !caseId}
              className="bg-transparent border-none outline-none text-[var(--color-text)] font-sans text-[12px] w-full placeholder-[#94A3B8]"
            />
            <button type="submit" disabled={aiUpdating || loading || !chatInput.trim()} className="text-[#3B82F6] hover:text-[var(--color-text)] p-1 transition-colors cursor-pointer disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Sağ Panel: Doküman Kağıdı ve Düzenleyici */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl flex flex-col shadow-sm overflow-hidden relative min-h-[550px]">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>

        {/* Doküman Araç Çubuğu */}
        <div className="bg-[var(--color-bg-base)] border-b border-[var(--color-divider)] px-3 sm:px-5 py-2.5 flex items-center justify-between z-30 shrink-0 relative gap-2 min-h-[52px]">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            {!isLeftPanelOpen && (
              <button
                onClick={() => setIsLeftPanelOpen(true)}
                className="bg-[var(--color-surface)] hover:bg-[var(--color-divider)] text-[#3B82F6] border border-[#3B82F6]/30 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                title="AI Dilekçe Asistanı ve Parametreleri Aç"
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Asistanı Aç</span>
              </button>
            )}

            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="font-mono text-[13px] font-bold text-[var(--color-text)] tracking-wide flex items-center gap-1.5 truncate">
                <span>📄</span>
                <span className="truncate">{currentPetitionItem.shortTitle || currentPetitionItem.title}</span>
              </span>
              <span className="text-[10.5px] font-mono text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-2 py-0.5 rounded font-bold shrink-0 hidden sm:inline-block">
                {currentPetitionItem.lawRef}
              </span>
              <span className="font-mono text-[11px] text-[var(--color-text-muted)] hidden md:inline-block shrink-0">
                · {draftContent ? `${draftContent.length} kr. / ${draftLines.length} satır` : 'Boş Doküman'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={handleCopy}
              disabled={!draftContent}
              className="bg-[var(--color-surface)] hover:bg-[var(--color-divider)] text-[var(--color-text)] px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-semibold border border-[var(--color-divider)] transition-all cursor-pointer disabled:opacity-50 select-none"
            >
              {copySuccess ? '✓ Kopyalandı' : 'Metni Kopyala'}
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowDownloadMenu(prev => !prev)}
                disabled={!draftContent}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-3.5 py-1.5 rounded-lg text-[11.5px] font-mono font-bold tracking-wide transition-all shadow-md shadow-[#3B82F6]/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 select-none"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>İndir</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDownloadMenu && (
                <>
                  {/* Dışarı tıklandığında menüyü kapatmak için backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDownloadMenu(false)} 
                  />

                  <div className="absolute right-0 mt-2 w-52 bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 select-none">
                    <button 
                      onClick={() => {
                        handleDownloadFormat('doc');
                        setShowDownloadMenu(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-[12px] text-[var(--color-text)] hover:bg-[var(--color-bg-base)] flex items-center gap-2.5 font-sans cursor-pointer transition-colors"
                    >
                      <span className="text-[#3B82F6] font-bold text-[14px]">📄</span>
                      <span>Word (.doc) İndir</span>
                    </button>

                    <button 
                      onClick={() => {
                        handleDownloadFormat('pdf');
                        setShowDownloadMenu(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-[12px] text-[var(--color-text)] hover:bg-[var(--color-bg-base)] flex items-center gap-2.5 font-sans cursor-pointer transition-colors"
                    >
                      <span className="text-[#EF4444] font-bold text-[14px]">📕</span>
                      <span>PDF (.pdf) İndir</span>
                    </button>

                    <button 
                      onClick={() => {
                        handleDownloadFormat('udf');
                        setShowDownloadMenu(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-[12px] text-[var(--color-text)] hover:bg-[var(--color-bg-base)] flex items-center gap-2.5 font-sans cursor-pointer transition-colors"
                    >
                      <span className="text-[#10B981] font-bold text-[14px]">⚖️</span>
                      <span>UYAP (.udf) İndir</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Doküman Editör / Kağıt Alanı */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-[var(--color-bg-base)]/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-[#3B82F6] font-mono font-semibold text-[13px] text-center px-4">
                [{currentPetitionItem.lawRef}] Hukuk kurallarına uygun dilekçe metni kaleme alınıyor...
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-3 left-4 right-4 z-40 bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl text-[13px] font-mono">
              {error}
            </div>
          )}

          {draftContent ? (
            <TiptapPetitionEditor 
              content={draftContent}
              onChange={(html) => setDraftContent(html)}
            />
          ) : (
            <div className="flex-1 overflow-y-auto cyber-juris-scroll p-4 md:p-8 bg-[var(--color-bg-base)]">
              <div className="w-full max-w-[840px] mx-auto bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-8 md:p-14 shadow-lg text-[var(--color-text)] flex flex-col items-center justify-center text-center py-20 gap-4 min-h-[600px] mb-16">
                <div className="w-16 h-16 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] shadow-sm">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h3 className="text-[17px] font-bold text-[var(--color-text)]">
                  {currentPetitionItem ? `[${currentPetitionItem.lawRef}] ${currentPetitionItem.title}` : 'Dilekçe Hazırlanmaya Hazır'}
                </h3>
                <p className="text-[13.5px] text-[var(--color-text-muted)] max-w-md leading-relaxed">
                  Sol taraftaki panelden dava dosyası ve kriterleri belirleyerek <strong className="text-[#3B82F6]">&quot;✨ [{currentPetitionItem.shortTitle}] Oluştur&quot;</strong> butonuna tıklayın.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 max-w-lg mt-3">
                  {currentPetitionItem.keyElements.map((el, idx) => (
                    <span key={idx} className="text-[11px] font-mono bg-[var(--color-bg-base)] border border-[var(--color-divider)] px-2.5 py-1 rounded-md text-[var(--color-text-muted)]">
                      ✓ {el}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>


      </div>

      {/* 80+ Dilekçe Türü Full Kataloğu Modal */}
      {showCatalogModal && (
        <div 
          className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setShowCatalogModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 w-full max-w-4xl shadow-2xl flex flex-col gap-4 relative overflow-hidden max-h-[88vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-4 shrink-0">
              <div>
                <h2 className="text-[18px] font-extrabold text-[var(--color-text)] tracking-tight flex items-center gap-2">
                  <span>📚</span>
                  <span>Türk Hukuku Dilekçe Kataloğu</span>
                  <span className="text-[11px] font-mono text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/30 px-2 py-0.5 rounded font-bold">
                    80+ Dilekçe Türü
                  </span>
                </h2>
                <p className="text-[12px] text-[var(--color-text-muted)]">
                  HMK, CMK, İİK, İYUK, TMK, TBK ve Uluslararası Yargı usullerine uygun dilekçe türünü arayın ve seçin.
                </p>
              </div>

              <button 
                onClick={() => setShowCatalogModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Arama & Kategori Çubuğu */}
            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex items-center bg-[var(--color-bg-base)] border border-[var(--color-divider)] focus-within:border-[#3B82F6] rounded-xl px-3.5 py-2 shadow-sm transition-all">
                <svg className="w-4 h-4 text-[var(--color-text-muted)] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Dilekçe adı, kanun maddesi (ör: HMK 119, İİK 62, KYOK, işe iade, tahliye)..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-[var(--color-text)] font-sans text-[13px] w-full placeholder-[#94A3B8]"
                  autoFocus
                />
                {catalogSearch && (
                  <button onClick={() => setCatalogSearch('')} className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    Temizle
                  </button>
                )}
              </div>

              {/* Kategori Filtre Hapları */}
              <div className="flex items-center gap-1.5 overflow-x-auto cyber-juris-scroll pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-full text-[11.5px] font-mono transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-[#3B82F6] text-white font-bold'
                      : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-divider)]'
                  }`}
                >
                  Tümü ({PETITION_TYPES_CATALOG.length})
                </button>
                {PETITION_CATEGORIES.map(cat => {
                  const count = PETITION_TYPES_CATALOG.filter(i => i.categoryId === cat.id).length;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-[11.5px] font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        isActive
                          ? 'bg-[#3B82F6] text-white font-bold'
                          : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-[var(--color-divider)]'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.shortName} ({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dilekçe Türleri Izgarası */}
            <div className="flex-1 overflow-y-auto cyber-juris-scroll pr-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCatalogItems.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-[var(--color-text-muted)] font-mono text-[13px]">
                  Aramanıza uygun bir dilekçe türü bulunamadı.
                </div>
              ) : (
                filteredCatalogItems.map(item => {
                  const isSelected = petitionTypeId === item.id;
                  const cat = PETITION_CATEGORIES.find(c => c.id === item.categoryId);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setPetitionTypeId(item.id);
                        setSelectedCategory(item.categoryId);
                        setShowCatalogModal(false);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 group ${
                        isSelected 
                          ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-[var(--color-text)] shadow-md' 
                          : 'bg-[var(--color-bg-base)] border-[var(--color-divider)] hover:border-[#3B82F6]/50 hover:bg-[var(--color-bg-glow)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded border ${cat?.badgeColor || 'text-[#3B82F6]'}`}>
                            {item.lawRef}
                          </span>
                          <span className="text-[10.5px] font-mono text-[var(--color-text-muted)]">
                            {cat?.shortName}
                          </span>
                        </div>

                        <h4 className="text-[13.5px] font-bold text-[var(--color-text)] group-hover:text-[#3B82F6] transition-colors leading-snug">
                          {item.title}
                        </h4>
                        
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
                          <span>🏛️</span>
                          <span className="truncate">{item.courtType}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[var(--color-divider)] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] truncate max-w-[240px]">
                          {item.keyElements[0]}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#3B82F6] group-hover:translate-x-0.5 transition-transform">
                          {isSelected ? '✓ Seçili' : 'Seç →'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[var(--color-divider)] pt-3 flex items-center justify-between shrink-0 text-[11.5px] font-mono text-[var(--color-text-muted)]">
              <span>Toplam {filteredCatalogItems.length} dilekçe türü listeleniyor</span>
              <button 
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-divider)] text-[var(--color-text)] hover:bg-[var(--color-divider)] cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
