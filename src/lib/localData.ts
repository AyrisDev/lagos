// Yerel SQLite'a (Electron ana sürecinde, bkz. electron/lib/localDataStore.js)
// IPC üzerinden erişim. getCaseBundle, CaseDetail.tsx'in ESKİDEN dört ayrı
// Supabase sorgusuyla (cases/documents/analyses/drafts) aldığı veriyi BİREBİR
// aynı şekilde döner — component'in ayrıştırma mantığına hiç dokunulmadı.
import type { CaseRow, DocumentRow, AnalysisRow, DraftRow } from '@/types';

export interface CaseBundle {
  cData: CaseRow | null;
  dData: DocumentRow[];
  aData: AnalysisRow[];
  drData: DraftRow[];
}

type ElectronBridge = {
  localDataGetCaseBundle?: (payload: { caseTitle: string; caseId: string }) => Promise<CaseBundle>;
};

function getBridge(): ElectronBridge | undefined {
  return (window as unknown as { electron?: ElectronBridge }).electron;
}

const EMPTY_BUNDLE: CaseBundle = { cData: null, dData: [], aData: [], drData: [] };

// caseTitle olmadan yerel dosya konumu çözülemez (dava klasörü isimlendirmesi
// başlığa dayalı, bkz. fileStore.js::sanitizeName) — bu yüzden hem başlık hem
// id gerekiyor. Electron dışında (tarayıcı/dev modu) veya IPC henüz hazır
// değilse boş bundle döner, çağıran taraf mevcut "veri yok" durumlarına düşer.
export async function getCaseBundle(caseTitle: string | undefined | null, caseId: string): Promise<CaseBundle> {
  if (!caseTitle) return EMPTY_BUNDLE;
  const fn = getBridge()?.localDataGetCaseBundle;
  if (!fn) return EMPTY_BUNDLE;
  try {
    const bundle = await fn({ caseTitle, caseId });
    return bundle || EMPTY_BUNDLE;
  } catch (e) {
    console.error('[localData] getCaseBundle başarısız:', e);
    return EMPTY_BUNDLE;
  }
}

export interface UyapNotificationItem {
  id: string;
  bildirim_id?: number | null;
  mesaj_id?: number | null;
  baslik: string;
  mesaj: string;
  dosya_no?: string | null;
  birim_adi?: string | null;
  kategori?: string;
  gonderilme_tarihi: string;
  okundu_mu: number | boolean;
  created_at?: string;
}

export async function getUyapNotifications(limit = 30): Promise<UyapNotificationItem[]> {
  const fn = (window as any)?.electron?.localDataGetUyapNotifications;
  if (!fn) return [];
  try {
    const list = await fn({ limit });
    return Array.isArray(list) ? list : [];
  } catch {
    // Electron ana süreci yeniden başlatılana kadar sessizce boş döner
    return [];
  }
}
