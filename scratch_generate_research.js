const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MOCK_RESULTS = [
  { documentId: 'doc1', mahkeme: 'Yargıtay 4. Hukuk Dairesi', esas_no: '2023/1234', karar_no: '2023/5678', konu: 'Manevi Tazminat İstemine İlişkin', tarih: '12.05.2023' },
  { documentId: 'doc2', mahkeme: 'Yargıtay 9. Hukuk Dairesi', esas_no: '2022/9988', karar_no: '2023/1122', konu: 'İşçi Alacakları ve İşe İade', tarih: '04.09.2023' },
  { documentId: 'doc3', mahkeme: 'Anayasa Mahkemesi', esas_no: '2020/554', karar_no: '2023/88', konu: 'Adil Yargılanma Hakkının İhlali', tarih: '18.11.2023' },
];

const MOCK_DOC = \`
# Yargıtay 4. Hukuk Dairesi Kararı

**Esas No:** 2023/1234  
**Karar No:** 2023/5678  
**Tarih:** 12.05.2023  

**ÖZET:**  
Manevi tazminat istemine ilişkin davada, yerel mahkemece verilen karar Yargıtay tarafından incelenmiştir. Olayın oluş şekli, tarafların kusur durumu ve hakkaniyet ilkesi gözetilerek manevi tazminat miktarının belirlenmesi gerektiği vurgulanmıştır.

**KARAR:**  
1. Davacı vekilinin temyiz itirazlarının reddine,
2. Yerel mahkeme kararının **ONANMASINA**,
3. Aşağıda yazılı bakiye onama harcının temyiz edene yükletilmesine karar verilmiştir.

*İşbu karar oybirliği ile alınmıştır.*
\`;

const COURT_OPTIONS = [
  { value: 'yargitay', label: 'Yargıtay' },
  { value: 'danistay', label: 'Danıştay' },
  { value: 'bam', label: 'BAM' },
  { value: 'bım', label: 'BİM' },
  { value: 'aym', label: 'AYM' }
];

export const Research = () => {
  const [q, setQ] = useState('');
  const [selectedCourts, setSelectedCourts] = useState<string[]>(['yargitay']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<any | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');
  const [docText, setDocText] = useState('');

  const toggleCourt = (val: string) => {
    setSelectedCourts(prev =>
      prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]
    );
  };

  const doSearch = async (p = 1) => {
    if (!q.trim()) return;
    if (selectedCourts.length === 0) {
      setError('Lütfen en az bir mahkeme türü seçin.');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    setPage(p);
    setSelected(null);
    setDocText('');

    try {
      // API call simulated
      await new Promise(r => setTimeout(r, 800));
      setResults(MOCK_RESULTS);
      setTotal(MOCK_RESULTS.length);
    } catch (err: any) {
      setError(err.message || 'Arama hatası');
    } finally {
      setLoading(false);
    }
  };

  const openDoc = async (item: any) => {
    setSelected(item);
    setDocLoading(true);
    setDocError('');
    setDocText('');
    
    try {
      // API call simulated
      await new Promise(r => setTimeout(r, 600));
      setDocText(MOCK_DOC);
    } catch (err: any) {
      setDocError(err.message || 'Belge yüklenemedi');
    } finally {
      setDocLoading(false);
    }
  };

  const renderNarrativeMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-on-surface font-headline-md" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-5 text-on-surface font-headline-md" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-medium mb-2 mt-4 text-on-surface font-headline-md" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 text-justify font-body-md text-on-surface leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 font-body-md text-on-surface" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 font-body-md text-on-surface" {...props} />,
          li: ({node, ...props}) => <li className="mb-1" {...props} />,
          strong: ({node, ...props}) => <strong className="font-semibold text-primary" {...props} />,
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-tertiary pl-4 my-4 bg-tertiary/10 py-2 pr-2 text-on-surface italic font-body-md rounded-r" {...props} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  const PAGE_SIZE = 10;

  return (
    <div className="flex-1 flex flex-col h-full bg-background dark text-on-background" style={{ height: 'calc(100vh - 60px)' }}>
      {/* TopAppBar */}
      <header className="flex justify-between items-center w-full px-container-padding h-16 border-b border-outline-variant bg-surface z-40 shrink-0">
        <div className="flex items-center gap-stack-lg">
          <nav className="hidden md:flex gap-stack-md">
            <a className="font-label-caps text-label-caps text-primary font-bold border-b-2 border-primary pb-1 py-4" href="#">İçtihat Arama</a>
            <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-all py-4" href="#">Kanunlar</a>
            <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-all py-4" href="#">Mevzuat</a>
            <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-all py-4" href="#">Özelgeler</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-on-surface-variant">
            <button className="p-2 rounded-full hover:bg-surface-variant transition-colors"><span className="material-symbols-outlined" data-icon="notifications">notifications</span></button>
            <button className="p-2 rounded-full hover:bg-surface-variant transition-colors"><span className="material-symbols-outlined" data-icon="account_balance">account_balance</span></button>
          </div>
        </div>
      </header>

      {/* Split Screen Workspace */}
      <main className="flex-1 flex overflow-hidden p-container-margin gap-stack-lg bg-surface min-h-0">
        
        {/* Left: Search & Results */}
        <section className="w-1/3 flex flex-col gap-stack-md min-w-[320px]">
          <div className="glass-panel rounded-xl flex-1 flex flex-col p-4 overflow-hidden">
            <header className="border-b border-outline-variant pb-3 mb-4 flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-primary" data-icon="search">search</span>
              <h2 className="font-headline-md text-[18px] font-semibold text-primary-fixed">Sorgu Ekranı</h2>
            </header>
            
            {/* Input Area */}
            <div className="mb-4 relative shrink-0">
              <input 
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-3 px-4 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-on-surface-variant/50" 
                placeholder="Örnek: hırsızlık beraat, Yargıtay..." 
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(1)}
              />
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-primary-fixed transition-colors"
                onClick={() => doSearch(1)}
                disabled={loading}
              >
                <span className="material-symbols-outlined" data-icon="send">send</span>
              </button>
              {loading && <div className="cj-scanning-bar rounded-b-lg"></div>}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4 shrink-0">
              {COURT_OPTIONS.map(c => {
                const active = selectedCourts.includes(c.value);
                return (
                  <button
                    key={c.value}
                    onClick={() => toggleCourt(c.value)}
                    className={\`px-3 py-1.5 rounded text-xs font-label-caps transition-colors border \${
                      active 
                        ? 'bg-tertiary/10 border-tertiary text-tertiary' 
                        : 'bg-surface-variant/50 border-outline-variant text-on-surface-variant hover:text-on-surface'
                    }\`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {error && <div className="text-error font-code-sm text-sm mb-4 shrink-0">[HATA]: {error}</div>}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 cyber-juris-scroll">
              {!searched && !loading && (
                <div className="text-center text-on-surface-variant/50 mt-10 font-label-caps text-sm">
                  SİSTEM BEKLEMEDE
                </div>
              )}
              {searched && !loading && results.length === 0 && !error && (
                <div className="text-center text-on-surface-variant/50 mt-10 font-label-caps text-sm">
                  KAYIT BULUNAMADI
                </div>
              )}
              {results.map((r, i) => {
                const isActive = selected?.documentId === r.documentId;
                return (
                  <div 
                    key={r.documentId || i}
                    onClick={() => openDoc(r)}
                    className={\`p-4 rounded-lg cursor-pointer transition-colors border-l-2 \${
                      isActive 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-surface-container-high border-transparent hover:bg-surface-variant'
                    }\`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={\`font-label-caps text-[11px] \${isActive ? 'text-primary' : 'text-tertiary'}\`}>
                        {r.mahkeme}
                      </span>
                      <span className="font-code-sm text-[11px] text-on-surface-variant/70">{r.tarih}</span>
                    </div>
                    <div className="font-body-md text-[14px] font-medium text-on-surface mb-2 leading-snug">
                      {r.konu || '(Başlık yok)'}
                    </div>
                    <div className="font-code-sm text-[12px] text-on-surface-variant">
                      Esas: {r.esas_no} | Karar: {r.karar_no}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="mt-4 pt-3 border-t border-outline-variant flex justify-between items-center shrink-0">
                <button 
                  className={\`font-label-caps text-xs \${page <= 1 ? 'text-outline-variant cursor-not-allowed' : 'text-primary hover:text-primary-fixed'}\`}
                  onClick={() => doSearch(page - 1)} disabled={page <= 1 || loading}>
                  &lt; ÖNCEKİ
                </button>
                <span className="font-code-sm text-xs text-on-surface-variant">SAYFA {page}</span>
                <button 
                  className={\`font-label-caps text-xs \${page * PAGE_SIZE >= total ? 'text-outline-variant cursor-not-allowed' : 'text-primary hover:text-primary-fixed'}\`}
                  onClick={() => doSearch(page + 1)} disabled={page * PAGE_SIZE >= total || loading}>
                  SONRAKİ &gt;
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right: Document Preview */}
        <section className="w-2/3 glass-panel rounded-xl flex flex-col relative overflow-hidden">
          {/* Editor Toolbar */}
          <header className="bg-surface-container-high border-b border-outline-variant p-3 flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="font-label-caps text-[13px] text-on-surface-variant border-r border-outline-variant pr-4">
                {selected ? \`\${selected.mahkeme} / \${selected.karar_no}\` : 'Belge Seçilmedi'}
              </div>
              <div className="flex gap-2 text-on-surface-variant">
                <button className="hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]" data-icon="format_bold">format_bold</span></button>
                <button className="hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]" data-icon="format_italic">format_italic</span></button>
                <button className="hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]" data-icon="format_underlined">format_underlined</span></button>
              </div>
            </div>
            <div className="flex gap-3">
              {selected && (
                <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-tertiary-container/20 text-tertiary border border-tertiary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                  Görüntüleniyor
                </span>
              )}
              <button 
                onClick={() => docText && navigator.clipboard.writeText(docText)}
                disabled={!docText}
                className="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-1.5 rounded shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-surface-tint transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Dışa Aktar
              </button>
            </div>
          </header>

          {/* Document Canvas */}
          <div className="flex-1 overflow-y-auto bg-surface-dim p-8 relative font-body-md text-body-md leading-relaxed text-on-surface cyber-juris-scroll">
            {selected ? (
              <div className="max-w-3xl mx-auto bg-surface-container-lowest p-10 min-h-full shadow-lg border border-outline-variant/30 line-numbers">
                {docLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 text-primary font-code-sm">
                    <span className="material-symbols-outlined animate-spin text-[32px] mb-4">autorenew</span>
                    <span>İçtihat Yükleniyor...</span>
                  </div>
                ) : docError ? (
                  <div className="text-error font-code-sm text-center p-8 bg-error-container/10 rounded border border-error/20">
                    {docError}
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="text-center font-bold mb-8">
                      <div className="text-lg font-headline-md">{selected.mahkeme}</div>
                      <div className="text-on-surface-variant font-code-sm mt-2 text-sm">
                        Esas No: {selected.esas_no} | Karar No: {selected.karar_no}
                      </div>
                    </div>
                    
                    <div className="mb-4 text-justify relative">
                       {renderNarrativeMarkdown(docText)}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 h-full flex flex-col items-center justify-center opacity-40">
                 <span className="material-symbols-outlined text-[64px] mb-4">gavel</span>
                 <span className="font-label-caps text-label-caps tracking-widest">Sorgu Sonuçlarından Bir Karar Seçin</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
`;

fs.writeFileSync('src/components/views/Research.tsx', content);
