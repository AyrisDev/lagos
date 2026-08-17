import re

with open('src/app/page.tsx', 'r') as f:
    lines = f.readlines()

start_idx = 0
for i, line in enumerate(lines):
    if line.strip() == 'return (':
        start_idx = i
        break

new_jsx = """  return (
    <div className="flex h-screen bg-[#f1f1f1] p-2 text-gray-800 font-sans">
      {/* Container simulating a macOS window */}
      <div className="flex h-full w-full bg-[#fcfaf7] rounded-[24px] overflow-hidden shadow-2xl ring-1 ring-gray-900/5">
        
        {/* Sidebar */}
        <div className="w-[260px] bg-transparent flex flex-col h-full z-20 shrink-0">
          
          {/* macOS window controls */}
          <div className="flex gap-2 p-5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm border border-[#e0443e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm border border-[#dea123]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm border border-[#1aab29]"></div>
          </div>

          <div className="px-3 py-1 flex flex-col gap-0.5">
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-3 text-[13px] font-semibold text-gray-700 px-3 py-2 hover:bg-gray-100/50 rounded-xl transition-colors"
            >
              <Plus size={16} className="text-orange-500" />
              Yeni sohbet
            </button>
            <button className="flex items-center gap-3 text-[13px] font-medium text-gray-700 px-3 py-2 hover:bg-gray-100/50 rounded-xl transition-colors">
              <Search size={16} className="text-gray-500" />
              Ara
            </button>
            <button className="flex items-center gap-3 text-[13px] font-medium text-gray-700 px-3 py-2 hover:bg-gray-100/50 rounded-xl transition-colors">
              <Settings size={16} className="text-gray-500" />
              Özelleştir
            </button>
          </div>

          <div className="border-t border-gray-200/40 mx-4 my-2"></div>

          {/* Navigation */}
          <div className="px-3 flex flex-col gap-0.5">
            <button 
              onClick={() => setActiveTab('chats')}
              className={`flex items-center gap-3 text-[13px] font-medium px-3 py-2 rounded-xl transition-colors ${activeTab === 'chats' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-700 hover:bg-gray-100/50'}`}
            >
              <MessageSquare size={16} className="text-gray-500" />
              Asistan
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-3 text-[13px] font-medium px-3 py-2 rounded-xl transition-colors ${activeTab === 'files' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-700 hover:bg-gray-100/50'}`}
            >
              <Folder size={16} className="text-gray-500" />
              Projeler
            </button>
            <button className="flex items-center gap-3 text-[13px] font-medium text-gray-700 px-3 py-2 hover:bg-gray-100/50 rounded-xl transition-colors">
              <CheckSquare size={16} className="text-gray-500" />
              Görevler
            </button>
            <button className="flex items-center gap-3 text-[13px] font-medium text-gray-700 px-3 py-2 hover:bg-gray-100/50 rounded-xl transition-colors">
              <Bot size={16} className="text-gray-500" />
              Ajanlar
            </button>
            <button className="flex items-center gap-3 text-[13px] font-medium text-gray-700 px-3 py-2 hover:bg-gray-100/50 rounded-xl transition-colors">
              <Building size={16} className="text-gray-500" />
              Şirketler
            </button>
          </div>

          <div className="border-t border-gray-200/40 mx-4 my-2"></div>

          {/* Recents */}
          <div className="px-3 flex flex-col flex-1 overflow-y-auto">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2 mt-2">Geçmiş</h3>
            <div className="space-y-0.5">
              {sessions.filter(s => s.type === 'chat').length > 0 ? (
                sessions.filter(s => s.type === 'chat').map(session => (
                  <div 
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className="cursor-pointer group flex flex-col px-3 py-2 hover:bg-gray-100/50 rounded-xl transition-colors"
                  >
                    <span className={`text-[13px] font-medium truncate ${activeSessionId === session.id ? 'text-gray-900' : 'text-gray-700'}`}>
                      {session.name}
                    </span>
                    <span className="text-[11px] text-gray-400 truncate mt-0.5 group-hover:text-gray-500">Hukuki asistan ile sohbet...</span>
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-gray-400 px-3 py-2">Henüz sohbet yok.</div>
              )}
            </div>
          </div>

          {/* Profile */}
          <div className="px-4 py-4 mt-auto mb-2">
            <div className="flex items-center justify-between cursor-pointer group hover:bg-gray-100/50 p-2 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#111] text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                  M
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-gray-900 leading-none mb-1">Mustafa</span>
                  <span className="text-[11px] text-gray-500 leading-none">mustafa@laawos.com</span>
                </div>
              </div>
              <ChevronUp size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </div>
          
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#fdfbf6] via-[#faebd6] to-[#f4dcc2] rounded-l-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.02)] border-l border-white/40">
          
          {/* Top Pill Tabs */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-white/80 backdrop-blur-md rounded-full flex items-center p-1 shadow-sm border border-gray-100">
              <button className="px-5 py-1.5 rounded-full bg-white shadow-sm text-[13px] font-semibold text-gray-900">
                Sohbet
              </button>
              <button className="px-5 py-1.5 rounded-full text-[13px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                Colab
              </button>
              <button className="px-5 py-1.5 rounded-full text-[13px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                Kod
              </button>
            </div>
          </div>

          {/* Welcome Screen Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-3xl mx-auto w-full h-full">
            
            {/* Upgrade Badge */}
            <div className="mb-8 flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-1.5 shadow-sm border border-white/50">
              <span className="text-[11px] font-medium text-gray-600">Pro Plan</span>
              <span className="text-[11px] font-semibold text-orange-600 cursor-pointer hover:text-orange-700">Yükselt</span>
            </div>

            {/* Greeting */}
            <h1 className="text-5xl font-medium text-gray-900 mb-12 tracking-tight text-center" style={{fontFamily: "system-ui, -apple-system, sans-serif"}}>
              İyi günler, Mustafa
            </h1>

            {/* Input Bar */}
            <div className="w-full bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col mb-12">
              <textarea 
                placeholder="Size nasıl yardımcı olabilirim?"
                className="w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 p-1 text-[15px] min-h-[60px]"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <div className="flex items-center justify-between mt-2 pt-2">
                <div className="flex items-center gap-3 text-gray-400 px-1">
                  <button className="hover:text-gray-700 transition-colors"><Plus size={18} /></button>
                  <button className="hover:text-gray-700 transition-colors"><Paperclip size={16} /></button>
                  <button className="hover:text-gray-700 transition-colors"><Globe size={16} /></button>
                  <button className="hover:text-gray-700 transition-colors"><Mic size={16} /></button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[12px] font-medium text-gray-500 cursor-pointer hover:text-gray-800 transition-colors px-2">
                    Laawos Ultra 3.1
                    <ChevronDown size={14} />
                  </div>
                  <button className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 hover:text-gray-700 transition-colors">
                    <ArrowUp size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Start Grid */}
            <div className="w-full">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Hızlı Başlangıç</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 hover:bg-white/90 cursor-pointer transition-all border border-white/40 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                      <Code size={14} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-gray-900 mb-1">Dilekçe yaz</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">API'den veri çeken ve işleyen bir TypeScript betiği yazın.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 hover:bg-white/90 cursor-pointer transition-all border border-white/40 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                      <FileText size={14} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-gray-900 mb-1">Dosya analizi</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Bu belgeyi analiz edin ve temel içgörüleri içeren kapsamlı bir özet sağlayın.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 hover:bg-white/90 cursor-pointer transition-all border border-white/40 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                      <Zap size={14} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-gray-900 mb-1">Fikir fırtınası</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">2025'te yapay zeka destekli araçlar için 10 yenilikçi ürün fikri.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 hover:bg-white/90 cursor-pointer transition-all border border-white/40 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                      <Globe size={14} />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-gray-900 mb-1">Konu araştır</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed">Kuantum hesaplama ve uygulamaları hakkında kapsamlı bir araştırma sağlayın.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
"""

with open('src/app/page.tsx', 'w') as f:
    f.writelines(lines[:start_idx])
    f.write(new_jsx)
