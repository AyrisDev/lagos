export type Theme = 'light' | 'dark';
export type View = 'overview' | 'cases' | 'research' | 'drafting' | 'calendar' | 'templates' | 'clients' | 'chat' | 'settings';
export interface TarafRow { adi: string; rol: string; vekil?: string; kisiKurum?: string; }

export interface CaseRow { id: string; title: string; created_at: string; documents?: { count: number }[]; parties?: TarafRow[] | null; }

export interface DocumentRow { 
  id: string; 
  filename: string; 
  uploaded_at: string; 
  extracted_text: string | null; 
  file_size: number | null; 
  summary?: string | null; 
  category?: string | null;
  name?: string | null;
  title?: string | null;
}

export interface AnalysisRow { 
  id: string; 
  summary_json: Record<string, unknown> | null; 
  created_at: string; 
  summary?: string | null;
}

export type CaseSection = 'genel' | 'ozet' | 'belgeler' | 'dilekceler' | 'sohbet' | 'ifadeler' | 'rontgen' | 'strateji' | 'arabuluculuk' | 'simulator' | 'calendar' | 'intern';

export interface PendingImportEntry {
  relativePath: string;
  name: string;
  ext: string;
  status: 'pending' | 'error' | 'done';
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  updatedAt: number;
}

export interface PendingAttachment { filename: string; text: string; extractedText?: string; }

export interface CaseEvent {
  id: string;
  event_date: string;
  title: string;
  event_type: string;
}

export interface PrecedentResult {
  documentId?: string;
  id?: string;
  konu?: string;
  mahkeme?: string;
  esas_no?: string;
  karar_no?: string;
  tarih?: string;
  ozet?: string;
  title?: string;
  court?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface DraftTemplateOption { id: string; name: string; category: string | null; }

export interface DraftRow { id: string; petition_type: string; content: string; case_id: string | null; created_at: string; updated_at: string; cases?: { title: string } | null; }

export interface CalendarEventRow {
  id: string;
  title: string;
  description?: string | null;
  date: string; // ISO
  time?: string | null;
  type: 'hearing' | 'meeting' | 'deadline';
  location?: string | null;
}

export interface TemplateRow { id: string; category: string | null; name: string; description: string | null; file_size: number | null; mime_type: string | null; created_at: string; extracted_text?: string | null; }

export interface ClientRow { id: string; name: string; client_type: string; notes: string | null; created_at: string; }

export interface LedgerRow { id: string; client_id: string; entry_date: string; description: string | null; amount: number; entry_type: 'alacak' | 'odeme'; }

export interface CaseOption { id: string; title: string; parties?: Record<string, unknown>[]; }

export interface ThreadRow { id: string; title: string; created_at: string; }

export interface SupportMessageRow { id: string; category: string; subject: string; message: string; status: string; created_at: string; attachment_name?: string | null; attachment_path?: string | null; }

export type SettingsSection = 'kullanici' | 'abonelik' | 'yedekleme' | 'destek' | 'gizlilik' | 'gorunum' | 'oturum';

export interface CurrentUser {
  email: string;
  fullName: string | null;
}

