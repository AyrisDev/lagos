import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/constants';
import { renderNarrativeMarkdown, useSupabaseToken, ProcessLog, consumeChatStream } from '@/lib/utils';

export function CaseSimulator({ caseId }: { caseId: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; id?: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [persona, setPersona] = useState<'judge' | 'opponent'>('judge');
  const token = useSupabaseToken();
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleClearHistory = async () => {
    if (!window.confirm('Simülatör geçmişini tamamen silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`${API_URL}chat/${encodeURIComponent(caseId)}?chat_mode=simulator`, {
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
        .eq('chat_mode', 'simulator')
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
        await supabase.from('chat_messages').insert([{ user_id: user.id, case_id: caseId, role: 'user', content: text, chat_mode: 'simulator' }]);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const simPayload = { message: text, content: text, text: text, case_id: caseId, caseId: caseId, chat_mode: 'simulator', persona, simulator_persona: persona };
      let res = await fetch(`${API_URL}chat/${encodeURIComponent(caseId)}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify(simPayload),
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify(simPayload),
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
      setError('Simülatör servisine bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-[#0C1324] border border-[#1E293B] rounded-2xl p-5 shadow-inner">
      
      {/* Header & Persona Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
        <div>
          <h2 className="text-[16px] font-bold text-white tracking-tight flex items-center gap-2">
            <span>🎯</span> Duruşma & Yargılama Simülatörü
          </h2>
          <p className="text-[12px] text-[#8C9BB4] font-mono mt-0.5">
            Hakim veya karşı taraf avukatı rolünde duruşma simülasyonu yapar.
          </p>
        </div>

        {/* Persona Select Bar (Hakim / Karşı Taraf) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#151C2C] border border-[#1E293B] rounded-xl p-1 font-mono text-[11px]">
            <button 
              onClick={() => setPersona('judge')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                persona === 'judge' ? 'bg-[#3B82F6] text-white shadow-md' : 'text-[#8C9BB4] hover:text-white'
              }`}
            >
              ⚖️ Hakim
            </button>
            <button 
              onClick={() => setPersona('opponent')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                persona === 'opponent' ? 'bg-[#F43F5E] text-white shadow-md' : 'text-[#8C9BB4] hover:text-white'
              }`}
            >
              💼 Karşı Taraf
            </button>
          </div>

          <button 
            onClick={handleClearHistory}
            className="text-[#64748B] hover:text-[#FB7185] font-mono text-[11px] px-2.5 py-1 rounded-lg border border-[#1E293B] hover:border-red-500/30 transition-colors"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex flex-col gap-3.5 min-h-[280px] max-h-[420px] overflow-y-auto cyber-juris-scroll pr-1">
        {historyLoading ? (
          <div className="text-[13px] font-mono text-[#64748B] py-8 text-center animate-pulse">
            Simülatör yükleniyor...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
            <div className="text-[13px] font-mono text-[#8C9BB4] max-w-md">
              {persona === 'opponent' 
                ? '⚔️ Karşı taraf avukatı tezlerinizdeki açıkları arayacak. Hızlı başlatıcılardan birini seçin veya ilk beyanınızı yazın:'
                : '⚖️ Hakim rolünde usul ve esasa titizlikle dikkat eden duruşma hakimisiyle çapraz sorgu başlatın:'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              {persona === 'opponent' ? (
                <>
                  <button
                    onClick={() => send('Sayın Meslektaşım, dosyadaki deliller çerçevesinde savunmamızın açıklarını tespit et ve zorlayıcı çapraz sorguya başla.')}
                    className="bg-[#151C2C] hover:bg-[#1E2A42] border border-[#F43F5E]/40 hover:border-[#F43F5E] text-[#FDA4AF] font-mono text-[12px] p-3 rounded-xl text-left transition-all cursor-pointer"
                  >
                    💼 Karşı Taraf Ol: Savunmamın Açıklarını Bul
                  </button>
                  <button
                    onClick={() => send('Dilekçedeki iddialarımıza ve taraf beyanlarımıza karşı en sert itirazlarını yönelt.')}
                    className="bg-[#151C2C] hover:bg-[#1E2A42] border border-[#F43F5E]/40 hover:border-[#F43F5E] text-[#FDA4AF] font-mono text-[12px] p-3 rounded-xl text-left transition-all cursor-pointer"
                  >
                    ⚔️ Çelişkileri Ve Zayıf Karnı Yüzüme Vur
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => send('Sayın Hakimim, duruşma açıldı. İddia ve savunmalarımızı sunuyoruz, sorularınızı bekliyoruz.')}
                    className="bg-[#151C2C] hover:bg-[#1E2A42] border border-[#3B82F6]/40 hover:border-[#3B82F6] text-[#60A5FA] font-mono text-[12px] p-3 rounded-xl text-left transition-all cursor-pointer"
                  >
                    ⚖️ Hakimim, Duruşma Açıldı: Sorguyu Başlat
                  </button>
                  <button
                    onClick={() => send('Dosyadaki delillerin HMK/CMK usul hükümlerine uyumunu ve ispat yükünü sorgulayın.')}
                    className="bg-[#151C2C] hover:bg-[#1E2A42] border border-[#3B82F6]/40 hover:border-[#3B82F6] text-[#60A5FA] font-mono text-[12px] p-3 rounded-xl text-left transition-all cursor-pointer"
                  >
                    📋 Usul ve İspat Yükü Açısından Çapraz Sorgula
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div 
              key={m.id || i}
              className={`max-w-[85%] rounded-2xl p-4 text-[13.5px] leading-relaxed shadow-md ${
                m.role === 'user' 
                  ? 'self-end bg-[#3B82F6] text-white font-medium' 
                  : persona === 'judge'
                    ? 'self-start bg-[#151C2C] border border-[#3B82F6]/30 text-[#E2E8F0]'
                    : 'self-start bg-[#151C2C] border border-[#F43F5E]/30 text-[#E2E8F0]'
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

      {/* Input Bar */}
      <div className="flex items-center gap-2 pt-1">
        <input 
          type="text" 
          placeholder={persona === 'judge' ? 'Hakime beyanınızı veya cevabınızı yazın...' : 'Karşı taraf avukatına cevabınızı yazın...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={loading}
          className="flex-1 bg-[#0C1324] border border-[#1E293B] focus:border-[#3B82F6] rounded-xl px-4 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder-[#475569]"
        />

        <button 
          onClick={() => send()} 
          disabled={loading || !input.trim()}
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-md shadow-[#3B82F6]/20 disabled:opacity-50 cursor-pointer"
        >
          Beyan Et
        </button>
      </div>

    </div>
  );
}