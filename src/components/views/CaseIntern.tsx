import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/constants';
import { renderNarrativeMarkdown, useSupabaseToken, ProcessLog, consumeChatStream } from '@/lib/utils';
import * as localData from '@/lib/localData';

interface PinpointResult {
  found?: boolean;
  answer?: string;
  dateInfo?: string;
  documentRef?: string;
  exactExcerpt?: string;
  confidenceScore?: string;
}

export function CaseIntern({ caseId, caseTitle }: { caseId: string; caseTitle?: string | null }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; pinpoint?: PinpointResult; id?: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const token = useSupabaseToken();
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleClearHistory = async () => {
    if (!window.confirm('Stajyer geçmişini silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`${API_URL}chat/${encodeURIComponent(caseId)}?chat_mode=intern`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error('Geçmiş silinemedi');
      setMessages([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Geçmiş silinirken bir hata oluştu.');
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setHistoryLoading(true);
      const { data, error: histError } = await supabase
        .from('chat_messages')
        .select('id, role, content')
        .eq('case_id', caseId)
        .eq('chat_mode', 'intern')
        .order('created_at', { ascending: true });
      if (!active) return;
      setHistoryLoading(false);
      if (!histError) {
        setMessages((data || []).map((m: { id: string; role: 'user' | 'assistant'; content: string }) => {
          let pinpoint: PinpointResult | undefined = undefined;
          let text = m.content;
          try {
            if (m.role === 'assistant' && (m.content.trim().startsWith('{') || m.content.includes('"answer":'))) {
              const parsed = JSON.parse(m.content);
              if (parsed && (parsed.answer || parsed.summary)) {
                pinpoint = parsed;
                text = parsed.answer || parsed.summary || m.content;
              }
            }
          } catch {}
          return { id: m.id, role: m.role, text, pinpoint };
        }));
      }
    })();
    return () => { active = false; };
  }, [caseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (customInput?: string) => {
    const text = (customInput || input).trim();
    if (!text || loading) return;

    if (!customInput) setInput('');
    setError('');
    const userMsg = { role: 'user' as const, text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('chat_messages').insert([{ user_id: user.id, case_id: caseId, role: 'user', content: text, chat_mode: 'intern' }]);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Faz 2 — belge metni artık Postgres'te kalıcı tutulmuyor; yerel
      // SQLite'tan okuyup isteğe ekliyoruz (yerelde yoksa backend kendi
      // Postgres yedeğine düşer, sessizce).
      let docPayload: { id?: string; filename: string; extracted_text: string | null }[] | undefined;
      try {
        const bundle = await localData.getCaseBundle(caseTitle, caseId);
        if (bundle.dData.length > 0) {
          docPayload = bundle.dData.map(d => ({ id: d.id, filename: d.filename, extracted_text: d.extracted_text }));
        }
      } catch (e) {
        console.warn('[CaseIntern] Yerel dava bundle\'ı okunamadı, backend Postgres yedeğine düşecek:', e);
      }

      // Öncelikli olarak Dijital Stajyer Canlı Nokta Atışı Servisini Dene (/cases/:id/digital-intern)
      let internRes = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/digital-intern`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: text, query: text, documents: docPayload })
      });
      if (!internRes.ok) {
        internRes = await fetch(`${API_URL}cases/${encodeURIComponent(caseId)}/live-qa`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ question: text, query: text, documents: docPayload })
        });
      }

      if (internRes.ok) {
        const internData = await internRes.json().catch(() => ({}));
        const resObj = internData.result || internData;
        if (resObj && resObj.answer) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: resObj.answer,
            pinpoint: resObj
          }]);
          setLoading(false);
          return;
        }
      }

      // Fallback: Normal chat stream
      const fallbackBody = JSON.stringify({ message: text, content: text, text: text, case_id: caseId, caseId: caseId, chat_mode: 'intern', case_documents: docPayload });
      let res = await fetch(`${API_URL}chat/${encodeURIComponent(caseId)}/message`, {
        method: 'POST',
        headers,
        body: fallbackBody,
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}chat/stream`, {
          method: 'POST',
          headers,
          body: fallbackBody,
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Yanıt alınamadı.');
        return;
      }

      setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

      const streamRes = await consumeChatStream(res, new AbortController(), (delta: string) => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, text: last.text + delta };
          }
          return next;
        });
      });
      if (streamRes.error) setError(streamRes.error);
    } catch {
      setError('Stajyer servisine bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    '🏥 Hastane ve adli tıp raporu hangi tarihteydi?',
    '📜 Sanığın kolluktaki ifadesi saat kaçta alınmış?',
    '🚗 Olay yeri inceleme raporunda ne yazıyor?',
    '📞 HTS & Baz istasyonu kayıt tarihleri nelerdir?',
    '⚖️ Görgü tanıklarının beyanlarındaki tarihler?',
    '📋 İddianamede geçen ilk sevk maddesi nedir?'
  ];

  return (
    <div className="flex flex-col gap-4 bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#1E293B] pb-3 gap-3">
        <div>
          <h2 className="text-[17px] font-extrabold text-white tracking-tight flex items-center gap-2">
            <span className="text-xl">🎓</span> Dijital Stajyer <span className="text-[11px] font-mono bg-[#3B82F6]/20 text-[#60A5FA] px-2 py-0.5 rounded border border-[#3B82F6]/30 uppercase">Duruşma Canlı Asistanı</span>
          </h2>
          <p className="text-[12.5px] text-[#8C9BB4] font-mono mt-0.5">
            Duruşma esnasında sorularınıza &quot;12 Ekim 2021, Belge no:45&quot; şeklinde saniyeler içinde nokta atışı cevap verir.
          </p>
        </div>

        <button 
          onClick={handleClearHistory}
          className="text-[#64748B] hover:text-[#FB7185] font-mono text-[11px] px-3 py-1.5 rounded-lg border border-[#1E293B] hover:border-red-500/30 transition-colors cursor-pointer"
        >
          Geçmişi Temizle
        </button>
      </div>

      {/* Messages Scroll Container */}
      <div className="flex flex-col gap-3.5 min-h-[300px] max-h-[460px] overflow-y-auto cyber-juris-scroll pr-1">
        {historyLoading ? (
          <div className="text-[13px] font-mono text-[#64748B] py-8 text-center animate-pulse">
            Dijital Stajyer hafızası yükleniyor...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
            <div className="text-[13px] font-mono text-[#8C9BB4] max-w-md">
              ⚡ Duruşma salonundayken dosya evraklarından saniyeler içinde bilgi çekmek için soru sorun veya hazır butonlara tıklayın:
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => send(qp)}
                  className="bg-[#151C2C] hover:bg-[#1E2A42] border border-[#1E293B] hover:border-[#3B82F6]/50 text-[#60A5FA] font-mono text-[12px] p-3 rounded-xl text-left transition-all shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <span>{qp}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div 
              key={m.id || i}
              className={`max-w-[90%] rounded-2xl p-4 text-[13.5px] leading-relaxed shadow-md ${
                m.role === 'user' 
                  ? 'self-end bg-[#3B82F6] text-white font-medium' 
                  : 'self-start bg-[#151C2C] border border-[#1E293B] text-[#E2E8F0]'
              }`}
            >
              {m.role === 'assistant' ? (
                <div className="flex flex-col gap-2.5">
                  {m.pinpoint && (
                    <div className="bg-[#0C1324] border border-[#3B82F6]/40 rounded-xl p-3.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-[#60A5FA] uppercase tracking-wider">📌 NOKTA ATIŞI DURUŞMA YANITI</span>
                        {m.pinpoint.confidenceScore && (
                          <span className="text-[10px] font-mono font-bold text-[#00E699] bg-[#064E3B]/60 px-2 py-0.5 rounded">
                            Güven: {m.pinpoint.confidenceScore}
                          </span>
                        )}
                      </div>

                      {m.pinpoint.dateInfo && (
                        <div className="text-[12.5px] text-[#FBBF24] font-semibold">
                          📅 Tarih / Saat: {m.pinpoint.dateInfo}
                        </div>
                      )}

                      {m.pinpoint.documentRef && (
                        <div className="text-[12px] font-mono text-[#94A3B8]">
                          📄 Evrak: {m.pinpoint.documentRef}
                        </div>
                      )}

                      {m.pinpoint.exactExcerpt && (
                        <div className="text-[12px] text-[#A7F3D0] italic bg-[#064E3B]/20 p-2 rounded border border-[#10B981]/30">
                          &quot;{m.pinpoint.exactExcerpt}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  <div>{renderNarrativeMarkdown(m.text)}</div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.text}</div>
              )}
            </div>
          ))
        )}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && <ProcessLog />}
        <div ref={bottomRef} />
      </div>

      {error && <div className="text-red-400 font-mono text-[12px] bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">{error}</div>}

      {/* Input Bar */}
      <div className="flex items-center gap-2 pt-1">
        <input 
          type="text" 
          placeholder="Duruşma anında sorun (Örn: Hastane raporu hangi tarihteydi?)..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
          className="flex-1 bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder-[#475569]"
        />

        <button 
          onClick={() => send()} 
          disabled={loading || !input.trim()}
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-md shadow-[#3B82F6]/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          <span>⚡ Sor</span>
        </button>
      </div>
    </div>
  );
}