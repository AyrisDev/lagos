import re

with open('src/app/page.tsx', 'r') as f:
    lines = f.readlines()

# Find the start of the return statement
start_idx = 0
for i, line in enumerate(lines):
    if line.strip() == 'return (':
        start_idx = i
        break

new_jsx = """  return (
    <div className="flex h-screen bg-[#f3f3f3] p-3 text-gray-800 font-sans">
      {/* Container simulating a macOS window */}
      <div className="flex h-full w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        
        {/* Sidebar */}
        <div className="w-64 bg-[#fcfcfc] border-r border-gray-100 flex flex-col h-full z-20 shrink-0">
          
          {/* macOS window controls */}
          <div className="flex gap-2 p-4 pt-5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>

          <div className="px-4 py-2 flex flex-col gap-1">
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-3 text-sm font-medium text-gray-700 py-2 hover:text-gray-900 transition-colors"
            >
              <Plus size={16} className="text-orange-500" />
              Yeni Sohbet
            </button>
            <button className="flex items-center gap-3 text-sm font-medium text-gray-700 py-2 hover:text-gray-900 transition-colors">
              <Search size={16} />
              Ara
            </button>
            <button className="flex items-center gap-3 text-sm font-medium text-gray-700 py-2 hover:text-gray-900 transition-colors">
              <Settings size={16} />
              Özelleştir
            </button>
          </div>

          <div className="border-t border-gray-100 mx-4 my-2"></div>

          {/* Navigation */}
          <div className="px-4 py-2 flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('chats')}
              className={`flex items-center gap-3 text-sm font-medium py-2 rounded-lg transition-colors ${activeTab === 'chats' ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <MessageSquare size={16} />
              Asistan
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-3 text-sm font-medium py-2 rounded-lg transition-colors ${activeTab === 'files' ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Folder size={16} />
              Projeler
            </button>
            <button className="flex items-center gap-3 text-sm font-medium text-gray-600 py-2 hover:text-gray-900 transition-colors">
              <CheckSquare size={16} />
              Görevler
            </button>
            <button className="flex items-center gap-3 text-sm font-medium text-gray-600 py-2 hover:text-gray-900 transition-colors">
              <Bot size={16} />
              Ajanlar
            </button>
            <button className="flex items-center gap-3 text-sm font-medium text-gray-600 py-2 hover:text-gray-900 transition-colors">
              <Building size={16} />
              Şirketler
            </button>
          </div>

          <div className="border-t border-gray-100 mx-4 my-2"></div>

          {/* Recents */}
          <div className="px-4 py-2 flex flex-col flex-1 overflow-y-auto">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Geçmiş</h3>
            <div className="space-y-3">
              {sessions.filter(s => s.type === 'chat').length > 0 ? (
                sessions.filter(s => s.type === 'chat').map(session => (
                  <div 
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className="cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex flex-col truncate">
                      <span className={`text-xs font-semibold truncate ${activeSessionId === session.id ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                        {session.name}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate">Hukuki asistan ile sohbet...</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400">Henüz sohbet yok.</div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 mx-4 my-2"></div>

          {/* Profile */}
          <div className="px-4 py-4 mt-auto">
            <div className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
                  M
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">Mustafa</span>
                  <span className="text-[10px] text-gray-500">mustafa@laawos.com</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-gray-400 -rotate-90 group-hover:text-gray-600 transition-colors" />
            </div>
          </div>
          
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#fcfbf9] via-[#faede0] to-[#f9e0c7]">
          
          {/* Top Pill Tabs */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-full flex items-center p-1 shadow-sm">
              <button className="px-4 py-1.5 rounded-full bg-white shadow-sm text-xs font-semibold text-gray-800">
                Sohbet
              </button>
              <button className="px-4 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Colab
              </button>
              <button className="px-4 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Kod
              </button>
            </div>
          </div>

          {/* Welcome Screen Content (Empty State) */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full h-full">
            
            {/* Upgrade Badge */}
            <div className="mb-8 flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-orange-200/50 rounded-full px-3 py-1 shadow-sm">
              <span className="text-[10px] font-medium text-gray-600">Pro Plan</span>
              <span className="text-[10px] font-semibold text-orange-600 cursor-pointer hover:text-orange-700 transition-colors">Yükselt</span>
            </div>

            {/* Greeting */}
            <h1 className="text-4xl md:text-5xl font-medium text-gray-900 mb-10 tracking-tight text-center">
              İyi günler, Mustafa
            </h1>

            {/* Input Bar */}
            <div className="w-full max-w-2xl bg-white rounded-2xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col mb-12">
              <textarea 
                placeholder="Size nasıl yardımcı olabilirim?"
                className="w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 p-2 text-sm min-h-[60px]"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3 text-gray-400 px-2">
                  <button className="hover:text-gray-600 transition-colors"><Plus size={16} /></button>
                  <button className="hover:text-gray-600 transition-colors"><Paperclip size={16} /></button>
                  <button className="hover:text-gray-600 transition-colors"><Globe size={16} /></button>
                  <button className="hover:text-gray-600 transition-colors"><Mic size={16} /></button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 cursor-pointer hover:text-gray-700 transition-colors px-2">
                    Laawos Ultra 3.1
                    <ChevronDown size={12} />
                  </div>
                  <button className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 hover:text-gray-600 transition-colors">
                    <ArrowUp size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Start Grid */}
            <div className="w-full max-w-2xl">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 text-center md:text-left">Hızlı Başlangıç</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/70 backdrop-blur-sm border border-gray-100/50 rounded-xl p-4 hover:bg-white hover:shadow-sm cursor-pointer transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Code size={12} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Dilekçe yaz</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">API'den veri çeken ve işleyen bir TypeScript betiği yazın.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-gray-100/50 rounded-xl p-4 hover:bg-white hover:shadow-sm cursor-pointer transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <FileText size={12} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Dosya analizi</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">Bu belgeyi analiz edin ve temel içgörüleri içeren kapsamlı bir özet sağlayın.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-gray-100/50 rounded-xl p-4 hover:bg-white hover:shadow-sm cursor-pointer transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                      <Zap size={12} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Fikir fırtınası</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">2025'te yapay zeka destekli araçlar için 10 yenilikçi ürün fikri.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm border border-gray-100/50 rounded-xl p-4 hover:bg-white hover:shadow-sm cursor-pointer transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Globe size={12} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">Konu araştır</h4>
                      <p className="text-[10px] text-gray-500 leading-tight">Kuantum hesaplama ve uygulamaları hakkında kapsamlı bir araştırma sağlayın.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
      
      {/* Modals for Calendar/Search if needed */}
      {/* We can keep them or remove them since the layout is simplified */}
    </div>
  );
}
"""

with open('src/app/page.tsx', 'w') as f:
    f.writelines(lines[:start_idx])
    f.write(new_jsx)
