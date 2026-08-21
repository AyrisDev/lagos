import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/constants';
import { renderNarrativeMarkdown, useSupabaseToken, ProcessLog, consumeChatStream, uploadAndExtractAttachment } from '@/lib/utils';
import { PendingAttachment } from '@/types';
import * as localData from '@/lib/localData';

export function CaseChat({ caseId, caseTitle }: { caseId: string; caseTitle?: string | null }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; id?: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const token = useSupabaseToken();
  const bottomRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caseDocs, setCaseDocs] = useState<{ id: string; filename: string }[]>([]);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  useEffect(() => {
    requestIdRef.current += 1;
    let active = true;
    (async () => {
      setHistoryLoading(true);
      const { data, error: histError } = await supabase
        .from('chat_messages')
        .select('id, role, content')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });
      if (!active) return;
      setHistoryLoading(false);
      if (!histError) {
        setMessages((data || []).map((m: { id: string; role: 'user' | 'assistant'; content: string }) => ({ id: m.id, role: m.role, text: m.content })));
      }
    })();
    return () => { active = false; };
  }, [caseId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('documents').select('id, filename').eq('case_id', caseId).order('uploaded_at', { ascending: false });
      setCaseDocs((data as { id: string; filename: string }[]) || []);
    })();
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAttaching(true);
    setError('');
    try {
      for (let i = 0; i < files.length; i++) {
        const item = await uploadAndExtractAttachment(files[i], token);
        setAttachments(prev => [...prev, item]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ek dosya işlenemedi');
    } finally {
      setAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const currentReqId = ++requestIdRef.current;
    const isStale = () => requestIdRef.current !== currentReqId;

    setInput('');
    setError('');
    const userMsg = { role: 'user' as const, text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const pendingAtts = attachments;
    const pendingDocs = selectedDocIds;
    setAttachments([]);
    setSelectedDocIds([]);
    setDocPickerOpen(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !isStale()) {
        await supabase.from('chat_messages').insert([{ user_id: user.id, case_id: caseId, role: 'user', content: text }]);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const freshToken = sessionData?.session?.access_token || token;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (freshToken) headers['Authorization'] = `Bearer ${freshToken}`;

      let fullText = text;
      if (pendingAtts.length > 0) {
        const attsText = pendingAtts.map(a => `[Eklenen Dosya: ${a.filename}]\n${a.extractedText}`).join('\n\n');
        fullText = `${attsText}\n\n${text}`;
      }

      const bodyPayload: Record<string, unknown> = {
        message: fullText,
        content: fullText,
        text: fullText,
        case_id: caseId,
        caseId: caseId,
      };
      if (pendingDocs.length > 0) {
        bodyPayload.selected_doc_ids = pendingDocs;
        bodyPayload.selectedDocIds = pendingDocs;
      }

      // Faz 2 — belge metni ve son analiz artık Postgres'te kalıcı tutulmuyor;
      // yerel SQLite'tan (Faz 1'de yazılmaya başlanan) okuyup isteğe ekliyoruz.
      // Yerelde veri yoksa (tarayıcı modu, henüz senkron olmamış dosya) backend
      // kendi Postgres yedeğine düşüyor — sessizce atlanır.
      try {
        const bundle = await localData.getCaseBundle(caseTitle, caseId);
        if (bundle.dData.length > 0) {
          bodyPayload.case_documents = bundle.dData.map(d => ({ id: d.id, filename: d.filename, extracted_text: d.extracted_text }));
        }
        if (bundle.aData.length > 0) {
          bodyPayload.latest_analysis_summary_json = bundle.aData[0].summary_json;
        }
      } catch (e) {
        console.warn('[CaseChat] Yerel dava bundle\'ı okunamadı, backend Postgres yedeğine düşecek:', e);
      }

      let res = await fetch(`${API_URL}chat/${encodeURIComponent(caseId)}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        res = await fetch(`${API_URL}chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        });
      }

      if (isStale()) return;
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Yanıt alınamadı.');
        return;
      }

      setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

      const streamRes = await consumeChatStream(res, new AbortController(), (delta: string) => {
        if (isStale()) return;
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, text: last.text + delta };
          }
          return next;
        });
      });
      if (isStale()) return;
      if (streamRes.error) setError(streamRes.error);
    } catch {
      if (isStale()) return;
      setError('Asistan servisine bağlanılamadı.');
    } finally {
      if (!isStale()) setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
      <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
        <h2 className="text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
          <span>💬</span> AyrisLegal&apos;e Sor
        </h2>
        <span className="text-[11px] font-mono text-[#00E699] bg-[#052E23] border border-[#00E699]/40 px-2.5 py-0.5 rounded-full">
          Dosya Odaklı Yapay Zeka
        </span>
      </div>

      {/* Messages Scroll Container */}
      <div className="flex flex-col gap-3.5 min-h-[280px] max-h-[420px] overflow-y-auto cyber-juris-scroll pr-1">
        {historyLoading ? (
          <div className="text-[13px] font-mono text-[#64748B] py-8 text-center animate-pulse">
            Sohbet geçmişi yükleniyor...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-[13px] font-mono text-[#64748B] py-8 text-center">
            Bu dosyayla ilgili bir soru sorun — yalnızca bu dosyanın belgelerine bakarak cevap verir.
          </div>
        ) : (
          messages.map((m, i) => (
            <div 
              key={m.id || i}
              className={`max-w-[85%] rounded-2xl p-4 text-[13.5px] leading-relaxed shadow-md ${
                m.role === 'user' 
                  ? 'self-end bg-[#3B82F6] text-white font-medium' 
                  : 'self-start bg-[#151C2C] border border-[#1E293B] text-[#E2E8F0]'
              }`}
            >
              {m.role === 'assistant' ? renderNarrativeMarkdown(m.text) : <div className="whitespace-pre-wrap">{m.text}</div>}
            </div>
          ))
        )}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && <ProcessLog />}
        <div ref={bottomRef} />
      </div>

      {error && <div className="text-red-400 font-mono text-[12px] bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">{error}</div>}

      {/* Document Picker Sub-panel */}
      {docPickerOpen && (
        <div className="bg-[#151C2C] border border-[#1E293B] rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-[12px] text-white">
          {caseDocs.length === 0 ? (
            <div className="text-[#64748B]">Bu dosyada belge yok.</div>
          ) : (
            caseDocs.map(d => (
              <label key={d.id} className="flex items-center gap-2 py-1 cursor-pointer hover:text-[#60A5FA]">
                <input type="checkbox" checked={selectedDocIds.includes(d.id)} onChange={() => toggleDocSelection(d.id)} />
                <span className="truncate">{d.filename}</span>
              </label>
            ))
          )}
        </div>
      )}

      {/* Attachments Chips */}
      {(attachments.length > 0 || selectedDocIds.length > 0) && (
        <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
          {attachments.map((a, i) => (
            <span key={`att-${i}`} className="bg-[#1E2A42] border border-[#3B82F6]/40 text-[#60A5FA] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              📎 <span>{a.filename}</span>
              <button onClick={() => removeAttachment(i)} className="hover:text-white">✕</button>
            </span>
          ))}
          {selectedDocIds.map(id => (
            <span key={id} className="bg-[#052E23] border border-[#00E699]/40 text-[#00E699] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              📄 <span>{caseDocs.find(d => d.id === id)?.filename || 'Belge'}</span>
              <button onClick={() => toggleDocSelection(id)} className="hover:text-white">✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Bottom Send Input Controls */}
      <div className="flex items-center gap-2 pt-1">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={attaching}
          className="p-2.5 rounded-xl bg-[#151C2C] border border-[#1E293B] hover:border-[#3B82F6]/50 text-[#8C9BB4] hover:text-white transition-all cursor-pointer"
          title="Dosya ekle"
        >
          📎
        </button>

        <button 
          onClick={() => setDocPickerOpen(v => !v)}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            docPickerOpen ? 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#60A5FA]' : 'bg-[#151C2C] border-[#1E293B] text-[#8C9BB4] hover:text-white'
          }`}
          title="Dava dosyasından belge seç"
        >
          📄
        </button>

        <input 
          type="text" 
          placeholder="Bu dosyayla ilgili bir soru sorun..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
          className="flex-1 bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder-[#475569]"
        />

        <button 
          onClick={send} 
          disabled={loading || !input.trim()}
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-md shadow-[#3B82F6]/20 disabled:opacity-50 cursor-pointer"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}