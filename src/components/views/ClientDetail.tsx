import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DS, Icon, CHAT_SUGGESTIONS, NAV_ITEMS, VIEW_TITLES, S, SUPPORT_CATEGORIES, chipStyle, chipTextStyle, COURT_OPTIONS, draftingEmitter, globalDraftingState, EVENT_TYPE_LABELS, MONTH_NAMES_TR, DAY_NAMES_TR, API_URL } from '@/lib/constants';
import { stripBrackets, escapeHtml, draftFilenameBase, exportDraftAsWord, exportDraftAsPdf, formatBytes, fileExt, FileExtIcon, normalizeTr, formatRelativeTr, renderInlineBold, renderNarrativeMarkdown, useSupabaseToken, getElectronImportStatus, purgeLocalCaseFiles, retryImportEntry, retryCaseImports, checkImportAuth, runImportQueueNow, sameDay, toIcsDate, icsEscape, buildGoogleCalendarUrl, downloadIcsEvent, formatTL, str, getCaseCategory, supportCategoryLabel, AiLoadingOverlay, DraftingStatusMessage, DraftingProgressBar, ProcessLog, consumeChatStream, uploadAndExtractAttachment } from '@/lib/utils';
import { Theme, View, CaseSection, SettingsSection, TarafRow, CaseRow, DocumentRow, AnalysisRow, PendingImportEntry, PendingAttachment, CaseEvent, PrecedentResult, DraftTemplateOption, DraftRow, CalendarEventRow, TemplateRow, ClientRow, LedgerRow, CaseOption, ThreadRow, SupportMessageRow, CurrentUser } from '@/types';
import { useToast } from '@/components/ToastProvider';

export function ClientDetail({ clientId, onBack }: { clientId: string; onBack: () => void }) {
  const { toast, confirm } = useToast();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryDesc, setEntryDesc] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryType, setEntryType] = useState<'alacak' | 'odeme'>('alacak');

  const loadData = React.useCallback(async () => {
    const [{ data: clientData }, { data: ledgerData }] = await Promise.all([
      supabase.from('clients').select('id, name, client_type, notes, created_at').eq('id', clientId).single(),
      supabase.from('client_ledger').select('id, client_id, entry_date, description, amount, entry_type').eq('client_id', clientId).order('entry_date', { ascending: false }),
    ]);
    const c = (clientData as ClientRow) || null;
    setClient(c);
    setNotes(c?.notes || '');
    setLedger((ledgerData as LedgerRow[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { (async () => { await loadData(); })(); }, [loadData]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase.from('clients').update({ notes }).eq('id', clientId);
      if (!error) {
        toast.success('Müvekkil notları kaydedildi.');
      } else {
        toast.error('Notlar kaydedilirken hata oluştu.');
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(entryAmount.replace(',', '.'));
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('client_ledger').insert([{
      client_id: clientId,
      user_id: user.id,
      entry_date: entryDate,
      description: entryDesc.trim() || (entryType === 'alacak' ? 'Hizmet Bedeli' : 'Tahsilat / Ödeme'),
      amount: amountNum,
      entry_type: entryType,
    }]);
    if (!error) {
      setEntryDesc(''); setEntryAmount('');
      await loadData();
      toast.success('Cari hesap kaydı eklendi.');
    } else {
      toast.error('Cari kayıt eklenirken hata oluştu.');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const ok = await confirm({
      title: 'Hesap Hareketini Sil',
      message: 'Bu cari hesap kaydını silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    const { error } = await supabase.from('client_ledger').delete().eq('id', id);
    if (!error) {
      setLedger(prev => prev.filter(l => l.id !== id));
      toast.success('Kayıt silindi.');
    } else {
      toast.error('Kayıt silinirken hata oluştu.');
    }
  };

  const balance = ledger.reduce((sum, l) => sum + (l.entry_type === 'alacak' ? l.amount : -l.amount), 0);

  return (
    <div>
      <button style={{ ...S.btn(), fontSize: 12, marginBottom: 16, opacity: 0.7 }} onClick={onBack}>← Müvekkillere dön</button>
      {loading ? (
        <div style={{ opacity: 0.5, fontSize: 13 }}>Yükleniyor…</div>
      ) : !client ? (
        <div style={{ opacity: 0.5, fontSize: 13 }}>Müvekkil bulunamadı.</div>
      ) : (
        <>
          <h1 style={{ fontFamily: '"Archivo",system-ui,sans-serif', fontWeight: 800, fontSize: 28, margin: '0 0 4px' }}>{client.name}</h1>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 24 }}>
            {(client.client_type === 'Corporate' || client.client_type === 'Kurumsal') ? 'Kurumsal' : 'Bireysel'} · Kayıt: {new Date(client.created_at).toLocaleDateString('tr-TR')}
          </div>

          <div style={{ ...S.card, marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: DS.accent }}>Notlar</div>
            <textarea style={{ ...S.input, minHeight: 80, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Müvekkille ilgili notlarınız…" />
            <button style={{ ...S.btn(true), alignSelf: 'flex-start', padding: '5px 10px', fontSize: 12 }} disabled={savingNotes} onClick={handleSaveNotes}>{savingNotes ? 'Kaydediliyor…' : 'Notu Kaydet'}</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: '"Archivo",system-ui,sans-serif', fontWeight: 800, fontSize: 18 }}>Alacak / Verecek</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: balance > 0 ? DS.accent : (balance < 0 ? '#ef4444' : DS.text) }}>
              {balance > 0 ? 'Alacak: ' : balance < 0 ? 'Borç: ' : 'Bakiye: '}{formatTL(Math.abs(balance))}
            </div>
          </div>

          <form onSubmit={handleAddEntry} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" style={{ ...S.input, width: 150 }} value={entryDate} onChange={e => setEntryDate(e.target.value)} required />
            <select style={{ ...S.input, width: 140 }} value={entryType} onChange={e => setEntryType(e.target.value as 'alacak' | 'odeme')}>
              <option value="alacak">Alacak (ücret)</option>
              <option value="odeme">Ödeme (tahsilat)</option>
            </select>
            <input style={{ ...S.input, width: 130 }} placeholder="Tutar (₺)" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} required />
            <input style={{ ...S.input, flex: 1, minWidth: 160 }} placeholder="Açıklama (opsiyonel)" value={entryDesc} onChange={e => setEntryDesc(e.target.value)} />
            <button type="submit" style={S.btn(true)}>{Icon.plus} Ekle</button>
          </form>

          {ledger.length === 0 ? (
            <div style={{ opacity: 0.4, fontSize: 13 }}>Henüz kayıt yok.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Tarih', 'Açıklama', 'Tür', 'Tutar', ''].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {ledger.map(l => (
                  <tr key={l.id}>
                    <td style={{ ...S.td, opacity: 0.6 }}>{new Date(l.entry_date).toLocaleDateString('tr-TR')}</td>
                    <td style={S.td}>{l.description || '—'}</td>
                    <td style={S.td}><span style={S.tag(l.entry_type === 'alacak' ? 'outline' : 'Aktif')}>{l.entry_type === 'alacak' ? 'Alacak' : 'Ödeme'}</span></td>
                    <td style={S.td}>{formatTL(l.amount)}</td>
                    <td style={S.td}><span onClick={() => handleDeleteEntry(l.id)} style={{ opacity: 0.5, cursor: 'pointer' }}>{Icon.trash}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}