import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# We need to find the start and end of the sidebar
start_marker = "{/* Sidebar */}"
end_marker = "{/* Main Content Area */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_sidebar = """{/* Slim Sidebar (Kademe 1) */}
      <div className="w-20 bg-white border-r border-gray-100 flex flex-col items-center py-6 shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-30">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mb-8 shadow-sm cursor-pointer">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        
        <div className="flex-1 flex flex-col items-center gap-6 w-full">
          <button 
            onClick={() => setActiveTab('chats')}
            className={`w-full flex flex-col items-center gap-1 py-2 ${activeTab === 'chats' ? 'text-blue-600 border-r-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <UserIcon size={20} />
            <span className="text-[10px] font-medium mt-1">Asistan</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('files')}
            className={`w-full flex flex-col items-center gap-1 py-2 ${activeTab === 'files' ? 'text-blue-600 border-r-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Folder size={20} />
            <span className="text-[10px] font-medium mt-1">Projeler</span>
          </button>
          
          <button className="w-full flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600">
            <Briefcase size={20} />
            <span className="text-[10px] font-medium mt-1">Hizmetler</span>
          </button>
          
          <button className="w-full flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600">
            <Library size={20} />
            <span className="text-[10px] font-medium mt-1">Eğitimler</span>
          </button>
          
          <button className="w-full flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-gray-600 mt-auto">
            <Settings size={20} />
            <span className="text-[10px] font-medium mt-1">Ayarlar</span>
          </button>
          
          <button className="w-full flex flex-col items-center gap-1 py-2 text-blue-500 hover:text-blue-600 bg-blue-50/50 rounded-xl mx-2">
            <Database size={20} />
            <span className="text-[10px] font-medium mt-1">Paketler</span>
          </button>
        </div>
      </div>

      {/* Menü/Liste Paneli (Kademe 2) */}
      {activeTab === 'chats' && (
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.01)] z-20">
          <div className="p-4 border-b border-gray-50 flex flex-col gap-4">
            <button className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors">
              <ChevronRight size={18} className="rotate-180" />
              <span className="font-semibold text-lg">Asistan</span>
            </button>
            
            <button 
              onClick={handleCreateNew}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              <span>Yeni Çalışma Başlat</span>
            </button>
            
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Sohbet arayın"
                className="w-full bg-gray-50/50 border border-gray-100 focus:border-blue-500/30 focus:bg-white text-gray-900 placeholder-gray-400 text-xs rounded-lg pl-9 pr-3 py-2.5 transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {sessions.filter(s => s.type === 'chat').map(session => (
              <div 
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left cursor-pointer group ${activeSessionId === session.id ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-600'}`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium truncate w-40">{session.name}</span>
                </div>
                <div 
                  className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => deleteSession(session.id)} className="p-1 hover:text-red-500 text-gray-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {sessions.filter(s => s.type === 'chat').length === 0 && (
              <div className="px-3 py-4 text-xs text-center text-gray-400">Henüz sohbet yok.</div>
            )}
          </div>
        </div>
      )}
      """
    
    updated_content = content[:start_idx] + new_sidebar + "\n      " + content[end_idx:]
    with open('src/app/page.tsx', 'w') as f:
        f.write(updated_content)
    print("Successfully replaced sidebar.")
else:
    print("Could not find markers.")
