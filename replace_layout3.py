import re

with open('src/app/page.tsx', 'r') as f:
    lines = f.readlines()

start_idx = 0
for i, line in enumerate(lines):
    if line.strip() == 'return (':
        start_idx = i
        break

new_jsx = """  return (
    <div className="flex h-screen bg-[#f3f4f6] text-gray-800 font-sans">
      {/* Container simulating a macOS window */}
      <div className="flex h-full w-full bg-white overflow-hidden shadow-2xl">
        
        {/* Sidebar */}
        <div className="w-[280px] bg-[#f1f3f5] border-r border-gray-200 flex flex-col h-full z-20 shrink-0">
          
          {/* macOS window controls */}
          <div className="flex gap-2 p-5">
            <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"></div>
          </div>

          <div className="px-4 py-2 flex flex-col gap-1">
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-3 text-[14px] font-semibold text-gray-800 px-3 py-2.5 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={18} className="text-orange-600" />
              Yeni sohbet
            </button>
            <button className="flex items-center gap-3 text-[14px] font-medium text-gray-700 px-3 py-2.5 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
              <Search size={18} className="text-gray-500" />
              Ara
            </button>
            <button className="flex items-center gap-3 text-[14px] font-medium text-gray-700 px-3 py-2.5 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
              <Settings size={18} className="text-gray-500" />
              Özelleştir
            </button>
          </div>

          <div className="border-t border-gray-300/50 mx-5 my-2"></div>

          {/* Navigation */}
          <div className="px-4 flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('chats')}
              className={`flex items-center gap-3 text-[14px] font-medium px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${activeTab === 'chats' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-700 hover:bg-gray-200/60'}`}
            >
              <MessageSquare size={18} className="text-gray-500" />
              Asistan
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-3 text-[14px] font-medium px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${activeTab === 'files' ? 'text-gray-900 bg-white shadow-sm' : 'text-gray-700 hover:bg-gray-200/60'}`}
            >
              <Folder size={18} className="text-gray-500" />
              Dosyalar
            </button>
            <button className="flex items-center gap-3 text-[14px] font-medium text-gray-700 px-3 py-2.5 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
              <Calendar size={18} className="text-gray-500" />
              Takvim
            </button>
            <button className="flex items-center gap-3 text-[14px] font-medium text-gray-700 px-3 py-2.5 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
              <Users size={18} className="text-gray-500" />
              Müvekkil Takip
            </button>
            <button className="flex items-center gap-3 text-[14px] font-medium text-gray-700 px-3 py-2.5 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
              <Scale size={18} className="text-gray-500" />
              Karar Ara
            </button>
          </div>

          <div className="border-t border-gray-300/50 mx-5 my-2"></div>

          {/* Recents */}
          <div className="px-4 flex flex-col flex-1 overflow-y-auto">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-3 mt-3">Geçmiş</h3>
            <div className="space-y-1">
              {sessions.filter(s => s.type === 'chat').length > 0 ? (
                sessions.filter(s => s.type === 'chat').map(session => (
                  <div 
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className="cursor-pointer group flex flex-col px-3 py-2.5 hover:bg-gray-200/60 rounded-xl transition-colors"
                  >
                    <span className={`text-[14px] font-medium truncate ${activeSessionId === session.id ? 'text-gray-900' : 'text-gray-700'}`}>
                      {session.name}
                    </span>
                    <span className="text-[12px] text-gray-400 truncate mt-1 group-hover:text-gray-500 transition-colors">Hukuki asistan ile sohbet...</span>
                  </div>
                ))
              ) : (
                <div className="text-[14px] text-gray-400 px-3 py-2.5">Henüz sohbet yok.</div>
              )}
            </div>
          </div>

          {/* Profile */}
          <div className="px-5 py-5 mt-auto bg-[#e9ecef]/50 border-t border-gray-200/60">
            <div className="flex items-center justify-between cursor-pointer group hover:bg-white/60 p-2.5 -mx-2.5 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#111] text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                  M
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-gray-900 leading-tight mb-0.5">Mustafa</span>
                  <span className="text-[12px] text-gray-500 leading-tight">mustafa@laawos.com</span>
                </div>
              </div>
              <ChevronUp size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
            </div>
          </div>
          
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#fafafa]">
          
          {/* Welcome Screen Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-[850px] mx-auto w-full h-full">
            
            {/* Upgrade Badge */}
            <div className="mb-6 flex items-center justify-center gap-3 bg-white rounded-full px-5 py-2 shadow-sm border border-gray-200 hover:shadow-md cursor-pointer transition-all">
              <span className="text-[13px] font-medium text-gray-600">Pro Plan</span>
              <span className="text-[13px] font-bold text-gray-900">Yükselt</span>
            </div>

            {/* Greeting */}
            <h1 className="text-[40px] font-medium text-gray-900 mb-14 tracking-tight text-center" style={{fontFamily: "system-ui, -apple-system, sans-serif"}}>
              İyi günler, Mustafa
            </h1>

            {/* Input Bar */}
            <div className="w-full bg-[#f8f9fa] rounded-[24px] p-6 shadow-sm border border-gray-300 flex flex-col mb-10 transition-all hover:border-gray-400 focus-within:border-gray-500 focus-within:bg-white focus-within:shadow-md">
              <textarea 
                placeholder="Size nasıl yardımcı olabilirim?"
                className="w-full bg-transparent resize-none outline-none text-gray-900 placeholder-gray-400 text-[16px] min-h-[90px] font-medium"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-5 text-gray-400">
                  <button className="hover:text-gray-700 transition-colors cursor-pointer"><Plus size={20} /></button>
                  <button className="hover:text-gray-700 transition-colors cursor-pointer"><Paperclip size={18} /></button>
                  <button className="hover:text-gray-700 transition-colors cursor-pointer"><Globe size={18} /></button>
                  <button className="hover:text-gray-700 transition-colors cursor-pointer"><Mic size={18} /></button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[14px] font-medium text-gray-500 cursor-pointer hover:text-gray-800 transition-colors px-2">
                    Laawos Ultra 3.1
                    <ChevronDown size={16} />
                  </div>
                  <button className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-300 hover:text-gray-800 transition-colors cursor-pointer">
                    <ArrowUp size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Start Grid */}
            <div className="w-full">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">HIZLI BAŞLANGIÇ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#f8f9fa] rounded-2xl p-6 hover:bg-white cursor-pointer transition-all border border-gray-300 hover:border-gray-400 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-orange-500">
                      <Code size={20} />
                    </div>
                    <div>
                      <h4 className="text-[16px] font-semibold text-gray-900 mb-2">Dilekçe yaz</h4>
                      <p className="text-[14px] text-gray-500 leading-relaxed">API'den veri çeken ve işleyen bir TypeScript betiği yazın.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8f9fa] rounded-2xl p-6 hover:bg-white cursor-pointer transition-all border border-gray-300 hover:border-gray-400 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-orange-500">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 className="text-[16px] font-semibold text-gray-900 mb-2">Dosya analizi</h4>
                      <p className="text-[14px] text-gray-500 leading-relaxed">Bu belgeyi analiz edin ve temel içgörüleri içeren kapsamlı bir özet sağlayın.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8f9fa] rounded-2xl p-6 hover:bg-white cursor-pointer transition-all border border-gray-300 hover:border-gray-400 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-gray-700">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h4 className="text-[16px] font-semibold text-gray-900 mb-2">Fikir fırtınası</h4>
                      <p className="text-[14px] text-gray-500 leading-relaxed">2025'te yapay zeka destekli araçlar için 10 yenilikçi ürün fikri.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8f9fa] rounded-2xl p-6 hover:bg-white cursor-pointer transition-all border border-gray-300 hover:border-gray-400 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-orange-500">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h4 className="text-[16px] font-semibold text-gray-900 mb-2">Konu araştır</h4>
                      <p className="text-[14px] text-gray-500 leading-relaxed">Kuantum hesaplama ve uygulamaları hakkında kapsamlı bir araştırma sağlayın.</p>
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
