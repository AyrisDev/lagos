import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DS, Icon, CHAT_SUGGESTIONS, NAV_ITEMS, VIEW_TITLES, S, SUPPORT_CATEGORIES, chipStyle, chipTextStyle, COURT_OPTIONS, draftingEmitter, globalDraftingState, EVENT_TYPE_LABELS, MONTH_NAMES_TR, DAY_NAMES_TR, API_URL } from '@/lib/constants';
import { stripBrackets, escapeHtml, draftFilenameBase, exportDraftAsWord, exportDraftAsPdf, formatBytes, fileExt, FileExtIcon, normalizeTr, formatRelativeTr, renderInlineBold, renderNarrativeMarkdown, useSupabaseToken, getElectronImportStatus, purgeLocalCaseFiles, retryImportEntry, retryCaseImports, checkImportAuth, runImportQueueNow, sameDay, toIcsDate, icsEscape, buildGoogleCalendarUrl, downloadIcsEvent, formatTL, str, getCaseCategory, supportCategoryLabel, AiLoadingOverlay, DraftingStatusMessage, DraftingProgressBar, ProcessLog, consumeChatStream, uploadAndExtractAttachment } from '@/lib/utils';
import { Theme, View, CaseSection, SettingsSection, TarafRow, CaseRow, DocumentRow, AnalysisRow, PendingImportEntry, PendingAttachment, CaseEvent, PrecedentResult, DraftTemplateOption, DraftRow, CalendarEventRow, TemplateRow, ClientRow, LedgerRow, CaseOption, ThreadRow, SupportMessageRow, CurrentUser } from '@/types';
import { useToast } from '@/components/ToastProvider';

export function Chat() {
  const { toast, confirm: confirmDialog } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; id?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem('ayrislegal-active-chat-thread') || null; } catch { return null; }
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const token = useSupabaseToken();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // activeThreadId değiştiğinde localStorage'a kaydet
  const switchThread = (id: string | null) => {
    setActiveThreadId(id);
    try {
      if (id) localStorage.setItem('ayrislegal-active-chat-thread', id);
      else localStorage.removeItem('ayrislegal-active-chat-thread');
    } catch { }
  };
  // send() bir thread'i ilk kez otomatik oluşturduğunda setActiveThreadId çağırıyor;
  // bu da aşağıdaki [activeThreadId] effect'ini tetikliyor. O effect normalde
  // "kullanıcı sidebar'dan başka bir sohbete tıkladı" senaryosu için var — ama az
  // önce oluşturulan thread'de henüz DB'de mesaj olmayabilir (AI hâlâ yanıt
  // üretiyor/akıtıyor), effect'in DB'den boş bir liste okuyup messages'ı [] ile
  // ezmesi, akan yanıtı güncelleyen setMessages çağrılarını "next[-1] undefined"
  // hatasıyla çökertiyordu. Bu bayrak, sadece send()'in kendi oluşturduğu geçişte
  // DB'den yeniden yüklemeyi bir kez atlatıyor (yerel state zaten doğru).
  const suppressNextHistoryLoadRef = React.useRef(false);
  // Kullanıcı yanıt akarken "Yeni Sohbet"e basar ya da başka bir sohbete geçerse,
  // eski isteğin onDelta/finally callback'lerinin artık farklı bir messages
  // state'i üzerinde çalışmasını (ve benzer şekilde çökmesini) önlemek için.
  const requestIdRef = React.useRef(0);
  const activeCtrlRef = React.useRef<AbortController | null>(null);
  const cancelActiveRequest = () => {
    requestIdRef.current += 1;
    activeCtrlRef.current?.abort();
    activeCtrlRef.current = null;
    setLoading(false);
  };

  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadThreads = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setThreadsLoading(false); return; }
    const { data } = await supabase
      .from('chat_threads')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setThreads((data as ThreadRow[]) || []);
    setThreadsLoading(false);
  }, []);

  useEffect(() => { (async () => { await loadThreads(); })(); }, [loadThreads]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!activeThreadId) { setMessages([]); return; }
      if (suppressNextHistoryLoadRef.current) {
        suppressNextHistoryLoadRef.current = false;
        return;
      }
      setHistoryLoading(true);
      const { data, error: histError } = await supabase
        .from('thread_messages')
        .select('id, role, content')
        .eq('thread_id', activeThreadId)
        .order('created_at', { ascending: true });
      if (!active) return;
      setHistoryLoading(false);
      if (!histError) {
        setMessages((data || []).map((m: { id: string; role: 'user' | 'assistant'; content: string }) => ({ id: m.id, role: m.role, text: m.content })));
      }
    })();
    return () => { active = false; };
  }, [activeThreadId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleNewChat = () => {
    cancelActiveRequest();
    switchThread(null);
    setMessages([]);
    setError('');
    setAttachments([]);
  };

  const handleDeleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmDialog({
      title: 'Sohbeti Sil',
      message: 'Bu yapay zeka sohbet geçmişini silmek istediğinize emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
      confirmVariant: 'danger',
    });
    if (!ok) return;

    const { error } = await supabase.from('chat_threads').delete().eq('id', id);
    if (!error) {
      setThreads(prev => prev.filter(t => t.id !== id));
      if (activeThreadId === id) handleNewChat();
      toast.success('Sohbet geçmişi silindi.');
    } else {
      toast.error('Sohbet silinirken hata oluştu.');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttaching(true);
    setError('');
    try {
      const att = await uploadAndExtractAttachment(file, token);
      setAttachments(prev => [...prev, att]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya işlenemedi.');
    } finally {
      setAttaching(false);
    }
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const send = async (overrideText?: string) => {
    const txt = (overrideText || input).trim();
    if (!txt || loading) return;
    setInput('');
    setError('');
    const outgoingAttachments = attachments;
    setAttachments([]);
    setMessages(prev => [...prev, { role: 'user', text: txt + (outgoingAttachments.length > 0 ? `\n\n[Ek dosya(lar): ${outgoingAttachments.map(a => a.filename).join(', ')}]` : '') }]);
    setLoading(true);

    // Sabit bir toplam süre sınırı yok — yanıt token token akarken kullanıcı zaten
    // ilerlemeyi görüyor. Art arda 60sn hiç token gelmezse (sunucu takıldı/koptu)
    // consumeChatStream isteği kendisi iptal ediyor.
    const myId = ++requestIdRef.current;
    const ctrl = new AbortController();
    activeCtrlRef.current = ctrl;
    // Bu isteğin hâlâ "güncel" olup olmadığını kontrol eder — kullanıcı akış
    // sürerken "Yeni Sohbet"e basar ya da başka bir sohbete geçerse (cancelActiveRequest
    // requestIdRef'i ilerletir), eski isteğin callback'leri artık alakasız hale
    // gelen messages state'ini bozmasın diye burada durur.
    const isStale = () => requestIdRef.current !== myId;
    let assistantStarted = false;

    try {
      let threadId = activeThreadId;
      if (!threadId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.'); return; }
        const { data: newThread, error: createError } = await supabase
          .from('chat_threads')
          .insert([{ user_id: user.id, title: 'Yeni Sohbet' }])
          .select('id, title, created_at')
          .single();
        if (createError || !newThread) { setError('Sohbet oluşturulamadı.'); return; }
        threadId = newThread.id;
        if (isStale()) return;
        suppressNextHistoryLoadRef.current = true;
        switchThread(threadId);
        setThreads(prev => [newThread as ThreadRow, ...prev]);
      }
      if (!threadId) { setError('Sohbet oluşturulamadı.'); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      const freshToken = sessionData?.session?.access_token || token;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (freshToken) headers['Authorization'] = `Bearer ${freshToken}`;

      const res = await fetch(`${API_URL}chat/threads/${encodeURIComponent(threadId)}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: txt, attachments: outgoingAttachments }),
        signal: ctrl.signal,
      });

      if (isStale()) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setError(data.error || `Hata: ${res.status}`);
        return;
      }

      const finalThreadId = threadId;
      const { newTitle, error: streamError } = await consumeChatStream(res, ctrl, (delta) => {
        if (isStale()) return;
        setMessages(prev => {
          if (!assistantStarted) {
            assistantStarted = true;
            return [...prev, { role: 'assistant', text: delta }];
          }
          const next = [...prev];
          const last = next[next.length - 1];
          if (!last || last.role !== 'assistant') return [...prev, { role: 'assistant', text: delta }];
          next[next.length - 1] = { ...last, text: last.text + delta };
          return next;
        });
      });
      if (isStale()) return;
      if (streamError) setError(streamError);
      if (newTitle) {
        setThreads(prev => prev.map(t => t.id === finalThreadId ? { ...t, title: newTitle } : t));
      }
    } catch (e) {
      if (isStale()) return;
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('Asistan uzun süre yanıt vermedi (AI sunucusu uykuda ya da meşgul olabilir). Lütfen birkaç dakika sonra tekrar deneyin.');
      } else {
        setError('Asistan servisine bağlanılamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      if (!isStale()) setLoading(false);
    }
  };

  const [showProcessLogs, setShowProcessLogs] = useState(false);

  const isNewChat = messages.length === 0 && !historyLoading;

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Sohbetler listesi */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid ' + DS.divider, display: 'flex', flexDirection: 'column', paddingRight: 14, marginRight: 18 }}>
        <button
          onClick={handleNewChat}
          style={{ ...S.btn(true), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14, fontSize: 13 }}
        >
          {Icon.plus} Yeni Sohbet
        </button>
        <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>Sohbetlerim</div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {threadsLoading ? (
            <div style={{ fontSize: 12, opacity: 0.4 }}>Yükleniyor…</div>
          ) : threads.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.4 }}>Henüz sohbet yok.</div>
          ) : threads.map(t => (
            <div
              key={t.id}
              onClick={() => { if (t.id !== activeThreadId) { cancelActiveRequest(); switchThread(t.id); } }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                padding: '8px 8px', cursor: 'pointer', fontSize: 12.5,
                background: activeThreadId === t.id ? DS.surface : 'transparent',
                borderLeft: activeThreadId === t.id ? `2px solid ${DS.accent}` : '2px solid transparent',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: activeThreadId === t.id ? 700 : 500 }}>{t.title}</div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>{formatRelativeTr(t.created_at)}</div>
              </div>
              <span onClick={(e) => handleDeleteThread(t.id, e)} style={{ opacity: 0.35, flexShrink: 0 }}>{Icon.trash}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sohbet alanı */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {/* Header Toolbar & Live Log Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid ' + DS.divider }}>
          <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: DS.text }}>
            <span>🤖</span> Hukuki Sohbet & AI İşlem Günlüğü
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowProcessLogs(prev => !prev)}
              style={{
                ...S.btn(),
                fontSize: 11,
                fontFamily: 'monospace',
                background: showProcessLogs ? '#1E2A42' : 'transparent',
                borderColor: showProcessLogs ? '#3B82F6' : DS.divider,
                color: showProcessLogs ? '#60A5FA' : '#8C9BB4',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer'
              }}
              title="Yapay zeka arka plan adımlarını ve canlı işlem günlüklerini göster"
            >
              <span>⚡</span> {showProcessLogs ? 'İşlem Günlüğünü Gizle' : 'İşlem Günlüğünü Göster'}
            </button>

            {messages.length > 0 && (
              <button
                style={{ ...S.btn(), fontSize: 11, opacity: 0.7 }}
                onClick={handleNewChat}
              >
                Yeni Sohbet
              </button>
            )}
          </div>
        </div>

        {/* Live Process Log Panel if toggled open */}
        {showProcessLogs && (
          <div style={{ marginBottom: 12 }}>
            <ProcessLog />
          </div>
        )}

        {/* Mesajlar / Hoşgeldin */}
        {historyLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, fontSize: 13 }}>Yükleniyor…</div>
        ) : isNewChat ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px' }}>
            <h1 style={{ fontFamily: '"Archivo",system-ui,sans-serif', fontWeight: 800, fontSize: 34, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Hukuki Asistan</h1>
            <p style={{ fontSize: 14, opacity: 0.55, marginBottom: 32, maxWidth: 420 }}>
              Genel hukuki sorularınızı sorabilirsiniz. Belirli bir dosyayla ilgili soru sormak için o dosyanın ayrıntı ekranındaki &quot;AyrisLegal&apos;e Sor&quot; bölümünü kullanın.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 520, width: '100%', marginBottom: 32 }}>
              {CHAT_SUGGESTIONS.map(s => (
                <button
                  key={s.label}
                  onClick={() => send(s.label)}
                  style={{ ...S.card, cursor: 'pointer', textAlign: 'left', border: 'none', flexDirection: 'row', gap: 12, alignItems: 'flex-start' } as React.CSSProperties}
                >
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
            {messages.map((m, i) => (
              <div key={m.id || i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'assistant' && (
                  <div style={{ width: 28, height: 28, flexShrink: 0, background: DS.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, marginRight: 10, alignSelf: 'flex-end' }}>AI</div>
                )}
                <div style={{
                  maxWidth: '72%', padding: '10px 14px', fontSize: 14, lineHeight: 1.65,
                  background: m.role === 'user' ? DS.accent : DS.surface,
                  color: m.role === 'user' ? '#fff' : DS.text,
                }}>
                  {m.role === 'assistant' ? renderNarrativeMarkdown(m.text) : <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div style={{ margin: '8px 0', width: '100%' }}>
                <ProcessLog />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Hata */}
        {error && <div style={{ color: DS.accent, fontSize: 12, marginBottom: 8 }}>{error}</div>}

        {attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {attachments.map((a, i) => (
              <span key={i} style={chipStyle}>
                {Icon.clip}<span style={chipTextStyle}>{a.filename}</span>
                <span onClick={() => removeAttachment(i)} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
              </span>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ borderTop: '1px solid ' + DS.divider, paddingTop: 14, display: 'flex', gap: 8 }}>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelected} />
          <button style={{ ...S.btn(), flexShrink: 0 }} onClick={() => fileInputRef.current?.click()} disabled={attaching} title="Dosya ekle">
            {attaching ? '…' : Icon.clip}
          </button>
          <input
            style={{ ...S.input, flex: 1 }}
            placeholder="Hukuki sorunuzu yazın…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
          />
          <button
            style={{ ...S.btn(true), flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1 }}
            onClick={() => send()}
            disabled={loading || !input.trim()}
          >
            {Icon.send}
          </button>
        </div>
      </div>
    </div>
  );
}