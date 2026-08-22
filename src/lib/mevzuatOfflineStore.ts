'use client';

// AyrisLegal Yerel-Öncelikli (Offline/Local-First) Mevzuat Deposu
// IndexedDB tabanlı olup, temel kanun maddelerini yerel cihazda saklar ve
// internet kesilse bile arama ve dilekçeye alıntı yapmayı 0ms gecikmeyle mümkün kılar.

const DB_NAME = 'AyrisMevzuatOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'maddeler';

interface CachedMadde {
  id: string;
  madde_no: string;
  baslik: string | null;
  metin: string;
  cdn_url: string | null;
  mevzuat_id: string;
  mevzuat_no?: string;
  mevzuat_ad?: string;
  updated_at?: number;
}

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in browser');
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('mevzuat_no', 'mevzuat_no', { unique: false });
        store.createIndex('madde_no', 'madde_no', { unique: false });
        store.createIndex('law_and_madde', ['mevzuat_no', 'madde_no'], { unique: false });
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveMaddelerToOffline(maddeler: CachedMadde[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const m of maddeler) {
      store.put({ ...m, updated_at: Date.now() });
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[mevzuatOfflineStore] save error:', e);
  }
}

export async function getOfflineMadde(mevzuatNo: string, maddeNo: string): Promise<CachedMadde | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('law_and_madde');
    return new Promise((resolve) => {
      const req = index.get([mevzuatNo, maddeNo]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function searchOfflineMevzuat(mevzuatNo?: string, query?: string): Promise<CachedMadde[]> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        let list: CachedMadde[] = req.result || [];
        if (mevzuatNo) {
          list = list.filter(m => m.mevzuat_no === mevzuatNo);
        }
        if (query && query.trim()) {
          const qLower = query.toLowerCase();
          list = list.filter(m => 
            (m.baslik && m.baslik.toLowerCase().includes(qLower)) ||
            (m.metin && m.metin.toLowerCase().includes(qLower)) ||
            (m.madde_no && m.madde_no.includes(query.trim()))
          );
        }
        resolve(list.slice(0, 50));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
