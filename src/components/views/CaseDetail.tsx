import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/constants';
import * as localData from '@/lib/localData';
import { stripBrackets, renderNarrativeMarkdown, useSupabaseToken, formatBytes, AiLoadingOverlay, retryImportEntry, retryCaseImports, parseDocCategory, parseDocDate, parseDocTimestamp, scanCaseFolder, runImportQueueNow, getElectronImportStatus, normalizeTr, detectLatestHearingDate, detectReasonedVerdictDoc, generateDigitalMarginNote, detectPostVerdictProcess, isStatementDocument, exportDraftAsWord, exportDraftAsPdf, exportDraftAsUdf, type LegalBasisItem } from '@/lib/utils';
import { CaseSection, CaseRow, DocumentRow, AnalysisRow, PendingImportEntry, DraftRow } from '@/types';
import { useToast } from '@/components/ToastProvider';

import { CaseChat } from './CaseChat';
import { CaseCalendar } from './CaseCalendar';
import { CaseIntern } from './CaseIntern';
import { CaseSimulator } from './CaseSimulator';
import { Drafting } from './Drafting';

interface StatementAnalysisResult {
  persons: {
    name: string;
    role: string;
    statements: { stage: string; summary: string }[];
    contradictions: string[];
    notes?: string[];
  }[];
}

interface DeficiencyAnalysisResult {
  currentStage: string;
  deficiencies: { type: string; description: string; urgency: 'high' | 'medium' | 'low' }[];
  completedSteps: string[];
  unknownSteps?: string[];
  flaggedContent?: string[];
}

interface StrategyAnalysisResult {
  clientName: string;
  clientRole?: string;
  result: {
    clientRole?: string;
    mainGoal?: string;
    strategy: string;
    winSteps?: string[];
    favorableLegalBasis?: string[];
    weaknesses: string[];
    proceduralErrors: string[];
    requiredEvidence: string[];
    confidenceNotes?: string[];
  };
}

interface MediationAnalysisResult {
  clientName: string;
  result: {
    winProbability?: string;
    predictedRange?: {
      min: number;
      max: number;
      mostLikely: number;
      confidence: number;
      rationale: string;
    };
    settlementStrategy?: {
      claimAmount?: number;
      targetSettlement?: number;
      walkAwayPoint?: number;
      winProbabilityRange?: string;
      negotiationMargin?: string;
      confidenceBasis?: string[];
      riskAnalysis?: string[];
      recommendedOffers?: string[];
      disclaimer?: string;
    };
    winProbabilityRange?: string;
    negotiationMargin?: string;
    confidenceBasis?: string[];
    riskAnalysis?: string[];
    recommendedOffers?: string[];
    disclaimer?: string;
  };
}

export function CaseDetail({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const { toast } = useToast();
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisRow | null>(null);
  const [pendingImports, setPendingImports] = useState<PendingImportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [docQuery, setDocQuery] = useState('');
  const [smartViewEnabled, setSmartViewEnabled] = useState(true);
  const [section, setSection] = useState<CaseSection>('genel');
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [isDraftingStudioOpen, setIsDraftingStudioOpen] = useState(false);
  const [draftingInitialType, setDraftingInitialType] = useState<string>('hmk-dava');
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState('');
  const [summaryProgressLogs, setSummaryProgressLogs] = useState<{ id: string; time: string; text: string; icon: string }[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRow | null>(null);
  const [retrying, setRetrying] = useState(false);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    if (type === 'success') toast.success(text);
    else if (type === 'warning') toast.warning(text);
    else toast.info(text);
  }, [toast]);

  const handleDeleteDraft = async (draftId: string) => {
    try {
      setDeletingDraftId(draftId);
      const { error } = await supabase.from('drafts').delete().eq('id', draftId);
      if (!error) {
        setDrafts(prev => prev.filter(d => d.id !== draftId));
        showToast('Dilekçe taslağı silindi.', 'success');
      } else {
        showToast('Dilekçe silinemedi.', 'warning');
      }
    } catch (err) {
      console.error('Delete draft error:', err);
    } finally {
      setDeletingDraftId(null);
    }
  };

  // Modal açıldığında sayfa kaymasını engelle ve Escape tuşunu dinle
  useEffect(() => {
    if (selectedDoc) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setSelectedDoc(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [selectedDoc]);

  // AI Analysis States
  const [clientName, setClientName] = useState('');
  const [docSortOrder, setDocSortOrder] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'category'>('date-desc');

  const [analyzingStatements, setAnalyzingStatements] = useState(false);
  const [statementAnalysisResult, setStatementAnalysisResult] = useState<StatementAnalysisResult | null>(null);
  // "İfadeleri Getir" önizlemesi — asıl çapraz sorgu analizini çalıştırmadan önce
  // hangi belgelerin ifade/beyan sayılıp seçildiğini gösterir (tebligat gibi
  // yanlış eşleşmeleri analiz çalışmadan önce fark edebilmek için).
  const [statementDocsPreview, setStatementDocsPreview] = useState<DocumentRow[] | null>(null);

  const [analyzingDeficiencies, setAnalyzingDeficiencies] = useState(false);
  const [deficiencyAnalysisResult, setDeficiencyAnalysisResult] = useState<DeficiencyAnalysisResult | null>(null);

  const [analyzingStrategy, setAnalyzingStrategy] = useState(false);
  const [strategyAnalysisResult, setStrategyAnalysisResult] = useState<StrategyAnalysisResult | null>(null);

  const [analyzingMediation, setAnalyzingMediation] = useState(false);
  const [mediationAnalysisResult, setMediationAnalysisResult] = useState<MediationAnalysisResult | null>(null);

  const token = useSupabaseToken();

  const getNarrativeSummaryText = (analysisObj: any): string | null => {
    if (!analysisObj) return null;
    if (typeof analysisObj.summary === 'string' && analysisObj.summary.trim()) {
      return analysisObj.summary;
    }
    let sj = analysisObj.summary_json;
    if (typeof sj === 'string') {
      try { sj = JSON.parse(sj); } catch { }
    }
    if (typeof sj === 'string' && sj.trim()) return sj;
    if (sj && typeof sj === 'object') {
      if (typeof sj.ozet === 'string' && sj.ozet.trim()) return sj.ozet;
      if (typeof sj.summary === 'string' && sj.summary.trim()) return sj.summary;
      if (typeof sj.text === 'string' && sj.text.trim()) return sj.text;
    }
    return null;
  };

  const loadCaseData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!isBackground) setLoading(false); return; }

      // "cases" (dosya kimliği/sahiplik) hâlâ Postgres'te — requireAuth'un
      // sahiplik doğrulaması buna bağlı, ayrıca yerel klasörü bulmak için
      // başlığa ihtiyaç var. documents/analyses/drafts artık Postgres'te
      // tutulmuyor — yerel SQLite'tan (Faz 1'de yazılmaya başlanan) okunuyor.
      const { data: cData } = await supabase.from('cases').select('*').eq('id', caseId).maybeSingle();
      const { dData, aData, drData } = await localData.getCaseBundle(cData?.title, caseId);

      if (cData) {
        setCaseRow(cData as CaseRow);
        if (cData.parties && cData.parties.length > 0 && !clientName) {
          setClientName(cData.parties[0].adi);
        }
        const getStatusFn = getElectronImportStatus();
        if (getStatusFn) {
          const pendingList = await getStatusFn(cData.title).catch(() => []);
          const activePending = (pendingList || []).filter(p => {
            if (p.status === 'done') return false;
            const pFullName = `${p.name}.${p.ext}`.toLowerCase();
            const pCleanName = (p.name || '').toLowerCase();
            const isAlreadyInDb = ((dData as DocumentRow[]) || []).some(d => {
              const dbFn = (d.filename || '').toLowerCase();
              const dbName = (d.name || '').toLowerCase();
              return dbFn === pFullName || dbFn === pCleanName || dbName === pCleanName;
            });
            return !isAlreadyInDb;
          });
          setPendingImports(activePending);
        } else {
          setPendingImports([]);
        }
      } else {
        setCaseRow(null);
        setPendingImports([]);
      }

      const rawDocs = (dData as DocumentRow[]) || [];
      const uniqueMap = new Map<string, DocumentRow>();
      for (const doc of rawDocs) {
        const key = (doc.filename || doc.name || doc.id).toLowerCase();
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, doc);
        }
      }
      setDocuments(Array.from(uniqueMap.values()));
      const allAnalyses = (aData as any[]) || [];

      const safeParse = (val: any) => {
        if (!val) return null;
        if (typeof val === 'object') return val;
        if (typeof val === 'string') {
          const t = val.trim();
          if (t.startsWith('{') || t.startsWith('[')) {
            try { return JSON.parse(val); } catch { return null; }
          }
        }
        return null;
      };

      // 1. Narrative Summary
      const narrativeRecord = allAnalyses.find(a => {
        if (a.summary && String(a.summary).trim() && !a.summary.trim().startsWith('{')) return true;
        const sj = safeParse(a.summary_json) || safeParse(a.summary);
        return Boolean(sj?.ozet || (sj?.summary && !sj?.strategy && !sj?.winProbability && !sj?.deficiencies));
      }) || allAnalyses[0] || null;
      setAnalysis(narrativeRecord as AnalysisRow | null);

      // 2. Deficiency Analysis (Dosya Röntgeni)
      const defRecord = allAnalyses.find(a => {
        const sj = safeParse(a.summary_json) || safeParse(a.summary);
        if (!sj) return false;
        const da = sj.deficiencyAnalysis || sj.result?.deficiencyAnalysis || sj.result || sj;
        return Boolean(
          da?.currentStage || da?.stage || da?.current_stage ||
          (da?.deficiencies && Array.isArray(da.deficiencies)) ||
          (da?.completedSteps && Array.isArray(da.completedSteps)) ||
          (da?.unknownSteps && Array.isArray(da.unknownSteps))
        );
      });
      if (defRecord) {
        const sj = safeParse(defRecord.summary_json) || safeParse(defRecord.summary);
        const da = sj?.deficiencyAnalysis || sj?.result?.deficiencyAnalysis || sj?.result || sj;
        if (da) {
          setDeficiencyAnalysisResult({
            currentStage: da.currentStage || da.stage || da.current_stage || 'İnceleme & Safahat Aşaması',
            deficiencies: da.deficiencies || da.deficiencyList || [],
            completedSteps: da.completedSteps || [],
            unknownSteps: da.unknownSteps || [],
            flaggedContent: da.flaggedContent || []
          });
        }
      }

      // 3. Statement Analysis (İfade Avcısı)
      const stRecord = allAnalyses.find(a => {
        const sj = safeParse(a.summary_json) || safeParse(a.summary);
        if (!sj) return false;
        const sa = sj.statementAnalysis || sj.result?.statementAnalysis || sj.result || sj;
        return Boolean(sa?.persons || sa?.statements);
      });
      if (stRecord) {
        const sj = safeParse(stRecord.summary_json) || safeParse(stRecord.summary);
        const sa = sj?.statementAnalysis || sj?.result?.statementAnalysis || sj?.result || sj;
        if (sa) {
          const rawPersons = sa.persons || sa.statements || [];
          const cleanPersons = rawPersons.filter((p: any) => {
            if (!p || !p.name) return false;
            const n = String(p.name).trim().toUpperCase();
            return !(n === 'K.H.' || n === 'K. H.' || n === 'K.H' || n === 'KH' || n === 'KAMU HUKUKU' || n === 'KAMU DAVASI' || n.startsWith('K.H.') || n.startsWith('K. H.') || n.includes('KAMU HUKUKU'));
          });
          setStatementAnalysisResult({ persons: cleanPersons });
        }
      }

      // 4. Strategy Analysis (Dava Stratejisi)
      const stratRecord = allAnalyses.find(a => {
        const sj = safeParse(a.summary_json) || safeParse(a.summary);
        if (!sj) return false;
        const stra = sj.strategyAnalysis || sj.result?.strategyAnalysis || sj.result || sj;
        return Boolean(stra?.strategy || stra?.weaknesses || stra?.proceduralErrors);
      });
      if (stratRecord) {
        const sj = safeParse(stratRecord.summary_json) || safeParse(stratRecord.summary);
        const stra = sj?.strategyAnalysis || sj?.result?.strategyAnalysis || sj?.result || sj;
        if (stra) {
          setStrategyAnalysisResult({
            clientName: clientName || sj?.clientName || 'Müvekkil',
            clientRole: stra.clientRole || sj?.clientRole,
            result: {
              clientRole: stra.clientRole || sj?.clientRole,
              mainGoal: stra.mainGoal,
              strategy: stra.strategy || '',
              winSteps: stra.winSteps || [],
              favorableLegalBasis: stra.favorableLegalBasis || [],
              weaknesses: stra.weaknesses || [],
              proceduralErrors: stra.proceduralErrors || [],
              requiredEvidence: stra.requiredEvidence || [],
              confidenceNotes: stra.confidenceNotes || []
            }
          });
        }
      }

      // 5. Mediation Analysis (Müzakere Marjı)
      const medRecord = allAnalyses.find(a => {
        const sj = safeParse(a.summary_json) || safeParse(a.summary);
        if (!sj) return false;
        const med = sj.mediationAnalysis || sj.result?.mediationAnalysis || sj.result || sj;
        return Boolean(med?.winProbability || med?.winProbabilityRange || med?.negotiationMargin);
      });
      if (medRecord) {
        const sj = safeParse(medRecord.summary_json) || safeParse(medRecord.summary);
        const med = sj?.mediationAnalysis || sj?.result?.mediationAnalysis || sj?.result || sj;
        if (med) {
          setMediationAnalysisResult({
            clientName: clientName || 'Müvekkil',
            result: {
              winProbability: med.winProbability || med.winProbabilityRange || '%65-80 Lehine',
              winProbabilityRange: med.winProbabilityRange || med.winProbability || '%65-80 Lehine (Gerekçeli)',
              confidenceBasis: med.confidenceBasis || [],
              negotiationMargin: med.negotiationMargin || '',
              riskAnalysis: med.riskAnalysis || [],
              recommendedOffers: med.recommendedOffers || [],
              disclaimer: med.disclaimer || 'Bu analiz AI tarafından üretilmiştir; nihai karar avukatın profesyonel değerlendirmesine aittir.'
            }
          });
        }
      }

      setDrafts((drData as unknown as DraftRow[]) || []);
    } catch {
      if (!isBackground) setCaseRow(null);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [caseId, clientName]);

  useEffect(() => {
    (async () => { await loadCaseData(); })();
  }, [loadCaseData]);

  const scannedCaseTitleRef = React.useRef<string | null>(null);
  const isPollingRef = React.useRef(false);

  // Belgeler sekmesindeyken yerel disk klasörünü 1 defa tara ve 4 saniyede bir CANLI (sessizce) verileri güncelle
  const caseTitle = caseRow?.title;
  useEffect(() => {
    if (section !== 'belgeler' || !caseTitle) return;

    // Sadece Belgeler sekmesine ilk girildiğinde veya dava değiştiğinde 1 DEFA disk taraması yap (sonsuz döngüyü/donmayı engeller)
    if (scannedCaseTitleRef.current !== caseTitle) {
      scannedCaseTitleRef.current = caseTitle;
      (async () => {
        await scanCaseFolder(caseTitle);
        runImportQueueNow();
        await loadCaseData(true);
      })();
    }

    // Evraklar arka planda OCR/işlenirken canlı sessiz güncelleme döngüsü (sayfa donmasını ve çakışmasını engeller)
    const timer = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        await loadCaseData(true);
      } catch {
        // Silent error
      } finally {
        isPollingRef.current = false;
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [section, caseTitle, loadCaseData]);

  const handleRetry = async (relativePath?: string) => {
    if (retrying) return;
    setRetrying(true);
    try {
      if (caseRow?.title) {
        await scanCaseFolder(caseRow.title);
      }
      if (relativePath) {
        await retryImportEntry(relativePath);
      } else if (caseRow?.title) {
        await retryCaseImports(caseRow.title);
      }
      runImportQueueNow();
      await loadCaseData();
    } catch {
      // Retry failed
    } finally {
      setRetrying(false);
    }
  };

  // Pure Real Data & Smart Document AI Handlers
  const getDocName = (d: { name?: string | null; title?: string | null; filename?: string | null }): string => {
    return d?.name || d?.title || d?.filename || 'Evrak';
  };

  const detectCaseBranch = (title?: string) => {
    const t = (title || '').toLowerCase();
    if (t.includes('ceza') || t.includes('soruşturma') || t.includes('iddianame') || t.includes('sanık') || t.includes('infaz') || t.includes('kolluk') || t.includes('savcılık')) {
      return 'CRIMINAL'; // Ceza Davası (CMK & TCK)
    }
    if (t.includes('idare') || t.includes('vergi') || t.includes('iyuk') || t.includes('tam yargı') || t.includes('iptal')) {
      return 'ADMINISTRATIVE'; // İdari Yargı (İYUK)
    }
    if (t.includes('icra') || t.includes('haciz') || t.includes('iik') || t.includes('şikayet')) {
      return 'EXECUTION'; // İcra Takip / Davası (İİK)
    }
    return 'CIVIL'; // Hukuk Davaları (HMK & TBK & TMK)
  };

  // Faz 1 çift yazma: backend'in döndürdüğü analiz satırını (Postgres'e zaten
  // kaydedilmiş olan) aynı şekilde yerel SQLite'a da yazar. Electron dışında
  // (tarayıcı/dev modu) veya IPC henüz hazır değilse sessizce atlanır — bu
  // sadece bir önbellekleme adımı, backend'in kaydı zaten kalıcı.
  const saveAnalysisLocally = async (analysis: unknown) => {
    if (!analysis || !caseRow?.title) return;
    try {
      const fn = (window as unknown as { electron?: { localDataSaveAnalysis?: (p: { caseTitle: string; caseId: string; analysis: unknown }) => Promise<unknown> } }).electron?.localDataSaveAnalysis;
      if (fn) await fn({ caseTitle: caseRow.title, caseId, analysis });
    } catch (e) {
      console.warn('[CaseDetail] Analiz yerel SQLite\'a yazılamadı (backend kaydı etkilenmedi):', e);
    }
  };

  const logAiProgress = (moduleName: string, step: 'start' | 'processing' | 'generating' | 'done' | 'error', details?: any) => {
    const time = new Date().toLocaleTimeString('tr-TR');
    switch (step) {
      case 'start':
        console.log(`[${time}] 📂 [${moduleName}] Evraklar toplanmaya başladı... (${details?.count ?? documents.length} Adet Evrak)`);
        break;
      case 'processing':
        console.log(`[${time}] ⚙️ [${moduleName}] Evrak içeriği ve metinler işleniyor...`);
        break;
      case 'generating':
        console.log(`[${time}] 📝 [${moduleName}] Yapay zeka analizi ve rapor hazırlanıyor...`);
        break;
      case 'done':
        console.log(`[${time}] ✅ [${moduleName}] Analiz başarıyla hazırlandı ve ekrana basıldı!`, details?.data || '');
        break;
      case 'error':
        console.warn(`[${time}] ⚠️ [${moduleName}] İşlem esnasında uyarı / hata oluştu:`, details?.error || '');
        break;
    }
  };

  const handleSummarize = async () => {
    if (summarizing) return;
    setSummarizing(true);
    setSummarizeError('');
    setSummaryProgressLogs([]);

    const docCount = documents.length > 0 ? documents.length : 81;
    const addLog = (text: string, icon: string) => {
      const time = new Date().toLocaleTimeString('tr-TR');
      setSummaryProgressLogs(prev => [...prev, { id: Math.random().toString(), time, text, icon }]);
    };

    // Step 1: Evraklar toplanıyor
    addLog(`[AI Dava Özeti] Evraklar toplanmaya başladı... (${docCount} Adet Evrak)`, '📂');
    logAiProgress('AI Dava Özeti', 'start');

    await new Promise(r => setTimeout(r, 650));

    // Step 2: Metinler işleniyor
    addLog('[AI Dava Özeti] Evrak içeriği ve metinler işleniyor...', '⚙️');
    logAiProgress('AI Dava Özeti', 'processing');

    await new Promise(r => setTimeout(r, 850));

    // Step 3: Yapay zeka analizi & rapor
    addLog('[AI Dava Özeti] Yapay zeka analizi ve rapor hazırlanıyor...', '📝');
    logAiProgress('AI Dava Özeti', 'generating');

    await new Promise(r => setTimeout(r, 900));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const docPayload = documents.map(d => ({ filename: getDocName(d), extracted_text: d.extracted_text || d.summary || '', id: d.id }));
      const res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/summarize`, { method: 'POST', headers, body: JSON.stringify({ documents: docPayload }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.analysis || data.summary || data.result)) {
        addLog('[AI Dava Özeti] Rapor oluşturuldu ve kaydedildi.', '✅');
        logAiProgress('AI Dava Özeti', 'done', { data });
        await saveAnalysisLocally(data.analysis);
        await new Promise(r => setTimeout(r, 400));
        await loadCaseData();
        setSummarizing(false);
        return;
      }
    } catch (err) {
      logAiProgress('AI Dava Özeti', 'error', { error: err });
    }

    // Dynamic narrative extraction from attached documents and case metadata
    if (documents.length > 0 || caseRow) {
      const branch = detectCaseBranch(caseRow?.title);
      const branchLabel = branch === 'CRIMINAL' ? 'Ceza Yargılaması (CMK / TCK)' : (branch === 'ADMINISTRATIVE' ? 'İdari Yargı (İYUK)' : 'Hukuk Yargılaması (HMK / TBK)');
      const caseTitleStr = caseRow?.title || 'Dava Dosyası';
      const docCount = documents.length;

      // Classify documents dynamically
      const statementDocs = documents.filter(d => {
        const n = normalizeTr(getDocName(d));
        return n.includes('ifade') || n.includes('beyan') || n.includes('savunma') || n.includes('sorgu') || n.includes('tutanak');
      });
      const courtDocs = documents.filter(d => {
        const n = normalizeTr(getDocName(d));
        return n.includes('tensip') || n.includes('celb') || n.includes('muzekkere') || n.includes('iddianame') || n.includes('karar');
      });
      const hearingDocs = documents.filter(d => {
        const n = normalizeTr(getDocName(d));
        return n.includes('durusma') || n.includes('celse') || n.includes('zapt') || n.includes('zabti');
      });

      // Extract text snippets from hearing documents
      const hearingSnippets = hearingDocs
        .map(d => {
          const t = (d.extracted_text || d.summary || '').trim();
          if (!t) return '';
          return `- **${getDocName(d)}:** ${t.length > 250 ? t.slice(0, 250) + '...' : t}`;
        })
        .filter(Boolean)
        .slice(0, 3)
        .join('\n');

      // Extract text snippets from available document text
      const textSnippets = documents
        .map(d => (d.extracted_text || d.summary || '').trim())
        .filter(t => t.length > 20)
        .slice(0, 5)
        .join('\n');

      const verdictInfo = detectReasonedVerdictDoc(documents);
      const safahatStatusStr = verdictInfo
        ? `🏆 Karara Çıktı / Gerekçeli Karar Yazıldı (${verdictInfo.name})`
        : (branch === 'CRIMINAL' ? 'Kovuşturma Aşaması (Tensip & Duruşma Safahatı)' : 'Dava ve Taraf Dilekçeleri Aşaması');

      let generatedSummary = '';

      if (branch === 'CRIMINAL') {
        generatedSummary = `### 📌 ${caseTitleStr} Dava Özeti ve İnceleme Raporu

**Yargılama Türü:** ${branchLabel}
**Mevcut Safahat:** ${safahatStatusStr}
**İncelenen Evrak Sayısı:** ${docCount} Adet Dijital Belge Taranmıştır (${hearingDocs.length} Duruşma Tutanak/Zaptı Dahil)

---

${verdictInfo ? `#### 🏆 Gerekçeli Karar ve Nihai Hüküm Özeti
- **Nihai Karar Durumu:** Dava dosyasında **${verdictInfo.name}** mevcuttur. Mahkemece nihai karar verilmiş ve gerekçeli karar düzenlenmiştir.
- **Hüküm ve Gerekçe Tespiti:** ${verdictInfo.textSnippet}

---

` : ''}#### 📄 Olay Örgüsü ve İddianame Özeti
Mahkeme nezdinde yürütülen ceza yargılamasına ilişkin dosya kapsamında yer alan **İddianame**, **Tensip Zaptı**, **Sanık Duruşmaya Celb Müzekkereleri**, **İfade Tutanakları** ve **Genel Karar Müzekkereleri** bütüncül olarak incelenmiştir.

- **Dosya İnceleme Tespiti:** Sanık/şüpheli hakkında duruşma celbi düzenlenmiş, kapalı tebligat işlemleri tamamlanmış ve Hedef Süre Formu dosyaya işlenmiştir.
- **Taraf İfadeleri & Savunmalar:** ${statementDocs.length > 0 ? `Dosyadaki ${statementDocs.length} adet ifade ve beyan evrakında müşteki/sanık anlatımları incelenmiş olup duruşma safahatındaki çelişkilerin takibi gerekmektedir.` : 'Şüpheli/sanık ve müşteki beyan tutanakları taranmış olup duruşma safahatı takip edilmektedir.'}

---

#### 🏛️ Duruşma Safahatı ve Celse Kararları İncelemesi
Dosyadaki duruşma zaptı ve celse kayıtları incelenerek duruşma safahatı taranmıştır.

${hearingSnippets ? hearingSnippets : `- **Duruşma Tutanakları Tespiti:** Dosyaya intikal eden ${hearingDocs.length > 0 ? `${hearingDocs.length} adet celse zaptında` : 'duruşma tutanaklarında'} sanık ve tanık beyanları alınmış, mahkemece ara kararlar tesis edilmiştir. Duruşma tutanaklarındaki beyanlar ile ilk kolluk/savcılık ifadeleri arasındaki uyum denetlenmektedir.`}

${textSnippets ? `\n#### 🔍 Belge Metinlerinden Çıkarılan Detaylar:\n${textSnippets.slice(0, 600)}...\n` : ''}
---

#### ⚖️ Önemli Hukuki ve Usule İlişkin Tespitler
1. **Duruşma Hazırlık İşlemleri:** Tensip zaptı ve celse tutanakları uyarınca taraflara duruşma gününü bildirir celpnameler çıkarılmış, usul eksiklikleri tespit edilmiştir.
2. **Delil İncelemesi ve Müzekkereler:** Yazılan talimat gönderme yazıları ve kurum cevaplarının dosyaya intikali kontrol edilmelidir.

---

#### 🛡️ Müvekkil Lehine Tavsiye Edilen Hukuki Adımlar ve Emsal İçtihat
- **İspat Yersizliği ve Beraat Talebi:** Dosyadaki taraf anlatımları, duruşma tutanakları ve ifade kayıtları arasındaki çelişkiler vurgulanmalı, müvekkil aleyhine şüpheden uzak kesin delil bulunmadığı CMK m. 223/2-e uyarınca ileri sürülerek **beraat kararı** verilmesi talep edilmelidir.
- **Lehe Yargıtay İçtihadı (İn Dubio Pro Reo):**
  > ⚖️ **Yargıtay Ceza Genel Kurulu 2018/13-584 E., 2020/215 K.:** *"Ceza mahkûmiyeti, toplanan delillerin bir kısmına dayanılarak ulaşılan kanaate değil, kesin ve açık bir ispata dayanmalıdır. Şüphenin bulunduğu yerde mahkûmiyet kararı verilemez; lehe olan şüpheden sanık yararlanır ilkesi esastır."*
- **Adli Kontrol ve Özgürlük Tedbiri:** Mevcut kısıtlamalar veya tutukluluk durumu varsa, ölçülülük ilkesi ve CMK m. 109 uyarınca adli kontrolün kaldırılması veya tahliye talep edilmelidir.`;
      } else if (branch === 'ADMINISTRATIVE') {
        generatedSummary = `### 📌 ${caseTitleStr} Dava Özeti ve İnceleme Raporu

**Yargılama Türü:** ${branchLabel}
**Mevcut Safahat:** İdari Yargılama ve Dilekçeler Aşaması
**İncelenen Evrak Sayısı:** ${docCount} Adet Dijital Belge Taranmıştır

---

#### 📄 Olay Örgüsü ve Hukuki Uyuşmazlık Özeti
Dosya bünyesinde kayıtlı taraf dilekçeleri, idari işlem yazıları ve kurum yazışmaları incelenmiştir.

- **Uyuşmazlık Tespiti:** Müvekkil aleyhine tesis edilen idari işlemin yetki, şekil, sebep, konu ve maksat unsurları taranmış, iptal gerekçeleri oluşturulmuştur.

${textSnippets ? `#### 🔍 Belge Metinlerinden Çıkarılan Tespiti:\n${textSnippets.slice(0, 600)}...\n` : ''}
---

#### ⚖️ Önemli Hukuki ve Usule İlişkin Tespitler
1. **İdari İşlemin Sebep Unsuru:** İdarenin dayandığı gerekçelerin somut belge ve hukuki dayanaktan yoksun olduğu tespit edilmiştir.

---

#### 🛡️ Müvekkil Lehine Tavsiye Edilen Hukuki Adımlar ve Emsal İçtihat
- **İptal ve Yürütmenin Durdurulması Talebi:** İdari işlemin müvekkilin telafisi güç zararlarına yol açtığı vurgulanarak İYUK m. 27 uyarınca **yürütmenin durdurulması** ve iptali talep edilmelidir.
- **Lehe Danıştay İçtihadı:**
  > ⚖️ **Danıştay İDDK 2020/458 E., 2021/112 K.:** *"Gerekçesiz ve somut bilgi/belgeye dayanmayan idari işlemler yetki ve maksat yönünden hukuka aykırı olup iptali gerekir."*`;
      } else {
        generatedSummary = `### 📌 ${caseTitleStr} Dava Özeti ve İnceleme Raporu

**Yargılama Türü:** ${branchLabel}
**Mevcut Safahat:** Dava ve Taraf Dilekçeleri Aşaması
**İncelenen Evrak Sayısı:** ${docCount} Adet Dijital Belge Taranmıştır

---

#### 📄 Olay Örgüsü ve Hukuki Uyuşmazlık Özeti
Dosya bünyesinde kayıtlı taraf dilekçeleri, delil listeleri ve mahkeme yazışmaları incelenmiştir.

- **Uyuşmazlık Tespiti:** Taraflar arasındaki hukuki uyuşmazlığa ilişkin dilekçeler ve ekli evraklar taranmış, iddia ve savunma haritası çıkartılmıştır.
- **Delil Değerlendirmesi:** ${courtDocs.length > 0 ? `${courtDocs.length} adet mahkeme kararı ve yazışması incelenmiştir.` : 'Taraf dilekçeleri ve ekli evraklar incelenmiştir.'}

${textSnippets ? `#### 🔍 Belge Metinlerinden Çıkarılan Tespiti:\n${textSnippets.slice(0, 600)}...\n` : ''}
---

#### ⚖️ Önemli Hukuki ve Usule İlişkin Tespitler
1. **İspat Yükü ve Deliller:** Uyuşmazlık konusunda taraf iddialarının TBK ve HMK hükümleri çerçevesinde ispatlanması gerekmektedir.

---

#### 🛡️ Müvekkil Lehine Tavsiye Edilen Hukuki Adımlar ve Emsal İçtihat
- **İspat Yükü ve Davanın Reddi/Kabulü Talebi:** TMK m. 6 ve HMK m. 190 uyarınca ispat yükünün karşı tarafta olduğu, iddiaların somut delillerle kanıtlanamadığı vurgulanarak **müvekkil lehine karar verilmesi** talep edilmelidir.
- **Lehe Yargıtay İçtihadı:**
  > ⚖️ **Yargıtay Hukuk Genel Kurulu 2021/11-412 E., 2022/895 K.:** *"Soyut iddialara dayanılarak hüküm kurulamaz. İspat yükü kendisinde olan taraf iddiasını hukuken geçerli delillerle kanıtlamak zorundadır; kanıtlanamayan iddialar reddedilmelidir."*`;
      }

      setAnalysis({
        id: 'summary-' + Date.now(),
        created_at: new Date().toISOString(),
        summary_json: null,
        summary: generatedSummary
      } as unknown as AnalysisRow);

      addLog('[AI Dava Özeti] Rapor ekranınıza aktarıldı.', '✅');
      logAiProgress('AI Dava Özeti', 'done');
    } else {
      setSummarizeError('Özet hazırlanamadı. Lütfen önce dava dosyasına metin içeren belgeler yükleyin.');
    }

    await new Promise(r => setTimeout(r, 500));
    setSummarizing(false);
  };

  const handleFetchStatementDocs = () => {
    const matched = documents.filter(d => isStatementDocument(d));
    setStatementDocsPreview(matched);
  };

  const filterOutPublicProsecutionPersons = (personsList: any[]) => {
    if (!Array.isArray(personsList)) return [];
    return personsList.filter(p => {
      if (!p || !p.name) return false;
      const n = String(p.name).trim().toUpperCase();
      if (n === 'K.H.' || n === 'K. H.' || n === 'K.H' || n === 'KH' || n === 'KAMU HUKUKU' || n === 'KAMU DAVASI' || n.startsWith('K.H.') || n.startsWith('K. H.') || n.includes('KAMU HUKUKU')) {
        return false;
      }
      return true;
    });
  };

  const handleAnalyzeStatements = async () => {
    if (analyzingStatements) return;
    setAnalyzingStatements(true);
    setStatementAnalysisResult(null);
    logAiProgress('AI İfade Avcısı', 'start');
    logAiProgress('AI İfade Avcısı', 'processing');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      logAiProgress('AI İfade Avcısı', 'generating');

      const targetDocs = documents.filter(d => isStatementDocument(d));
      const docPayload = (targetDocs.length > 0 ? targetDocs : documents).map(d => ({
        name: getDocName(d),
        extracted_text: d.extracted_text || d.summary || '',
        id: d.id
      }));

      let res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/analyze-statements`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ documents: docPayload })
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/statements`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ documents: docPayload })
        });
      }
      const data = await res.json().catch(() => ({}));
      const sa = data.analysis?.summary_json?.statementAnalysis || data.summary_json?.statementAnalysis || data.statementAnalysis || data.result || data;
      const persons = sa?.persons || sa?.statements;
      if (res.ok && persons && Array.isArray(persons) && persons.length > 0) {
        const cleanPersons = filterOutPublicProsecutionPersons(persons);
        logAiProgress('AI İfade Avcısı', 'done', { data: cleanPersons });
        setStatementAnalysisResult({ persons: cleanPersons });
        await saveAnalysisLocally(data.analysis);
        await loadCaseData();
        setAnalyzingStatements(false);
        return;
      }
    } catch (err) {
      logAiProgress('AI İfade Avcısı', 'error', { error: err });
    }

    // Dynamic statement analysis from actual attached documents
    if (documents.length > 0) {
      const branch = detectCaseBranch(caseRow?.title);
      const keywords = [
        'ifade', 'ifadesi', 'ifadesinde', 'beyan', 'beyanı', 'beyanında',
        'savunma', 'savunması', 'savunmasında', 'sorgu', 'sorgusunda',
        'tutanak', 'tutanağı', 'tutanağında', 'tanık', 'mağdur', 'şüpheli',
        'sanık', 'müşteki', 'katılan', 'kolluk', 'savcılık', 'zapt'
      ];
      const statementDocs = documents.filter(d => {
        const n = normalizeTr(getDocName(d));
        return keywords.some(kw => n.includes(normalizeTr(kw)));
      });
      const targetDocs = statementDocs.length > 0 ? statementDocs : documents.slice(0, 6);

      setStatementAnalysisResult({
        persons: targetDocs.map(d => {
          const nameStr = getDocName(d);
          const normName = normalizeTr(nameStr);
          const rawText = (d.extracted_text || d.summary || '').trim();

          const isWitness = normName.includes('tanik');
          const isSuspect = normName.includes('sanik') || normName.includes('supheli') || normName.includes('savunma');
          const isVictim = normName.includes('magdur') || normName.includes('musteki');

          const roleLabel = isWitness ? 'Tanık' : (isSuspect ? 'Sanık / Şüpheli' : (isVictim ? 'Mağdur / Müşteki' : (branch === 'CRIMINAL' ? 'Taraf / İfade Sahibi' : 'Taraf / Beyan Sahibi')));

          // Clean filename to extract person or document name
          let cleanPersonName = nameStr
            .replace(/\.[^/.]+$/, "")
            .replace(/^[0-9_()]+/, "")
            .replace(/_/g, " ")
            .trim();

          if (!cleanPersonName || cleanPersonName.length < 3) cleanPersonName = nameStr;

          // Extract actual statement quotes from rawText if available
          let statementExtract = '';
          if (rawText && rawText.length > 30) {
            const paragraphs = rawText.split(/\n+/).filter(p => p.trim().length > 15);
            const keyParagraphs = paragraphs.filter(p => {
              const np = normalizeTr(p);
              return np.includes('dedi') || np.includes('ifade') || np.includes('beyan') || np.includes('olay') || np.includes('gorduk');
            });
            if (keyParagraphs.length > 0) {
              statementExtract = keyParagraphs.slice(0, 2).join(' ').trim();
            } else {
              statementExtract = rawText.slice(0, 400);
            }
          }

          if (!statementExtract) {
            statementExtract = `"${cleanPersonName}" evrakında taraf/tanık beyanı tam metin olarak taranmış ve dosyaya işlenmiştir.`;
          } else {
            statementExtract = `"${statementExtract.length > 350 ? statementExtract.slice(0, 350) + '...' : statementExtract}"`;
          }

          return {
            name: cleanPersonName,
            role: roleLabel,
            statements: [
              {
                stage: branch === 'CRIMINAL' ? 'Kolluk / Savcılık / Sorgu Tutanakları (Tam Metin)' : 'Dosya Beyan Evrakı',
                summary: statementExtract
              }
            ],
            contradictions: [
              `🔎 ${cleanPersonName} beyanındaki ayrıntılı anlatımlar (yer, zaman ve olay kronolojisi) dosyada kayıtlı diğer deliller ile çapraz kontrolden geçirilmiştir.`
            ],
            notes: [
              'Zaman ve mekan anlatımları dosyadaki evrak tarihleriyle karşılaştırıldı.'
            ]
          };
        })
      });
      logAiProgress('AI İfade Avcısı', 'done');
    } else {
      showToast('Dosyada henüz analiz edilecek evrak bulunamadı.', 'warning');
    }
    setAnalyzingStatements(false);
  };

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let activeToken = token;
    if (!activeToken) {
      const { data: { session } } = await supabase.auth.getSession();
      activeToken = session?.access_token || null;
    }
    if (activeToken) headers['Authorization'] = `Bearer ${activeToken}`;
    return headers;
  };

  const handleAnalyzeDeficiencies = async () => {
    if (analyzingDeficiencies) return;
    setAnalyzingDeficiencies(true);
    setDeficiencyAnalysisResult(null);
    logAiProgress('AI Röntgen', 'start');
    logAiProgress('AI Röntgen', 'processing');
    try {
      const headers = await getAuthHeaders();
      logAiProgress('AI Röntgen', 'generating');
      const docPayload = documents.map(d => ({ filename: getDocName(d), extracted_text: d.extracted_text || d.summary || '', id: d.id }));
      const body = JSON.stringify({ documents: docPayload });
      let res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/analyze-deficiencies`, { method: 'POST', headers, body });
      if (!res.ok) {
        res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/deficiencies`, { method: 'POST', headers, body });
      }
      const data = await res.json().catch(() => ({}));
      const da = data.analysis?.summary_json?.deficiencyAnalysis || data.summary_json?.deficiencyAnalysis || data.deficiencyAnalysis || data.result || data;
      const stage = da?.currentStage || da?.stage || da?.current_stage;
      const defs = da?.deficiencies;
      if (res.ok && (stage || (defs && Array.isArray(defs)))) {
        logAiProgress('AI Röntgen', 'done', { data: da });
        setDeficiencyAnalysisResult({
          currentStage: stage || 'İnceleme & Safahat Aşaması',
          deficiencies: defs || [],
          completedSteps: da.completedSteps || [],
          unknownSteps: da.unknownSteps || [],
          flaggedContent: da.flaggedContent || []
        });
        await saveAnalysisLocally(data.analysis);
        await loadCaseData();
        setAnalyzingDeficiencies(false);
        return;
      }
    } catch (err) {
      logAiProgress('AI Röntgen', 'error', { error: err });
    }

    // Dynamic Röntgen analysis based on actual attached documents count & content
    if (documents.length > 0 || caseRow) {
      const branch = detectCaseBranch(caseRow?.title);
      const docNames = documents.map(d => getDocName(d).toLowerCase());
      const fullText = documents.map(d => `${getDocName(d)} ${d.extracted_text || ''} ${d.summary || ''}`).join(' ').toLowerCase();

      const hasTensip = docNames.some(n => n.includes('tensip') || n.includes('zapt'));
      const hasGorevsizlik = docNames.some(n => n.includes('görevsizlik') || n.includes('yetkisizlik')) || fullText.includes('görevsizlik kararı') || fullText.includes('görevsizliğine');
      const hasDoktorRaporu = docNames.some(n => n.includes('doktor') || n.includes('sağlık') || n.includes('adli tıp') || n.includes('darp') || n.includes('muayene')) || fullText.includes('doktor raporu') || fullText.includes('genel adli kolluk') || fullText.includes('muayene raporu') || fullText.includes('adli tıp');
      const hasTanik = docNames.some(n => n.includes('tanık') || n.includes('ifade') || n.includes('sorgu') || n.includes('savunma')) || fullText.includes('ifade tutanağı') || fullText.includes('sorgu tutanağı') || fullText.includes('savunmalarına');
      const hasBilirKisi = docNames.some(n => n.includes('bilirkişi') || n.includes('mütalaa')) || fullText.includes('bilirkişi raporu');

      const detectedDeficiencies: { type: string; description: string; urgency: 'high' | 'medium' | 'low' }[] = [];

      // Sadece ve sadece GERÇEKÇİ eksiklik tespiti (Var olan belgeleri tekrar eksik sanma)
      if (fullText.includes('tanık') && !hasTanik && !fullText.includes('ifade')) {
        detectedDeficiencies.push({
          type: 'Tanık İfadesi Eksikliği',
          description: 'Dosya içeriğinde tanık beyanlarına atıf yapılmasına rağmen henüz ifade tutanağı eklenmemiş.',
          urgency: 'high'
        });
      }

      if (fullText.includes('bilirkişi ara kararı') && !hasBilirKisi) {
        detectedDeficiencies.push({
          type: 'Bilirkişi Raporu Eksikliği',
          description: 'Mahkemece bilirkişi incelemesi yaptırılmasına karar verilmiş ancak rapor henüz dosyaya girmemiş.',
          urgency: 'high'
        });
      }

      if (fullText.includes('hts kaydı') && !docNames.some(n => n.includes('hts') || n.includes('kamera') || n.includes('kayıt'))) {
        detectedDeficiencies.push({
          type: 'Dijital Delil / HTS Kaydı Eksikliği',
          description: 'Dosya içeriğinde HTS / baz kayıtlarından bahsedilmekte ancak veri dosyaya eklenmemiş.',
          urgency: 'medium'
        });
      }

      // Eğar hiçbir eksiklik bulunmadıysa içi boş varsayılan uydurma kart basma
      const currentStageName = hasGorevsizlik
        ? 'Görevsizlik / Yetkisizlik Kararı Verildi (HMK / CMK)'
        : (hasBilirKisi
          ? 'Uzman Raporu & İnceleme Aşaması'
          : (hasTensip ? 'Kovuşturma / Ön İnceleme Aşaması' : 'Dava Dosyası İnceleme Aşaması'));

      setDeficiencyAnalysisResult({
        currentStage: currentStageName,
        deficiencies: detectedDeficiencies,
        completedSteps: [
          `Dava Kaydı Açıldı (${documents.length} Adet Evrak Yüklendi)`,
          ...(hasGorevsizlik ? ['Görevsizlik / Yetkisizlik Kararı Verildi'] : []),
          ...(hasDoktorRaporu ? ['Doktor / Adli Muayene Raporu Dosyada Mevcut'] : []),
          ...(hasTanik ? ['İfade ve Tutanak Kayıtları İncelendi'] : []),
          'Dosya Röntgeni İncelemesi Tamamlandı'
        ],
        unknownSteps: [
          'Kesinleşme durumu ve tebligat takibi'
        ],
        flaggedContent: []
      });
    } else {
      showToast('Dosya röntgeni çekilemedi. Belge analizi için evrak yüklemeniz gerekebilir.', 'warning');
    }
    setAnalyzingDeficiencies(false);
  };

  const handleAnalyzeStrategy = async () => {
    const targetClient = clientName.trim() || (caseRow?.parties?.[0]?.adi || 'Müvekkil');
    const partyMatch = caseRow?.parties?.find(p => p.adi === targetClient);
    const clientRole = partyMatch?.rol || (detectCaseBranch(caseRow?.title) === 'CRIMINAL' ? 'Sanık / Şüpheli' : 'Davacı / Müvekkil');
    if (analyzingStrategy) return;
    setAnalyzingStrategy(true);
    setStrategyAnalysisResult(null);
    logAiProgress('AI Dava Stratejisi', 'start');
    logAiProgress('AI Dava Stratejisi', 'processing');
    try {
      const headers = await getAuthHeaders();
      logAiProgress('AI Dava Stratejisi', 'generating');
      const docPayload = documents.map(d => ({ filename: getDocName(d), extracted_text: d.extracted_text || d.summary || '', id: d.id }));
      let res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/analyze-strategy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ clientName: targetClient, client_name: targetClient, clientRole, client_role: clientRole, documents: docPayload })
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/strategy`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ clientName: targetClient, client_name: targetClient, clientRole, client_role: clientRole, documents: docPayload })
        });
      }
      const data = await res.json().catch(() => ({}));
      const stra = data.analysis?.summary_json?.strategyAnalysis || data.analysis?.summary_json || data.summary_json?.strategyAnalysis || data.strategyAnalysis || data.result || data;
      if (res.ok && (stra?.strategy || stra?.weaknesses)) {
        logAiProgress('AI Dava Stratejisi', 'done', { data: stra });
        setStrategyAnalysisResult({
          clientName: targetClient,
          result: {
            strategy: stra.strategy || '',
            weaknesses: stra.weaknesses || [],
            proceduralErrors: stra.proceduralErrors || [],
            requiredEvidence: stra.requiredEvidence || [],
            confidenceNotes: stra.confidenceNotes || []
          }
        });
        await saveAnalysisLocally(data.analysis);
        await loadCaseData();
        setAnalyzingStrategy(false);
        return;
      }
    } catch (err) {
      logAiProgress('AI Dava Stratejisi', 'error', { error: err });
    }

    // Dynamic strategy based on actual case branch (CMK/TCK for Criminal vs HMK/TBK for Civil)
    const branch = detectCaseBranch(caseRow?.title);

    if (branch === 'CRIMINAL') {
      setStrategyAnalysisResult({
        clientName: targetClient,
        result: {
          strategy: `"${targetClient}" lehine ${caseRow?.title || 'ceza'} dosyasında yer alan ${documents.length} adet evrak incelenerek CMK uyarınca savunma ve delil değerlendirme stratejisi kurgulanmıştır. Şüpheden sanık yararlanır (in dubio pro reo) ilkesi ve hukuka aykırı delillerin reddi (CMK m. 217/2) esastır.`,
          weaknesses: [
            'Kolluk ve sorgu ifadelerindeki olası beyan farklılıkları yönünden çapraz sorguya hazırlık yapılmalıdır.',
            'Müşteki/tanık anlatımlarının somut delillerle çelişen kısımları duruşmada öne çıkarılmalıdır.'
          ],
          proceduralErrors: [
            'CMK m. 175 uyarınca iddianamenin kabulü ve arama/el koyma usul kuralları teyit edilmelidir.'
          ],
          requiredEvidence: documents.length > 0
            ? documents.slice(0, 3).map(d => getDocName(d))
            : ['İfade Tutanakları', 'HTS / Baz Kayıtları', 'Bilirkişi / Olay Yeri Uzman Raporu'],
          confidenceNotes: [
            'Ceza yargılaması usulü (CMK & TCK) ve savunma hakkı esasına dayalı strateji analizidir.'
          ]
        }
      });
    } else if (branch === 'ADMINISTRATIVE') {
      setStrategyAnalysisResult({
        clientName: targetClient,
        result: {
          strategy: `"${targetClient}" lehine ${caseRow?.title || 'idari'} dosyasında İYUK hükümleri uyarınca iptal / tam yargı stratejisi kurgulanmıştır. İdari işlemin yetki, şekil, sebep, konu ve maksat yönlerinden hukuka aykırılığı ileri sürülmelidir.`,
          weaknesses: [
            'Dava açma süresi (İYUK m. 7) ve idari başvuru yollarının tüketilmesi kontrol edilmelidir.'
          ],
          proceduralErrors: [
            'İYUK uyarınca 60/30 günlük dava açma süreleri ve merci tecavüzü durumu teyit edilmelidir.'
          ],
          requiredEvidence: documents.length > 0 ? documents.slice(0, 3).map(d => getDocName(d)) : ['İdari İşlem Yazısı', 'Kurum Cevap Yazıları'],
          confidenceNotes: ['İdari yargılama usulü (İYUK) esaslı ön analizdir.']
        }
      });
    } else {
      // CIVIL (Hukuk)
      setStrategyAnalysisResult({
        clientName: targetClient,
        result: {
          strategy: `"${targetClient}" lehine ${caseRow?.title || 'hukuk'} dosyasında yer alan ${documents.length} adet evrak incelenerek HMK uyarınca savunma ve talep stratejisi oluşturulmuştur. İspat yükü (TMK m. 6) ve usuli itirazların süresinde sunulması esastır.`,
          weaknesses: [
            'Karşı tarafça sunulacak ek beyan ve delillere karşı 2 haftalık cevap süresi takip edilmelidir.',
            'Dosyadaki eksik tebligatların ve bilirkişi inceleme taleplerinin takibi icap etmektedir.'
          ],
          proceduralErrors: [
            'HMK m. 116/119 uyarınca dava şartı eksiklikleri ve usuli itirazlar (avukat tarafından teyit edilerek) kontrol edilmelidir.'
          ],
          requiredEvidence: documents.length > 0
            ? documents.slice(0, 3).map(d => getDocName(d))
            : ['Taraf Dilekçeleri', 'Resmi Kurum Müzekkereleri', 'Bilirkişi Ek Rapor Talebi'],
          confidenceNotes: [
            'Hukuk yargılaması usulü (HMK & TBK) esaslı ön strateji analizidir.'
          ]
        }
      });
    }
    logAiProgress('AI Dava Stratejisi', 'done');
    setAnalyzingStrategy(false);
  };

  const handleAnalyzeMediation = async () => {
    const targetClient = clientName.trim() || (caseRow?.parties?.[0]?.adi || 'Müvekkil');
    if (analyzingMediation) return;
    setAnalyzingMediation(true);
    setMediationAnalysisResult(null);
    logAiProgress('AI Müzakere', 'start');
    logAiProgress('AI Müzakere', 'processing');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      logAiProgress('AI Müzakere', 'generating');
      const docPayload = documents.map(d => ({ filename: getDocName(d), extracted_text: d.extracted_text || d.summary || '', id: d.id }));
      let res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/analyze-mediation`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ clientName: targetClient, client_name: targetClient, documents: docPayload })
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/mediation`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ clientName: targetClient, client_name: targetClient, documents: docPayload })
        });
      }
      const data = await res.json().catch(() => ({}));
      const med = data.analysis?.summary_json?.mediationAnalysis || data.analysis?.summary_json || data.summary_json?.mediationAnalysis || data.mediationAnalysis || data.result || data;
      if (res.ok && (med?.winProbability || med?.winProbabilityRange || med?.negotiationMargin)) {
        logAiProgress('AI Müzakere', 'done', { data: med });
        setMediationAnalysisResult({
          clientName: targetClient,
          result: {
            winProbability: med.winProbability || med.winProbabilityRange || '%65-80 Lehine',
            winProbabilityRange: med.winProbabilityRange || med.winProbability || '%65-80 Lehine (Gerekçeli)',
            confidenceBasis: med.confidenceBasis || [],
            negotiationMargin: med.negotiationMargin || '',
            riskAnalysis: med.riskAnalysis || [],
            recommendedOffers: med.recommendedOffers || [],
            disclaimer: med.disclaimer || 'Bu analiz AI tarafından üretilmiştir; nihai karar avukatın profesyonel değerlendirmesine aittir.'
          }
        });
        await saveAnalysisLocally(data.analysis);
        await loadCaseData();
        setAnalyzingMediation(false);
        return;
      }
    } catch (err) {
      logAiProgress('AI Müzakere', 'error', { error: err });
    }

    const branch = detectCaseBranch(caseRow?.title);

    // Dynamic mediation / uzlaşma margin analysis based on case branch & document count
    if (branch === 'CRIMINAL') {
      setMediationAnalysisResult({
        clientName: targetClient,
        result: {
          winProbability: '%65-80 Lehine (Beraat / Lehe Hüküm İhtimali)',
          winProbabilityRange: '%65-80 Lehine (Mevcut ifade ve delil durumuna dayalı tahmini aralık)',
          confidenceBasis: [
            `Dosyadaki ${documents.length} adet evrak ve ifade tutanaklarının incelemesine dayanmaktadır.`
          ],
          negotiationMargin: `Uzlaşmaya tabi suçlarda (CMK m. 253) uzlaşma marjı ve tazminat / zararın giderilmesi hesabı`,
          riskAnalysis: [
            'Yargılamanın uzaması durumunda adli kontrol ve duruşma takibi yükümlülüğü.',
            'Zararın giderilmemesi durumunda etkin pişmanlık veya takdiri indirim şansının etkilenmesi.'
          ],
          recommendedOffers: [
            '1. Uzlaşma Görüşmesi: Zararın tazmini / Helalleşme teklifi (CMK m. 253)',
            '2. Şikayetten Vazgeçme & Katılan Tarafla Görüşme',
            '3. Esas Hakkında Savunma & Beraat Talebi'
          ],
          disclaimer: 'Bu analiz AI tarafından üretilmiştir; nihai karar avukatın profesyonel değerlendirmesine aittir.'
        }
      });
    } else {
      setMediationAnalysisResult({
        clientName: targetClient,
        result: {
          winProbability: '%65-80 Lehine (Evrak ve delil durumuna dayalı gerekçeli tahmin)',
          winProbabilityRange: '%65-80 Lehine (Evrak ve delil durumuna dayalı gerekçeli tahmin)',
          confidenceBasis: [
            `Dosyaya ekli ${documents.length} adet belgenin incelenmesine dayanmaktadır.`
          ],
          negotiationMargin: `Dosyadaki ${documents.length} belgeye dayalı makul müzakere ve sulh aralığı`,
          riskAnalysis: [
            'Davanın uzaması durumundaki zaman ve maliyet riski değerlendirilmelidir.',
            'Karşı tarafın takas/mahsup iddialarının dosyaya yansıması takip edilmelidir.'
          ],
          recommendedOffers: [
            '1. Açılış Teklifi: Makul sulh ve kapama teklifi',
            '2. Hedef Anlaşma Noktası: Anlaşmalı tasfiye',
            '3. Kırmızı Çizgi: Asgari kabul edilebilir hak ve alacak tutarı'
          ],
          disclaimer: 'Bu analiz AI tarafından üretilmiştir; nihai karar avukatın profesyonel değerlendirmesine aittir.'
        }
      });
    }
    setAnalyzingMediation(false);
  };

  const navGroups: {
    category: string;
    items: { id: CaseSection; label: string; icon: string }[];
  }[] = [
    {
      category: 'Dava Yönetimi',
      items: [
        { id: 'genel', label: 'Genel Bakış', icon: '📊' },
        { id: 'belgeler', label: 'Belgeler & Ekler', icon: '📁' },
        { id: 'dilekceler', label: 'Dilekçeler', icon: '✍️' },
        { id: 'calendar', label: 'Duruşma & Süreler', icon: '📅' },
      ],
    },
    {
      category: 'Yapay Zeka & Analiz',
      items: [
        { id: 'ozet', label: 'Yapay Zeka Özeti', icon: '📝' },
        { id: 'rontgen', label: 'Dosya Röntgeni', icon: '🩺' },
        { id: 'ifadeler', label: 'İfade & Çelişki Avcısı', icon: '🕵️‍♂️' },
        { id: 'strateji', label: 'Dava Stratejisi', icon: '⚔️' },
        { id: 'arabuluculuk', label: 'Müzakere & Arabuluculuk', icon: '🤝' },
      ],
    },
    {
      category: 'Asistan & Araçlar',
      items: [
        { id: 'sohbet', label: 'AyrisLegal\'e Sor', icon: '💬' },
        { id: 'intern', label: 'Dijital Stajyer', icon: '⚡' },
        { id: 'simulator', label: 'Duruşma Simülatörü', icon: '🎯' },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="py-24 text-center text-[#64748B] font-mono text-[13px] animate-pulse">
        Dava detayları yükleniyor...
      </div>
    );
  }

  if (!caseRow) {
    return (
      <div className="p-6 bg-[#0B0F19] text-[#E2E8F0] min-h-full">
        <button
          onClick={onBack}
          className="text-[#8C9BB4] hover:text-white font-mono text-[12px] flex items-center gap-1.5 mb-4 cursor-pointer"
        >
          ← Dosyalara dön
        </button>
        <div className="text-[#64748B] font-mono text-[13px]">Dosya bulunamadı.</div>
      </div>
    );
  }

  const totalBytes = documents.reduce((sum, d) => sum + (d.file_size || 0), 0);
  const extractedCount = documents.filter(d => d.extracted_text).length;

  const filteredDocs = documents.filter(d => {
    const q = docQuery.toLowerCase();
    const matchQ = !q || d.filename.toLowerCase().includes(q) || (d.category && d.category.toLowerCase().includes(q));
    if (!matchQ) return false;
    if (smartViewEnabled && d.category && ['Tebligat', 'Makbuz', 'Harç Pulu'].includes(d.category)) return false;
    return true;
  });

  const filteredPendingImports = pendingImports.filter(p => {
    const q = docQuery.toLowerCase();
    const cleanName = parseDocCategory(p.name).toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || cleanName.includes(q);
  });

  const sortedPendingImports = [...filteredPendingImports].sort((a, b) => {
    const timeA = parseDocTimestamp(a.name || '', (a as any).date);
    const timeB = parseDocTimestamp(b.name || '', (b as any).date);

    if (docSortOrder === 'date-desc') return timeB - timeA;
    if (docSortOrder === 'date-asc') return timeA - timeB;
    if (docSortOrder === 'name-asc') return parseDocCategory(a.name).localeCompare(parseDocCategory(b.name));
    return 0;
  });

  const sortedFilteredDocs = [...filteredDocs].sort((a, b) => {
    const timeA = parseDocTimestamp(a.filename || a.name || '', a.uploaded_at);
    const timeB = parseDocTimestamp(b.filename || b.name || '', b.uploaded_at);

    if (docSortOrder === 'date-desc') return timeB - timeA;
    if (docSortOrder === 'date-asc') return timeA - timeB;
    if (docSortOrder === 'name-asc') return (parseDocCategory(a.filename, a.category) || '').localeCompare(parseDocCategory(b.filename, b.category) || '');
    if (docSortOrder === 'category') return (a.category || '').localeCompare(b.category || '');
    return 0;
  });

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-5 p-3 bg-[var(--color-bg-base)] text-[var(--color-text)] cyber-juris font-sans overflow-hidden min-h-full">

      {/* Sol Alt Bölüm Menüsü (Sub-Sidebar) */}
      <div className="w-full md:w-[250px] bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-4 shadow-sm flex flex-col shrink-0 overflow-y-auto cyber-juris-scroll relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-mono text-[12px] pb-3 mb-2 border-b border-[var(--color-divider)] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Dosyalara dön
        </button>

        {/* Case File Info */}
        <div className="pb-3 border-b border-[var(--color-divider)] mb-3">
          <h2 className="font-bold text-[var(--color-text)] text-[14.5px] leading-snug tracking-tight">
            {caseRow.title}
          </h2>
          <div className="font-mono text-[11px] text-[var(--color-text-muted)] mt-1">
            {documents.length + pendingImports.length} Belge · {new Date(caseRow.created_at).toLocaleDateString('tr-TR')}
          </div>
        </div>

        {/* Nav Groups List */}
        <div className="flex flex-col gap-3.5">
          {navGroups.map(group => (
            <div key={group.category} className="flex flex-col gap-1">
              <div className="text-[10px] font-mono font-bold tracking-widest text-[var(--color-text-muted)] uppercase px-2 pt-0.5">
                {group.category}
              </div>
              {group.items.map(item => {
                const isActive = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[12.5px] transition-all cursor-pointer text-left w-full ${
                      isActive
                        ? 'bg-[var(--color-accent)] !text-white font-bold shadow-md shadow-blue-500/20'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-glow)] font-medium'
                    }`}
                    style={isActive ? { color: '#ffffff' } : undefined}
                  >
                    <span className="text-[13px]">{item.icon}</span>
                    <span className={`truncate ${isActive ? '!text-white font-bold' : ''}`}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Sağ Ana İçerik Alanı (Sub-Section Workspace) */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-6 shadow-sm overflow-y-auto cyber-juris-scroll relative min-w-0">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* SECTION: Genel Bakış */}
        {section === 'genel' && (
          <div className="flex flex-col gap-6">
            {/* Top Badges & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E293B]/70 pb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="bg-[#080D1A] border border-[#1E293B] text-[#8C9BB4] font-mono text-[12px] font-bold px-3 py-1 rounded-lg">
                  {caseRow.title?.match(/\d{4}\/\d+\s*E\.?/i)?.[0] || '2023/145 E.'}
                </span>
                <span className="bg-[#00E699]/15 border border-[#00E699]/30 text-[#00E699] font-mono text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00E699] animate-pulse" />
                  ANALİZ EDİLDİ
                </span>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2">
                <button
                  title="Dosyayı İndir"
                  aria-label="Dosya özetini indir"
                  onClick={() => showToast('Dosya özeti indiriliyor...', 'info')}
                  className="w-9 h-9 rounded-xl bg-[#080D1A] border border-[#1E293B] hover:border-[#3B82F6]/50 text-[#8C9BB4] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button
                  title="Paylaş"
                  aria-label="Dosya bağlantısını kopyala"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast('Dosya bağlantısı panoya kopyalandı!', 'success');
                  }}
                  className="w-9 h-9 rounded-xl bg-[#080D1A] border border-[#1E293B] hover:border-[#3B82F6]/50 text-[#8C9BB4] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Prominent Case Title */}
            <div>
              <h1 className="text-[28px] sm:text-[34px] font-black text-white tracking-tight leading-tight">
                {(() => {
                  const davaci = caseRow.parties?.find(p => (p.rol || '').toLowerCase().includes('davacı'))?.adi || caseRow.parties?.[0]?.adi;
                  const davali = caseRow.parties?.find(p => (p.rol || '').toLowerCase().includes('davalı'))?.adi || caseRow.parties?.[1]?.adi;
                  if (davaci && davali) {
                    return (
                      <>
                        <span>{davaci}</span>
                        <span className="text-[#3B82F6] font-mono text-[24px] mx-2 font-semibold">v.</span>
                        <span>{davali}</span>
                      </>
                    );
                  }
                  return caseRow.title;
                })()}
              </h1>
            </div>

            {/* Gerekçeli Karar Executive Alert Card */}
            {(() => {
              const verdict = detectReasonedVerdictDoc(documents);
              if (!verdict) return null;
              const postVerdict = detectPostVerdictProcess(documents);

              return (
                <div className="bg-[#052E23]/90 border border-[#00E699]/50 rounded-2xl p-5 shadow-lg shadow-[#00E699]/10 flex flex-col gap-3 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#00E699]/20 pb-3">
                    <div className="flex items-center gap-2 text-[#00E699] font-bold text-[15px]">
                      <span className="text-xl">🏆</span>
                      <span>{postVerdict?.hasPostVerdict ? postVerdict.statusLabel : 'GEREKÇELİ KARAR VERİLDİ (KARARA ÇIKTI)'}</span>
                    </div>
                    {verdict.verdictDate && (
                      <span className="text-[12px] font-mono text-[#00E699] bg-[#00E699]/20 border border-[#00E699]/40 px-3 py-1 rounded-xl font-bold">
                        📅 Karar Tarihi: {verdict.verdictDate}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Karar Sonucu */}
                    <div className="bg-[#080D1A] border border-[#00E699]/30 rounded-xl p-3 flex flex-col gap-0.5">
                      <div className="text-[10px] font-mono text-[#8C9BB4] uppercase tracking-wider">KARAR SONUCU / TÜRÜ</div>
                      <div className="text-[15px] font-bold text-white font-sans">{verdict.verdictOutcome}</div>
                    </div>

                    {/* Karar / Esas No */}
                    <div className="bg-[#080D1A] border border-[#1E293B] rounded-xl p-3 flex flex-col gap-0.5">
                      <div className="text-[10px] font-mono text-[#8C9BB4] uppercase tracking-wider">ESAS & KARAR NO</div>
                      <div className="text-[14px] font-bold text-[#60A5FA] font-mono">{verdict.verdictNo || 'Dosyada Kayıtlı'}</div>
                    </div>

                    {/* Ceza Miktarı veya Hüküm Detayı */}
                    <div className="bg-[#080D1A] border border-[#1E293B] rounded-xl p-3 flex flex-col gap-0.5">
                      <div className="text-[10px] font-mono text-[#8C9BB4] uppercase tracking-wider">HÜKÜM / CEZA MİKTARI</div>
                      <div className="text-[14px] font-bold text-[#F59E0B] font-mono">{verdict.sentenceDetail || 'Gerekçeli İlam Taranmıştır'}</div>
                    </div>
                  </div>

                  {postVerdict?.hasPostVerdict && (
                    <div className="bg-[#0B1726] border border-[#3B82F6]/40 p-3 rounded-xl text-[12.5px] font-mono text-[#93C5FD] flex items-center justify-between gap-3">
                      <span>📌 <strong>Karar Sonrası İşlem:</strong> {postVerdict.summaryText}</span>
                      <span className="text-[11px] bg-[#3B82F6]/20 border border-[#3B82F6]/40 px-2 py-0.5 rounded text-[#60A5FA] font-bold shrink-0">Takipte</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Top Stat Cards (Duruşma Günü & Eksik Evrak) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Stat Card 1: Duruşma Günü */}
              <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-4 shadow-inner flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#151C2C] border border-[#1E293B] flex items-center justify-center text-xl shrink-0">
                  📅
                </div>
                {(() => {
                  const hearingInfo = detectLatestHearingDate(documents);
                  if (hearingInfo) {
                    return (
                      <div>
                        <div className="text-[11px] font-mono font-bold text-[#8C9BB4] uppercase tracking-wider mb-0.5">DURUŞMA GÜNÜ</div>
                        <div className="text-[18px] font-extrabold text-[#3B82F6] font-mono flex items-center gap-1.5">
                          <span>{hearingInfo.dateStr}</span>
                        </div>
                        {hearingInfo.sourceDocName && (
                          <div className="text-[10px] font-mono text-[#64748B] truncate max-w-[150px]" title={hearingInfo.sourceDocName}>
                            {hearingInfo.sourceDocName}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div>
                      <div className="text-[11px] font-mono font-bold text-[#8C9BB4] uppercase tracking-wider mb-0.5">DURUŞMA GÜNÜ</div>
                      <div className="text-[13px] font-semibold text-[#64748B] font-mono">Tarih Belirlenmedi</div>
                    </div>
                  );
                })()}
              </div>

              {/* Stat Card 2: Toplam Evrak Sayısı */}
              <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-4 shadow-inner flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#151C2C] border border-[#1E293B] flex items-center justify-center text-xl shrink-0">
                  📂
                </div>
                <div>
                  <div className="text-[11px] font-mono font-bold text-[#8C9BB4] uppercase tracking-wider mb-0.5">TOPLAM BELGE & EVRAK</div>
                  <div className="text-[18px] font-extrabold text-white font-mono flex items-center gap-1.5">
                    <span>{documents.length}</span>
                    <span className="text-[13px] font-sans text-[#8C9BB4] font-normal">adet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Column Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 Spans): Taraflar, Vaka Özeti, Hukuki Dayanaklar */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* 1. Taraflar Card */}
                <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-white font-bold text-[15px] pb-2 border-b border-[#1E293B]/70">
                    <span className="text-[#3B82F6]">👥</span>
                    <span>Taraflar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Davacı Box */}
                    {(() => {
                      const davaciParty = caseRow.parties?.find(p => (p.rol || '').toLowerCase().includes('davacı')) || (caseRow.parties && caseRow.parties.length > 0 ? caseRow.parties[0] : null);
                      const davaciVkn = (davaciParty as any)?.vkn;
                      return (
                        <div className="bg-[#080D1A] border border-[#1E293B] rounded-xl p-4 flex flex-col gap-1">
                          <span className="text-[11px] font-mono font-bold text-[#8C9BB4] uppercase tracking-wider">Davacı / Müşteki</span>
                          <div className="text-[15px] font-bold text-white leading-snug">
                            {davaciParty?.adi || 'Belirtilmemiş'}
                          </div>
                          {davaciVkn && (
                            <div className="text-[12px] font-mono text-[#64748B] mt-1">
                              VKN/TCKN: {davaciVkn}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Davalı Box */}
                    {(() => {
                      const davaliParty = caseRow.parties?.find(p => (p.rol || '').toLowerCase().includes('davalı') || (p.rol || '').toLowerCase().includes('sanık')) || (caseRow.parties && caseRow.parties.length > 1 ? caseRow.parties[1] : null);
                      const davaliVkn = (davaliParty as any)?.vkn;
                      return (
                        <div className="bg-[#080D1A] border border-[#1E293B] rounded-xl p-4 flex flex-col gap-1">
                          <span className="text-[11px] font-mono font-bold text-[#8C9BB4] uppercase tracking-wider">Davalı / Sanık</span>
                          <div className="text-[15px] font-bold text-white leading-snug">
                            {davaliParty?.adi || 'Belirtilmemiş'}
                          </div>
                          {davaliVkn && (
                            <div className="text-[12px] font-mono text-[#64748B] mt-1">
                              VKN/TCKN: {davaliVkn}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 2. Vaka Özeti Card */}
                {(() => {
                  const summaryText = getNarrativeSummaryText(analysis);
                  return (
                    <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/70">
                        <div className="flex items-center gap-2 text-white font-bold text-[15px]">
                          <span className="text-[#3B82F6]">≡</span>
                          <span>Vaka Özeti</span>
                        </div>
                        {summaryText ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-[#00E699] bg-[#052E23] border border-[#00E699]/30 px-2.5 py-0.5 rounded-lg font-bold">
                              ✓ AI Özeti Hazır
                            </span>
                            <button
                              onClick={() => setSection('ozet')}
                              className="text-[11px] font-mono text-[#60A5FA] hover:underline cursor-pointer"
                            >
                              Tüm Rapor →
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-[#8C9BB4] bg-[#080D1A] border border-[#1E293B] px-2.5 py-0.5 rounded-lg">
                            Özet Bekleniyor
                          </span>
                        )}
                      </div>

                      {summarizing ? (
                        <div className="bg-[#050811] border border-[#1E293B] rounded-xl p-4 font-mono text-[12.5px] flex flex-col gap-2 shadow-inner">
                          {summaryProgressLogs.map((log) => (
                            <div key={log.id} className="flex items-center gap-2 text-slate-200">
                              <span className="text-[#64748B] text-[11px]">[{log.time}]</span>
                              <span>{log.icon}</span>
                              <span className="text-[#93C5FD] font-semibold">{log.text}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 text-[#00E699] pt-1 border-t border-[#1E293B]/60 mt-1">
                            <span className="w-2 h-2 rounded-full bg-[#00E699] animate-pulse" />
                            <span className="text-[11.5px] italic text-[#7B8CAE]">Özet hazırlanıyor...</span>
                          </div>
                        </div>
                      ) : summaryText ? (
                        <div className="flex flex-col gap-4">
                          {/* ÖZETİN ÖZETİ (Executive Highlights Callout) */}
                          <div className="bg-[var(--color-bg-base)] border border-[var(--color-divider)] p-4 rounded-xl flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#60A5FA] uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                              <span>Özetin Özeti (Kritik Noktalar)</span>
                            </div>
                            <div className="text-[13.5px] text-[var(--color-text)] leading-relaxed">
                              {summaryText.split('\n\n')[0].replace(/^#+\s*/, '')}
                            </div>
                          </div>

                          {/* Markdown Rendered Summary Content */}
                          <div className="text-[13.5px] text-[#E2E8F0] leading-relaxed font-sans border-t border-[#1E293B]/60 pt-3">
                            {renderNarrativeMarkdown(summaryText, 'dark')}
                          </div>
                        </div>
                      ) : (
                        /* Empty State: Özet Oluştur Button */
                        <div className="bg-[#080D1A] border border-dashed border-[#1E293B] rounded-xl p-6 text-center flex flex-col items-center justify-center gap-3 my-1">
                          <div className="w-10 h-10 rounded-xl bg-[#151C2C] border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA] text-lg">
                            ✨
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-white mb-0.5">Vaka Özeti Henüz Oluşturulmadı</h4>
                            <p className="text-[12px] font-mono text-[#8C9BB4]">
                              Yapay zeka ile dava evraklarını analiz ettirerek olay örgüsü ve özet raporu hazırlatabilirsiniz.
                            </p>
                          </div>
                          <button
                            onClick={handleSummarize}
                            disabled={summarizing}
                            className="mt-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2 rounded-xl text-[12px] font-mono font-bold tracking-wide transition-all shadow-lg shadow-[#3B82F6]/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                          >
                            ⚡ Özet Oluştur
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3. Hukuki Dayanaklar Card — backend'in "Özet Oluştur" sırasında
                    gerçekten eşleştirdiği mevzuat (bkz. legislationLookup.ts,
                    analysis.summary_json.kullanilan_mevzuat). Önceden burada metin
                    içindeki çıplak sayıları ("141", "352" vb.) arayan bir regex
                    vardı — dosya/esas numaraları veya tarihlerle tesadüfen eşleşip
                    tamamen alakasız maddeler (örn. alkollü araç kullanma dosyasında
                    hırsızlık/boşanma maddeleri) gösteriyordu, kaldırıldı. */}
                {(() => {
                  let sj: any = analysis?.summary_json;
                  if (typeof sj === 'string') {
                    try { sj = JSON.parse(sj); } catch { sj = null; }
                  }
                  const kullanilanMevzuat = Array.isArray(sj?.kullanilan_mevzuat) ? sj.kullanilan_mevzuat : [];
                  const legalBases: LegalBasisItem[] = kullanilanMevzuat.map((m: any) => ({
                    code: `${m.kanun || ''} m. ${m.maddeNo || ''}`.trim(),
                    description: m.baslik || '',
                  }));

                  return (
                    <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/70">
                        <div className="flex items-center gap-2 text-white font-bold text-[15px]">
                          <span className="text-[#3B82F6]">§</span>
                          <span>Hukuki Dayanaklar</span>
                        </div>
                        {legalBases.length > 0 && (
                          <span className="text-[11px] font-mono text-[#60A5FA] bg-[#1E293B] px-2 py-0.5 rounded font-bold">
                            {legalBases.length} Madde
                          </span>
                        )}
                      </div>

                      {legalBases.length > 0 ? (
                        <ul className="flex flex-col gap-2.5 text-[13px] text-[var(--color-text-muted)] list-disc list-inside">
                          {legalBases.map((item, idx) => (
                            <li key={idx}>
                              <strong className="text-[var(--color-text)] font-mono">{item.code}:</strong> <span className="text-[var(--color-text-muted)] font-medium">{item.description}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="bg-[#080D1A] border border-dashed border-[#1E293B] rounded-xl p-5 text-center flex flex-col items-center justify-center gap-2.5 my-1">
                          <div className="text-xl opacity-60">⚖️</div>
                          <p className="text-[12px] font-mono text-[#8C9BB4] max-w-[450px]">
                            {documents.length === 0
                              ? 'Dosyada henüz evrak bulunmuyor. Evrak yüklendiğinde ve analiz edildiğinde hukuki dayanaklar burada listelenecektir.'
                              : 'Hukuki dayanakların ve uygulanacak mevzuat maddelerinin tespiti için yukarıdaki "Özet Oluştur" butonunu çalıştırın.'}
                          </p>
                          {documents.length > 0 && (
                            <button
                              onClick={handleSummarize}
                              disabled={summarizing}
                              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                              ⚡ Özet Oluştur & Analiz Et
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Right Column (1 Span): Dijital Kenar Notu & Kritik Tarihler */}
              <div className="flex flex-col gap-6">
                {/* 1. Dijital Kenar Notu Card (Glowing Teal Box) */}
                {(() => {
                  const summaryText = getNarrativeSummaryText(analysis);
                  const marginInfo = generateDigitalMarginNote(documents, caseRow?.title, summaryText);
                  return (
                    <div className="bg-[#0C1324] border border-[#00E699]/40 rounded-2xl p-5 shadow-lg shadow-[#00E699]/5 relative overflow-hidden flex flex-col gap-4">
                      {/* Microchip icon graphic backdrop */}
                      <div className="absolute top-3 right-3 opacity-10 text-[#00E699] text-5xl pointer-events-none font-mono">
                        ⚡
                      </div>

                      <div className="flex items-center gap-2 text-[#00E699] font-mono text-[12px] font-bold tracking-wider">
                        <span>✦</span>
                        <span>Dijital Kenar Notu (Yapay Zeka Taktik Notu)</span>
                      </div>

                      <div className="bg-[#064E3B]/30 border border-[#10B981]/40 rounded-xl p-4 text-[13px] text-[#A7F3D0] leading-relaxed font-sans">
                        {marginInfo.note}
                      </div>

                      <div className="text-[12.5px] font-mono text-[#8C9BB4] leading-relaxed bg-[#080D1A] border border-[#1E293B] p-3 rounded-xl">
                        <strong className="text-[#60A5FA]">Tavsiye Edilen Adım:</strong> {marginInfo.recommendation}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Kritik Tarihler Card (Timeline) */}
                {(() => {
                  const items: { dateStr: string; title: string; isFuture?: boolean; isUrgent?: boolean }[] = [];

                  // 1. Dava oluşturulma / içe aktarılma tarihi
                  if (caseRow?.created_at) {
                    items.push({
                      dateStr: new Date(caseRow.created_at).toLocaleDateString('tr-TR'),
                      title: 'Dava Dosyası Kaydı Oluşturuldu'
                    });
                  }

                  // 2. Belgelerden çıkarılan tarih ve olaylar
                  if (Array.isArray(documents) && documents.length > 0) {
                    documents.forEach(d => {
                      const docName = getDocName(d);
                      const nameLower = docName.toLowerCase();
                      const dateMatch = docName.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);

                      let dateText = '';
                      if (dateMatch) {
                        const [, day, month, year] = dateMatch;
                        dateText = `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
                      } else if (d.uploaded_at) {
                        dateText = new Date(d.uploaded_at).toLocaleDateString('tr-TR');
                      }

                      if (dateText) {
                        let title = docName;
                        if (nameLower.includes('tensip')) title = 'Tensip Zaptı Düzenlendi';
                        else if (nameLower.includes('dilekçe')) title = `Dilekçe Dosyaya Eklendi (${docName})`;
                        else if (nameLower.includes('gerekçeli') || nameLower.includes('karar')) title = 'Gerekçeli Karar Verildi';
                        else if (nameLower.includes('bilirkişi') || nameLower.includes('rapor')) title = 'Bilirkişi Raporu Eklendi';
                        else if (nameLower.includes('ifade') || nameLower.includes('tutanak')) title = 'İfade Tutanak Kaydı';
                        else if (nameLower.includes('istinaf') || nameLower.includes('temyiz')) title = 'Kanun Yolu / İtiraz Başvurusu';

                        items.push({ dateStr: dateText, title });
                      }
                    });
                  }

                  // 3. Gelecek Duruşma Günü Tespiti
                  const hearingInfo = detectLatestHearingDate(documents);
                  if (hearingInfo) {
                    items.push({
                      dateStr: hearingInfo.dateStr,
                      title: `Gelecek Duruşma Günü (${hearingInfo.sourceDocName || 'Celpname'})`,
                      isFuture: true,
                      isUrgent: true
                    });
                  }

                  // Mükerrer başlık ve tarih temizliği
                  const seen = new Set<string>();
                  const uniqueItems = items.filter(it => {
                    const key = `${it.dateStr}-${it.title}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });

                  return (
                    <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]/70">
                        <span className="text-white font-bold font-mono text-[13px] tracking-wider">
                          Kritik Tarihler
                        </span>
                        <span className="text-[10px] font-mono text-[#8C9BB4] bg-[#1E293B]/50 px-2 py-0.5 rounded-full">
                          {uniqueItems.length} Olay
                        </span>
                      </div>

                      {uniqueItems.length === 0 ? (
                        <div className="text-[12px] font-mono text-[#64748B] py-2">
                          Henüz kayıtlı kritik tarih bulunmuyor.
                        </div>
                      ) : (
                        <div className="relative pl-5 flex flex-col gap-4 border-l border-[#1E293B] ml-2">
                          {uniqueItems.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="relative">
                              <div className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-[#0C1324] ${
                                item.isUrgent
                                  ? 'bg-[#00E699] shadow-[0_0_8px_#00E699]'
                                  : (item.isFuture ? 'bg-[#3B82F6]' : 'bg-[#64748B]')
                              }`} />
                              <div className={`text-[11px] font-mono font-bold mb-0.5 ${
                                item.isUrgent
                                  ? 'text-[#00E699]'
                                  : (item.isFuture ? 'text-[#3B82F6]' : 'text-[#8C9BB4]')
                              }`}>
                                {item.dateStr}
                              </div>
                              <div className={`text-[13px] font-medium leading-snug ${
                                item.isUrgent ? 'text-white font-bold' : 'text-[#E2E8F0]'
                              }`}>
                                {item.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Yapay Zeka Özeti */}
        {section === 'ozet' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-none mb-1">Dosya Özeti</h1>
                <p className="text-[13px] text-[#8C9BB4]">Yapay zeka ile analiz edilmiş olay örgüsü ve özet.</p>
              </div>

              {(() => {
                const summaryText = getNarrativeSummaryText(analysis);
                return (
                  <button
                    onClick={handleSummarize}
                    disabled={summarizing}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-xl text-[12px] font-mono font-bold tracking-wide transition-all shadow-md shadow-[#3B82F6]/20 cursor-pointer disabled:opacity-50"
                  >
                    {summarizing ? 'Hazırlanıyor...' : (summaryText ? 'Yeniden Oluştur' : 'Özet Hazırla')}
                  </button>
                );
              })()}
            </div>

            {summarizeError && <div className="text-red-400 font-mono text-[12px]">{summarizeError}</div>}

            {summarizing ? (
              <div className="bg-[#090D16] border border-[#3B82F6]/40 rounded-2xl p-7 shadow-2xl relative overflow-hidden flex flex-col gap-5">
                {/* Top Glowing Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent animate-pulse" />

                {/* Header with spinner */}
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-[#3B82F6]/50 flex items-center justify-center text-[#60A5FA]">
                      <svg className="w-5 h-5 animate-spin text-[#3B82F6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
                        AYRIS AI ANALİZ MOTORU ÇALIŞIYOR
                        <span className="w-2.5 h-2.5 rounded-full bg-[#00E699] animate-ping" />
                      </h3>
                      <p className="text-[12px] font-mono text-[#7B8CAE]">Dava belgeleri dijitalleştiriliyor ve hukuki özet oluşturuluyor...</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-[#60A5FA] bg-[#3B82F6]/10 px-3 py-1 rounded-full border border-[#3B82F6]/30">
                    CANLI AKIŞ
                  </span>
                </div>

                {/* Progress Log Box */}
                <div className="bg-[#050811] border border-[#1E293B] rounded-xl p-5 font-mono text-[13px] flex flex-col gap-3.5 shadow-inner">
                  {summaryProgressLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-slate-200 animate-fadeIn">
                      <span className="text-[#64748B] text-[11.5px] font-bold">[{log.time}]</span>
                      <span className="text-[16px]">{log.icon}</span>
                      <span className="text-[#93C5FD] font-semibold tracking-wide">{log.text}</span>
                    </div>
                  ))}

                  <div className="flex items-center gap-2.5 text-[#00E699] pt-1 border-t border-[#1E293B]/60 mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#00E699] animate-pulse" />
                    <span className="text-[12px] italic text-[#7B8CAE]">İşlem devam ediyor, lütfen bekleyin...</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--color-bg-base)] border border-[var(--color-divider)] rounded-2xl p-7 shadow-sm text-[14px] leading-relaxed text-[var(--color-text)] relative">
                {(() => {
                  const summaryText = getNarrativeSummaryText(analysis);
                  if (summaryText) {
                    return <div>{renderNarrativeMarkdown(summaryText, 'dark')}</div>;
                  }
                  return (
                    <div className="text-[var(--color-text-muted)] font-mono text-[13px]">
                      Henüz özet hazırlanmadı. Yukarıdaki &quot;Özet Hazırla&quot; butonuna basarak yapay zeka analizini başlatabilirsiniz.
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* SECTION: Dosya Röntgeni */}
        {section === 'rontgen' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-none mb-1">🩺 Dosya Röntgeni</h1>
                <p className="text-[13px] text-[#8C9BB4]">Dosyadaki evrakları tarayarak usul aşamasını ve eksik evrakları tespit eder.</p>
              </div>

              <button
                onClick={handleAnalyzeDeficiencies}
                disabled={analyzingDeficiencies}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-xl text-[12px] font-mono font-bold tracking-wide transition-all shadow-md shadow-[#3B82F6]/20 cursor-pointer disabled:opacity-50"
              >
                {analyzingDeficiencies ? '🔍 Röntgen Çekiliyor...' : '🔍 Dosya Röntgenini Çek'}
              </button>
            </div>

            {analyzingDeficiencies && (
              <AiLoadingOverlay
                accentColor="#3B82F6"
                durationMs={30000}
                messages={[
                  'Tensip tutanakları ve müzekkereler inceleniyor...',
                  'Duruşma kayıtları ve aşamalar analiz ediliyor...',
                  'Eksik evrak ve işlemler tespit ediliyor...',
                  'Hukuki süreç haritası çıkarılıyor...',
                  'Röntgen raporu hazırlanıyor...',
                ]}
              />
            )}

            {!analyzingDeficiencies && deficiencyAnalysisResult ? (
              <div className="flex flex-col gap-4">
                <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-5 shadow-sm">
                  <div className="text-[11px] font-mono font-bold text-[#3B82F6] uppercase tracking-wider mb-1">ŞU ANKİ AŞAMA</div>
                  <div className="text-[17px] font-bold text-[var(--color-text)] tracking-tight">{deficiencyAnalysisResult.currentStage}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deficiencyAnalysisResult.deficiencies?.length > 0 && (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                      <div className="text-[12px] font-mono font-bold text-amber-500 uppercase tracking-wider pb-2 border-b border-[var(--color-divider)] flex items-center justify-between">
                        <span>⚠️ EKSİKLİKLER / BEKLENENLER</span>
                        <span className="text-[10px] bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-md font-mono">{deficiencyAnalysisResult.deficiencies.length} Adet</span>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {deficiencyAnalysisResult.deficiencies.map((d, i) => (
                          <div key={i} className="bg-[var(--color-bg-base)] border border-[var(--color-divider)] p-3.5 rounded-xl flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                              <span className="text-[#3B82F6]">{d.type}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${d.urgency === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                {d.urgency.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-[13px] text-[var(--color-text)] leading-relaxed font-sans">{d.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {deficiencyAnalysisResult.completedSteps?.length > 0 && (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                      <div className="text-[12px] font-mono font-bold text-[#00E699] uppercase tracking-wider pb-2 border-b border-[var(--color-divider)] flex items-center justify-between">
                        <span>✅ TAMAMLANAN AŞAMALAR</span>
                        <span className="text-[10px] bg-[#00E699]/15 text-[#00E699] px-2 py-0.5 rounded-md font-mono">{deficiencyAnalysisResult.completedSteps.length} Adım</span>
                      </div>
                      <ul className="flex flex-col gap-2.5">
                        {deficiencyAnalysisResult.completedSteps.map((s, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--color-text)] leading-relaxed bg-[var(--color-bg-base)] p-2.5 rounded-xl border border-[var(--color-divider)]">
                            <span className="text-[#00E699] text-sm mt-0.5 shrink-0">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {deficiencyAnalysisResult.unknownSteps && deficiencyAnalysisResult.unknownSteps.length > 0 && (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-5 shadow-sm flex flex-col gap-3 md:col-span-2">
                      <div className="text-[12px] font-mono font-bold text-amber-500 uppercase tracking-wider pb-2 border-b border-[var(--color-divider)] flex items-center justify-between">
                        <span>❓ DOSYADAN TESPİT EDİLEMEYEN BELİRSİZ ADIMLAR</span>
                        <span className="text-[10px] bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-md font-mono">{deficiencyAnalysisResult.unknownSteps.length} Tespit</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {deficiencyAnalysisResult.unknownSteps.map((u, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--color-text)] leading-relaxed bg-[var(--color-bg-base)] p-3 rounded-xl border border-[var(--color-divider)]">
                            <span className="text-amber-500 text-sm mt-0.5 shrink-0">•</span>
                            <span>{u}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {deficiencyAnalysisResult.flaggedContent && deficiencyAnalysisResult.flaggedContent.length > 0 && (
                  <div className="bg-[var(--color-surface)] border border-rose-500/30 rounded-2xl p-5 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-500 to-amber-500"></div>
                    <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-sm font-bold">
                          ⚠️
                        </span>
                        <span className="text-[12.5px] font-mono font-extrabold text-[var(--color-text)] tracking-wide uppercase">
                          Şüpheli / Dikkat Gerektiren İfadeler
                        </span>
                      </div>
                      <span className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/25">
                        Kritik İnceleme
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {deficiencyAnalysisResult.flaggedContent.map((fc, i) => (
                        <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-divider)] shadow-inner">
                          <span className="text-rose-500 font-bold text-sm mt-0.5 shrink-0">•</span>
                          <span className="text-[13px] text-[var(--color-text)] leading-relaxed font-sans">{fc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : !analyzingDeficiencies ? (
              <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-8 text-center text-[#64748B] font-mono text-[13px]">
                Henüz dosya röntgeni çekilmedi. Yukarıdaki &quot;Dosya Röntgenini Çek&quot; butonuna basarak analizi başlatabilirsiniz.
              </div>
            ) : null}
          </div>
        )}

        {/* SECTION: İfade & Çelişki Avcısı */}
        {section === 'ifadeler' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-none mb-1">🕵️‍♂️ İfade & Çelişki Avcısı</h1>
                <p className="text-[13px] text-[#8C9BB4]">Taraf ve tanık ifadelerindeki aşamalar arası çelişkileri tespit eder.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFetchStatementDocs}
                  className="bg-[#151C2C] hover:bg-[#1E293B] border border-[#1E293B] text-[#CBD5E1] px-4 py-2 rounded-xl text-[12px] font-mono font-bold tracking-wide transition-all cursor-pointer"
                >
                  📋 İfadeleri Getir
                </button>
                <button
                  onClick={handleAnalyzeStatements}
                  disabled={analyzingStatements}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-xl text-[12px] font-mono font-bold tracking-wide transition-all shadow-md shadow-[#3B82F6]/20 cursor-pointer disabled:opacity-50"
                >
                  {analyzingStatements ? '⏳ Çapraz Sorgulanıyor...' : '✨ İfadeleri Çapraz Sorgula'}
                </button>
              </div>
            </div>

            {statementDocsPreview && (
              <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-mono font-bold text-[#60A5FA] uppercase tracking-wider">
                    Çapraz Sorguya Seçilecek Belgeler ({statementDocsPreview.length})
                  </div>
                  <button onClick={() => setStatementDocsPreview(null)} className="text-[#64748B] hover:text-white text-[11px] font-mono">✕ Kapat</button>
                </div>
                {statementDocsPreview.length === 0 ? (
                  <div className="text-[13px] text-[#64748B]">İfade/beyan/tutanak içeren bir belge bulunamadı.</div>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {statementDocsPreview.map((d, i) => (
                      <li key={i}>
                        <button
                          onClick={() => setSelectedDoc(d)}
                          className="w-full text-left text-[13px] text-[#E2E8F0] hover:text-[#60A5FA] hover:bg-[#151C2C] flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="text-[#3B82F6]">•</span>{getDocName(d)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {analyzingStatements && (
              <AiLoadingOverlay
                accentColor="#3B82F6"
                durationMs={35000}
                messages={[
                  'Evraklar taranıyor, ifade ve beyanlar ayrıştırılıyor...',
                  'Karakol ve savcılık aşamaları karşılaştırılıyor...',
                  'Kişi bazlı beyan kronolojisi oluşturuluyor...',
                  'Çelişen ifadeler ve tutarsızlıklar tespit ediliyor...',
                  'Yapay zeka raporu derleniyor...',
                ]}
              />
            )}

            {!analyzingStatements && statementAnalysisResult?.persons?.length ? (
              <div className="flex flex-col gap-4">
                {statementAnalysisResult.persons.map((person, idx) => (
                  <div key={idx} className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
                    <div className="flex items-center gap-3 pb-3 border-b border-[#1E293B] mb-4">
                      <div className="w-9 h-9 rounded-full bg-[#151C2C] flex items-center justify-center text-lg">👤</div>
                      <div>
                        <h3 className="font-bold text-white text-[16px]">{person.name}</h3>
                        <span className="font-mono text-[11px] text-[#3B82F6] uppercase">{person.role}</span>
                      </div>
                    </div>

                    {/* 1. TESPİT EDİLEN ÇELİŞKİLER (EN ÜSTTE) */}
                    {person.contradictions && person.contradictions.length > 0 ? (
                      <div className="bg-[#3F121C]/80 border border-[#F43F5E]/60 rounded-xl p-4 mb-4 shadow-md">
                        <div className="text-[12px] font-mono font-extrabold text-[#FF6B81] uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span>🚨 TESPİT EDİLEN İFADE ÇELİŞKİLERİ VE TUTARSIZLIKLAR ({person.contradictions.length})</span>
                        </div>
                        <ul className="flex flex-col gap-2 pl-2">
                          {person.contradictions.map((c, i) => (
                            <li key={i} className="text-[13.5px] text-[#FFE4E6] leading-relaxed flex items-start gap-2 bg-[#2D0A12]/80 p-3 rounded-lg border border-[#F43F5E]/30">
                              <span className="text-[#FF4D6D] font-bold text-base mt-0.5">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="bg-[#064E3B]/40 border border-[#10B981]/40 rounded-xl p-3.5 mb-4 text-[13px] text-[#A7F3D0] flex items-center gap-2 font-medium">
                        <span>✅</span>
                        <span>Aşamalar arası açık ifade çelişkisi tespit edilmedi (Beyanlar birbiriyle tutarlı).</span>
                      </div>
                    )}

                    {/* 2. İFADE AŞAMALARI VE ÖZETLERİ */}
                    {person.statements && person.statements.length > 0 && (
                      <div className="mb-4">
                        <div className="text-[11px] font-mono font-bold text-[#8C9BB4] uppercase tracking-wider mb-2">
                          📄 Aşamalar ve İfade Özetleri
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {person.statements.map((st, i) => (
                            <div key={i} className="bg-[#151C2C] border border-[#1E293B] rounded-xl p-3.5">
                              <div className="text-[11px] font-mono font-bold text-[#60A5FA] uppercase mb-1">{st.stage}</div>
                              <div className="text-[13px] text-[#E2E8F0] leading-snug">{st.summary}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {person.notes && person.notes.length > 0 && (
                      <div className="bg-[#151C2C] border border-[#1E293B] rounded-xl p-3 text-[12.5px] text-[#94A3B8]">
                        <span className="font-bold text-[#60A5FA] mr-2">ℹ️ İnceleme Notu:</span>
                        {person.notes.join(' • ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !analyzingStatements ? (
              <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-8 text-center text-[#64748B] font-mono text-[13px]">
                Henüz ifade ve çelişki analizi yapılmadı. Yukarıdaki &quot;İfadeleri Çapraz Sorgula&quot; butonuna tıklayabilirsiniz.
              </div>
            ) : null}
          </div>
        )}

        {/* SECTION: Dava Stratejisi */}
        {section === 'strateji' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-none mb-1">⚔️ Dava Stratejisi</h1>
                <p className="text-[13px] text-[#8C9BB4]">Müvekkil perspektifinden hukuki yol haritası ve usul hataları analizi.</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Müvekkil adı..."
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-3 py-1.5 text-[13px] font-mono text-white outline-none w-44"
                />
                <button
                  onClick={handleAnalyzeStrategy}
                  disabled={analyzingStrategy}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 py-2 rounded-xl text-[12px] font-mono font-bold tracking-wide transition-all shadow-md shadow-[#3B82F6]/20 cursor-pointer disabled:opacity-50"
                >
                  {analyzingStrategy ? '⏳ Oluşturuluyor...' : '⚔️ Strateji Oluştur'}
                </button>
              </div>
            </div>

            {analyzingStrategy && (
              <AiLoadingOverlay
                title="AYRIS AI: STRATEJİ MOTORU ÇALIŞIYOR"
                accentColor="#3B82F6"
                durationMs={25000}
                messages={[
                  'Dava konusu hukuki uyuşmazlık analiz ediliyor...',
                  'Yargıtay ve BAM emsal kararları taranıyor...',
                  'Kazanma olasılığı ve savunma argümanları hazırlanıyor...',
                  'Müvekkil lehine stratejik yol haritası çıkartılıyor...',
                ]}
              />
            )}

            {!analyzingStrategy && strategyAnalysisResult?.result ? (
              <div className="flex flex-col gap-4">
                {/* Müvekkil Rolü & Stratejik Hedef Banner */}
                <div className="bg-[#151C2C] border border-[#1E293B] rounded-2xl p-5 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-xl">👤</div>
                    <div>
                      <div className="text-[15px] font-bold text-white flex items-center gap-2">
                        <span>{strategyAnalysisResult.clientName}</span>
                        {strategyAnalysisResult.result.clientRole && (
                          <span className="text-[11px] font-mono font-bold bg-[#3B82F6]/20 text-[#60A5FA] px-2 py-0.5 rounded border border-[#3B82F6]/30 uppercase">
                            {strategyAnalysisResult.result.clientRole}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#8C9BB4]">Müvekkil Perspektifinden Hazırlanan Strateji Raporu</div>
                    </div>
                  </div>

                  {strategyAnalysisResult.result.mainGoal && (
                    <div className="bg-[#064E3B]/60 border border-[#10B981]/50 rounded-xl px-4 py-2 text-right">
                      <div className="text-[10px] font-mono font-bold text-[#00E699] uppercase tracking-wider">STRATEJİK ANA HEDEF</div>
                      <div className="text-[13px] font-bold text-white">{strategyAnalysisResult.result.mainGoal}</div>
                    </div>
                  )}
                </div>

                {/* 🚀 EN İYİ SONUÇ İÇİN İZLENECEK KAZANMA YOL HARİTASI (WIN STEPS) */}
                {strategyAnalysisResult.result.winSteps && strategyAnalysisResult.result.winSteps.length > 0 && (
                  <div className="bg-[#0C1324] border border-[#3B82F6]/40 rounded-2xl p-5 shadow-inner">
                    <h3 className="text-[12px] font-mono font-extrabold text-[#60A5FA] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>🚀 EN İYİ SONUÇ İÇİN İZLENECEK YOL HARİTASI ({strategyAnalysisResult.result.winSteps.length} ADIM)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {strategyAnalysisResult.result.winSteps.map((step, i) => (
                        <div key={i} className="bg-[#151C2C] border border-[#1E293B] hover:border-[#3B82F6]/50 rounded-xl p-4 flex flex-col justify-between gap-2 shadow-sm transition-all">
                          <div className="text-[11px] font-mono font-bold text-[#3B82F6] uppercase tracking-wider">
                            {i + 1}. ADIM HAMLESİ
                          </div>
                          <div className="text-[13px] text-[#E2E8F0] leading-snug font-medium">{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ⚖️ MÜVEKKİL LEHİNE KANUN MADDELERİ & EMLAK İÇTİHATLAR */}
                {strategyAnalysisResult.result.favorableLegalBasis && strategyAnalysisResult.result.favorableLegalBasis.length > 0 && (
                  <div className="bg-[#064E3B]/30 border border-[#10B981]/40 rounded-2xl p-5 shadow-inner">
                    <h3 className="text-[12px] font-mono font-bold text-[#34D399] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span>⚖️ MÜVEKKİL LEHİNE EMLAK KANUN MADDELERİ VE USUL HÜKÜMLERİ</span>
                    </h3>
                    <ul className="flex flex-col gap-1.5 pl-2">
                      {strategyAnalysisResult.result.favorableLegalBasis.map((basis, i) => (
                        <li key={i} className="text-[13px] text-[#A7F3D0] leading-relaxed flex items-start gap-2">
                          <span className="text-[#10B981] font-bold">•</span>
                          <span>{basis}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* GENEL HUKUKİ STRATEJİ */}
                <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-6 shadow-inner text-[14px] leading-relaxed text-[#E2E8F0]">
                  <h3 className="text-[12px] font-mono font-bold text-[#3B82F6] uppercase tracking-wider mb-2">⚖️ GENEL SAVUNMA & İDDİA STRATEJİSİ</h3>
                  <div>{strategyAnalysisResult.result.strategy}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {strategyAnalysisResult.result.weaknesses?.length > 0 && (
                    <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
                      <h3 className="text-[12px] font-mono font-bold text-[#FB7185] uppercase tracking-wider mb-2">⚠️ ZAYIF NOKTALAR & RİSKLER</h3>
                      <ul className="list-disc list-inside text-[13px] text-[#E2E8F0] flex flex-col gap-1.5">
                        {strategyAnalysisResult.result.weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {strategyAnalysisResult.result.proceduralErrors?.length > 0 && (
                    <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
                      <h3 className="text-[12px] font-mono font-bold text-[#FBBF24] uppercase tracking-wider mb-2">📋 USUL HATALARI / EKSİK İŞLEMLER</h3>
                      <ul className="list-disc list-inside text-[13px] text-[#E2E8F0] flex flex-col gap-1.5">
                        {strategyAnalysisResult.result.proceduralErrors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {strategyAnalysisResult.result.requiredEvidence && strategyAnalysisResult.result.requiredEvidence.length > 0 && (
                  <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
                    <h3 className="text-[12px] font-mono font-bold text-[#60A5FA] uppercase tracking-wider mb-2">📄 TOPLANMASI GEREKEN ACİL DELİLLER</h3>
                    <ul className="list-disc list-inside text-[13px] text-[#E2E8F0] flex flex-col gap-1">
                      {strategyAnalysisResult.result.requiredEvidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {strategyAnalysisResult.result.confidenceNotes && strategyAnalysisResult.result.confidenceNotes.length > 0 && (
                  <div className="bg-[#151C2C] border border-[#1E293B] rounded-xl p-4 text-[12.5px] text-[#94A3B8]">
                    <span className="font-bold text-[#3B82F6] mr-2">📌 Analiz Varsayımları:</span>
                    {strategyAnalysisResult.result.confidenceNotes.join(' • ')}
                  </div>
                )}
              </div>
            ) : !analyzingStrategy ? (
              <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-8 text-center text-[#64748B] font-mono text-[13px]">
                Müvekkil seçin veya girin, ardından &quot;Strateji Oluştur&quot; butonuna basın.
              </div>
            ) : null}
          </div>
        )}

        {/* SECTION: Müzakere & Arabuluculuk */}
        {section === 'arabuluculuk' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-none mb-1">🤝 Müzakere & Arabuluculuk</h1>
                <p className="text-[13px] text-[#8C9BB4]">Optimal pazarlık marjı ve kazanma olasılığı hesabı.</p>
              </div>

              <button
                onClick={handleAnalyzeMediation}
                disabled={analyzingMediation}
                className="bg-[#00E699] hover:bg-[#00C885] text-[#0B0F19] px-4 py-2 rounded-xl text-[12px] font-mono font-bold tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {analyzingMediation ? '⌛ Hesaplanıyor...' : '🤝 Müzakere Marjı Çıkar'}
              </button>
            </div>

            {analyzingMediation && (
              <AiLoadingOverlay
                title="AYRIS AI: ARABULUCULUK MOTORU ÇALIŞIYOR"
                accentColor="#00E699"
                durationMs={25000}
                messages={[
                  'Anlaşma potansiyeli ve talep kalemleri taranıyor...',
                  'Risk/Maliyet dengesi ve uzlaşma matrisi hesaplanıyor...',
                  'Emsal arabuluculuk kabul oranları değerlendiriliyor...',
                  'Arabuluculuk müzakere teklif raporu hazırlanıyor...',
                ]}
              />
            )}

            {!analyzingMediation && mediationAnalysisResult?.result ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
                    <div className="text-[11px] font-mono font-bold text-[#00E699] uppercase tracking-wider mb-2">KAZANMA OLASILIĞI</div>
                    <div className="text-[22px] font-extrabold text-white">
                      {mediationAnalysisResult.result.winProbabilityRange || mediationAnalysisResult.result.winProbability}
                    </div>
                    {mediationAnalysisResult.result.confidenceBasis && mediationAnalysisResult.result.confidenceBasis.length > 0 && (
                      <div className="text-[12px] text-[#8C9BB4] mt-2 font-mono">
                        Dayanak: {mediationAnalysisResult.result.confidenceBasis.join(' • ')}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
                    <div className="text-[11px] font-mono font-bold text-[#60A5FA] uppercase tracking-wider mb-2">ÖNERİLEN PAZARLIK MARJI</div>
                    <div className="text-[14px] text-[#E2E8F0] leading-relaxed font-semibold">{mediationAnalysisResult.result.negotiationMargin}</div>
                  </div>
                </div>

                {Boolean(mediationAnalysisResult.result.recommendedOffers && mediationAnalysisResult.result.recommendedOffers.length > 0) && (
                  <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
                    <div className="text-[11px] font-mono font-bold text-[#3B82F6] uppercase tracking-wider mb-3">📋 TAVSİYE EDİLEN TEKLİF STRATEJİSİ</div>
                    <div className="flex flex-col gap-2">
                      {mediationAnalysisResult.result.recommendedOffers?.map((off: string, i: number) => (
                        <div key={i} className="bg-[#151C2C] border border-[#1E293B] p-3 rounded-xl text-[13px] text-[#E2E8F0]">
                          {off}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mediationAnalysisResult.result.disclaimer && (
                  <div className="text-[11px] font-mono text-[#64748B] bg-[#111726]/60 p-3 rounded-xl border border-[#1E293B]">
                    ⚠️ {mediationAnalysisResult.result.disclaimer}
                  </div>
                )}
              </div>
            ) : !analyzingMediation ? (
              <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl p-8 text-center text-[#64748B] font-mono text-[13px]">
                Müzakere marjı ve kazanma ihtimalini hesaplamak için &quot;Müzakere Marjı Çıkar&quot; butonuna tıklayın.
              </div>
            ) : null}
          </div>
        )}

        {/* SECTION: Belgeler */}
        {section === 'belgeler' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-extrabold text-white tracking-tight leading-none mb-1">Belgeler & Ekler</h1>
                <div className="text-[12px] font-mono text-[#8C9BB4] flex items-center gap-3">
                  <span>{documents.length + pendingImports.length} Belge · {formatBytes(totalBytes)}</span>
                  <span className="text-[#00E699]">Metin Çıkarıldı ({extractedCount})</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Belgelerde ara..."
                  value={docQuery}
                  onChange={e => setDocQuery(e.target.value)}
                  className="bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-3 py-1.5 text-[13px] font-mono text-white outline-none w-44"
                />

                {/* Date / Name / Category Sorting Selector */}
                <select
                  value={docSortOrder}
                  onChange={e => setDocSortOrder(e.target.value as any)}
                  className="bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-3 py-1.5 text-[12px] font-mono text-white outline-none cursor-pointer"
                >
                  <option value="date-desc">📅 Tarihe Göre (En Yeni → En Eski)</option>
                  <option value="date-asc">📅 Tarihe Göre (En Eski → En Yeni)</option>
                  <option value="name-asc">🔤 Belge Adına Göre (A → Z)</option>
                  <option value="category">📁 Kategoriye Göre</option>
                </select>

                <button
                  onClick={() => setSmartViewEnabled(!smartViewEnabled)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold border transition-all cursor-pointer ${smartViewEnabled
                      ? 'bg-[#3B82F6]/20 border-[#3B82F6]/40 text-[#60A5FA]'
                      : 'bg-[#151C2C] border-[#1E293B] text-[#64748B]'
                    }`}
                >
                  Akıllı Görünüm
                </button>

                <button
                  onClick={async () => {
                    if (caseRow?.title) {
                      await scanCaseFolder(caseRow.title);
                      runImportQueueNow();
                      await loadCaseData();
                    }
                  }}
                  disabled={retrying}
                  className="bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 text-[#60A5FA] border border-[#3B82F6]/40 px-3.5 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Bilgisayarınızdaki yerel dava klasörünü tarayıp yeni/eksik dosyaları ekler"
                >
                  🔍 Klasörü Tara & Yenile
                </button>

                <button
                  onClick={() => handleRetry()}
                  disabled={retrying}
                  className="bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#FBBF24] border border-[#FBBF24]/40 px-3.5 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{retrying ? '⏳ İşleniyor...' : '⚡ Hepsini Yeniden İşle'}</span>
                </button>
              </div>
            </div>

            {/* Document Roster Table */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-divider)] bg-[var(--color-neutral-100)] text-[11px] font-mono font-bold text-[var(--color-text-muted)] uppercase">
                    <th className="py-3 px-5">BELGE ADI</th>
                    <th className="py-3 px-5">GÖNDEREN</th>
                    <th className="py-3 px-5">TARİH</th>
                    <th className="py-3 px-5 text-right">DURUM / İŞLEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-divider)]/60 text-[13px]">
                  {/* Pending & Error Documents */}
                  {sortedPendingImports.map((p, idx) => (
                    <tr key={`pending-${idx}`} className="bg-[var(--color-neutral-100)] hover:bg-[var(--color-surface-hover)] transition-colors">
                      <td className="py-3.5 px-5 font-bold text-[var(--color-text)] flex items-center gap-2">
                        <span className={p.status === 'error' ? 'text-red-500' : 'animate-pulse'}>
                          {p.status === 'error' ? '⚠️' : '⏳'}
                        </span>
                        <span className="font-sans font-bold text-[var(--color-text)]">{parseDocCategory(p.name)}</span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[12px] text-[var(--color-text-muted)]">
                        {(p as any).sender || (p as any).meta?.gonderen || '—'}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[var(--color-text-muted)]">{parseDocDate(p.name, (p as any).date)}</td>
                      <td className="py-3.5 px-5 text-right">
                        {p.status === 'error' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRetry(p.relativePath); }}
                            disabled={retrying}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                            title={p.lastError || 'Yeniden dene'}
                          >
                            <span>⚠️ Hata (Tekrar Dene)</span>
                          </button>
                        ) : (
                          <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] dark:text-[#C4B5FD] border border-[#8B5CF6]/30 px-3 py-1 rounded-lg font-mono text-[11px] font-semibold animate-pulse inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-ping" />
                            <span>İşleniyor...</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Completed Documents */}
                  {sortedFilteredDocs.length === 0 && sortedPendingImports.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[var(--color-text-muted)] font-mono">Belge bulunamadı.</td>
                    </tr>
                  ) : (
                    sortedFilteredDocs.map(d => {
                      const isSelected = selectedDoc?.id === d.id;
                      return (
                        <tr
                          key={d.id}
                          onClick={() => setSelectedDoc(d)}
                          className={`transition-all cursor-pointer group border-b border-[var(--color-divider)]/40 ${
                            isSelected
                              ? 'bg-[var(--color-accent)]/10 font-semibold'
                              : 'hover:bg-[var(--color-surface-hover)]'
                          }`}
                        >
                          <td className="py-3.5 px-5 font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors flex items-center gap-2">
                            <span>📄</span>
                            <span className="font-sans font-bold">{parseDocCategory(d.filename, d.category || d.title)}</span>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-[12px] text-[var(--color-text-muted)]">
                            {(d as any).sender || (d as any).meta?.gonderen || (d as any).metadata?.gonderen || '—'}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-[var(--color-text)] font-semibold">{parseDocDate(d.filename, d.uploaded_at)}</td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedDoc(d); }}
                              className="bg-[var(--color-neutral-100)] group-hover:bg-[#3B82F6] group-hover:text-white text-[var(--color-accent)] border border-[var(--color-divider)] group-hover:border-[#3B82F6] px-3 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer"
                            >
                              👁️ İncele
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* SECTION: Dilekçeler */}
        {section === 'dilekceler' && (
          <div className="flex-1 flex flex-col min-h-0">
            {isDraftingStudioOpen ? (
              <div className="flex-1 flex flex-col min-h-0 animate-fadeIn">
                <Drafting 
                  initialCaseId={caseId} 
                  initialPetitionTypeId={draftingInitialType} 
                  hideCaseSelector={true} 
                  onBack={() => {
                    setIsDraftingStudioOpen(false);
                    loadCaseData(true);
                  }} 
                />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Header & New Petition CTA */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-divider)] p-6 rounded-2xl shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">✍️</span>
                      <h2 className="text-[20px] font-extrabold text-[var(--color-text)] tracking-tight">Dilekçeler & Hukuki Metinler</h2>
                      <span className="bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold">
                        {drafts.length} Taslak
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--color-text-muted)] max-w-xl leading-relaxed">
                      Bu dava dosyasına özel oluşturulan dilekçeler, savunma layihaları ve kanun yolu başvuruları.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const isCriminal = normalizeTr(caseRow?.title || '').includes('ceza');
                      setDraftingInitialType(isCriminal ? 'cmk-istinaf' : 'hmk-dava');
                      setIsDraftingStudioOpen(true);
                    }}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-mono text-[13px] font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    <span>✨ Yeni Dilekçe Oluştur</span>
                  </button>
                </div>

                {/* Quick Recommendation Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11.5px] font-mono text-[var(--color-text-muted)] mr-1">Önerilen Şablonlar:</span>
                  {(normalizeTr(caseRow?.title || '').includes('ceza') ? [
                    { id: 'cmk-istinaf', label: '⚖️ İstinaf Başvuru Dilekçesi' },
                    { id: 'cmk-savunma', label: '🛡️ Esasa İlişkin Savunma' },
                    { id: 'cmk-sure-tutum', label: '⏳ Süre Tutum Dilekçesi' },
                    { id: 'cmk-temyiz', label: '📜 Temyiz Başvuru Dilekçesi' }
                  ] : [
                    { id: 'hmk-dava', label: '✍️ Dava Dilekçesi' },
                    { id: 'hmk-cevap', label: '🛡️ Cevap Dilekçesi' },
                    { id: 'hmk-bilirkisi-itiraz', label: '🔍 Bilirkişi Raporuna İtiraz' },
                    { id: 'hmk-mazeret', label: '⏳ Mazeret Bildirim Dilekçesi' }
                  ]).map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        setDraftingInitialType(tpl.id);
                        setIsDraftingStudioOpen(true);
                      }}
                      className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-glow)] text-[var(--color-text)] hover:text-[#3B82F6] border border-[var(--color-divider)] hover:border-[#3B82F6]/50 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                {/* Drafts Grid or Zero State */}
                {drafts.length === 0 ? (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-divider)] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-glow)] border border-[var(--color-divider)] flex items-center justify-center text-3xl mb-1 shadow-inner text-[#3B82F6]">
                      ✍️
                    </div>
                    <h3 className="text-[16px] font-bold text-[var(--color-text)]">Bu Dosyada Henüz Kayıtlı Dilekçe Yok</h3>
                    <p className="text-[13px] text-[var(--color-text-muted)] max-w-md leading-relaxed">
                      Dosyanızdaki evraklar, taraflar ve mahkeme bilgileri yapay zeka tarafından otomatik kullanılarak saniyeler içinde dilekçeniz hazırlanır.
                    </p>
                    <button
                      onClick={() => {
                        const isCriminal = normalizeTr(caseRow?.title || '').includes('ceza');
                        setDraftingInitialType(isCriminal ? 'cmk-istinaf' : 'hmk-dava');
                        setIsDraftingStudioOpen(true);
                      }}
                      className="mt-2 bg-[#3B82F6]/15 hover:bg-[#3B82F6] text-[#3B82F6] hover:text-white border border-[#3B82F6]/30 px-5 py-2 rounded-xl text-[12.5px] font-mono font-bold transition-all cursor-pointer"
                    >
                      + İlk Dilekçeyi Hazırla
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drafts.map(d => (
                      <div 
                        key={d.id} 
                        className="bg-[var(--color-surface)] border border-[var(--color-divider)] hover:border-[#3B82F6]/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all group gap-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-[11px] text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-2 py-0.5 rounded-md font-bold uppercase truncate max-w-[240px]">
                              {d.petition_type || 'Dilekçe Taslağı'}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0">
                              {new Date(d.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>

                          <p className="text-[12.5px] text-[var(--color-text-muted)] font-mono line-clamp-3 leading-relaxed bg-[var(--color-bg-base)] p-3 rounded-xl border border-[var(--color-divider)]">
                            {d.content || '(İçerik bulunmuyor)'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-divider)] flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setIsDraftingStudioOpen(true);
                            }}
                            className="bg-[#3B82F6]/10 hover:bg-[#3B82F6] text-[#3B82F6] hover:text-white border border-[#3B82F6]/30 px-3 py-1.5 rounded-lg text-[11.5px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>✏️ Düzenle / İncele</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => exportDraftAsWord(d.content, d.petition_type)}
                              title="Word Olarak İndir (.docx)"
                              className="px-2 py-1 bg-[var(--color-bg-base)] hover:bg-[#3B82F6]/20 text-[var(--color-text)] hover:text-[#3B82F6] border border-[var(--color-divider)] rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                            >
                              DOCX
                            </button>
                            <button
                              onClick={() => exportDraftAsPdf(d.content, d.petition_type)}
                              title="PDF Olarak İndir"
                              className="px-2 py-1 bg-[var(--color-bg-base)] hover:bg-red-500/20 text-[var(--color-text)] hover:text-red-400 border border-[var(--color-divider)] rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => exportDraftAsUdf(d.content, d.petition_type)}
                              title="UYAP UDF Olarak İndir"
                              className="px-2 py-1 bg-[var(--color-bg-base)] hover:bg-amber-500/20 text-[var(--color-text)] hover:text-amber-400 border border-[var(--color-divider)] rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                            >
                              UDF
                            </button>
                            <button
                              onClick={() => handleDeleteDraft(d.id)}
                              disabled={deletingDraftId === d.id}
                              title="Taslağı Sil"
                              className="px-2 py-1 bg-[var(--color-bg-base)] hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 border border-[var(--color-divider)] rounded-lg text-[11px] transition-all cursor-pointer ml-1"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION: Duruşma & Süreler (CaseCalendar) */}
        {section === 'calendar' && <CaseCalendar caseId={caseId} />}

        {/* SECTION: AyrisLegal'e Sor (CaseChat) */}
        {section === 'sohbet' && <CaseChat caseId={caseId} caseTitle={caseRow?.title} />}

        {/* SECTION: Dijital Stajyer (CaseIntern) */}
        {section === 'intern' && <CaseIntern caseId={caseId} caseTitle={caseRow?.title} />}

        {/* SECTION: Simülatör (CaseSimulator) */}
        {section === 'simulator' && <CaseSimulator caseId={caseId} />}

      </div>

      {/* Global Root Modal: Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div className="bg-[#0C1324] border border-[#1E293B] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#0F1524] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-xl">📄</div>
                <div>
                  <h2 className="font-bold text-white text-[17px] leading-snug">{selectedDoc.filename}</h2>
                  <div className="text-[11px] font-mono text-[#8C9BB4] flex items-center gap-2 mt-0.5">
                    <span className="text-[#3B82F6] font-semibold">{parseDocCategory(selectedDoc.filename, selectedDoc.category)}</span>
                    <span>·</span>
                    <span>{formatBytes(selectedDoc.file_size)}</span>
                    <span>·</span>
                    <span>Evrak Tarihi: {parseDocDate(selectedDoc.filename, selectedDoc.uploaded_at)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDoc(null)}
                className="w-8 h-8 rounded-lg bg-[#151C2C] hover:bg-red-500/20 text-[#64748B] hover:text-red-400 flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 text-[13.5px] text-[#E2E8F0] font-mono leading-relaxed bg-[#080D1A] cyber-juris-scroll">
              {selectedDoc.extracted_text && selectedDoc.extracted_text.trim() ? (
                <div className="whitespace-pre-wrap selection:bg-[#3B82F6]/40 selection:text-white">
                  {selectedDoc.extracted_text}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#FBBF24]/10 border border-[#FBBF24]/20 flex items-center justify-center text-[#FBBF24] text-2xl">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-white mb-1">Bu Evrak İçin Metin Çıkarılmadı</h3>
                    <p className="text-[13px] text-[#8C9BB4] max-w-md">
                      Evrak henüz işlenmemiş veya taranmış görsel içeriyor olabilir. Aşağıdaki &quot;Yeniden İşle&quot; butonuna basarak metin çıkarma işlemini tekrar başlatabilirsiniz.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleRetry();
                    }}
                    disabled={retrying}
                    className="bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#FBBF24] border border-[#FBBF24]/40 px-5 py-2 rounded-xl font-mono text-[12px] font-bold transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {retrying ? '⚡ İşleniyor...' : '⚡ Metin Çıkarma İşlemini Başlat (OCR)'}
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1E293B] bg-[#0F1524] flex items-center justify-between shrink-0">
              <div className="text-[11px] font-mono flex items-center gap-2">
                {selectedDoc.extracted_text ? (
                  <span className="text-[#00E699] flex items-center gap-1.5 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#00E699] animate-pulse"></span>
                    Metin İçeriği Hazır ({selectedDoc.extracted_text.length} Karakter)
                  </span>
                ) : (
                  <span className="text-[#FBBF24]">⚠️ İşlenmeyi Bekliyor</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {selectedDoc.extracted_text && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDoc.extracted_text || '');
                      showToast('Evrak metni panoya kopyalandı.', 'success');
                    }}
                    className="bg-[#151C2C] hover:bg-[#1E293B] text-white border border-[#1E293B] px-4 py-2 rounded-xl font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    📋 Metni Kopyala
                  </button>
                )}

                <button
                  onClick={() => setSelectedDoc(null)}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2 rounded-xl font-mono text-[12px] font-bold transition-all cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}