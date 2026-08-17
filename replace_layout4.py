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
    <div className="flex h-screen bg-[#f3f4f6] text-gray-800 font-sans">
      {/* Sidebar */}
      <div className="w-[300px] bg-[#f8fafc] flex flex-col h-full shrink-0 border-r border-gray-200/60 overflow-y-auto">
        
        {/* Profile */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                EK
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-gray-900 leading-tight">Av. Elif Kaya</span>
                <span className="text-sm text-gray-500 leading-tight">Kurucu Ortak</span>
              </div>
            </div>
            <button className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-colors shadow-sm cursor-pointer">
              <Plus size={20} />
            </button>
          </div>

          {/* Next Hearing Card */}
          <div className="bg-[#1c1d22] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Sıradaki Duruşma</h3>
            <h4 className="text-base font-bold leading-tight mb-1">2026/1398 — Deniz Software Ltd.</h4>
            <p className="text-sm text-gray-400 mb-5">İstanbul 4. İş Mahkemesi</p>
            
            <div className="flex items-center justify-between mt-auto">
              <span className="text-[15px] font-medium text-indigo-200">10 Ağustos • 09:30</span>
              <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer">
                <ChevronRight size={18} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-4 flex flex-col gap-1 pb-6">
          <button className="flex items-center gap-3 text-[15px] font-medium px-4 py-3 rounded-xl bg-[#1c1d22] text-white shadow-md cursor-pointer">
            <LayoutDashboard size={20} />
            Genel Bakış
          </button>
          <button className="flex items-center gap-3 text-[15px] font-medium text-gray-600 px-4 py-3 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
            <Folder size={20} />
            Dava Dosyaları
          </button>
          <button className="flex items-center gap-3 text-[15px] font-medium text-gray-600 px-4 py-3 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
            <Search size={20} />
            İçtihat Arama
          </button>
          <button className="flex items-center gap-3 text-[15px] font-medium text-gray-600 px-4 py-3 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
            <FileText size={20} />
            Dilekçe Hazırlama
          </button>
          <button className="flex items-center gap-3 text-[15px] font-medium text-gray-600 px-4 py-3 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
            <Calendar size={20} />
            Duruşma Takvimi
          </button>
          <button className="flex items-center gap-3 text-[15px] font-medium text-gray-600 px-4 py-3 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
            <Copy size={20} />
            Belge Şablonları
          </button>
          <button className="flex items-center gap-3 text-[15px] font-medium text-gray-600 px-4 py-3 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
            <Users size={20} />
            Müvekkil Portalı
          </button>
          <button className="flex items-center gap-3 text-[15px] font-medium text-gray-600 px-4 py-3 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
            <MessageSquare size={20} />
            Sohbet
          </button>
          <button className="flex items-center gap-3 text-[15px] font-medium text-gray-600 px-4 py-3 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer">
            <Settings size={20} />
            Ayarlar
          </button>
        </div>
        
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto px-10 py-8 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-gray-500 font-medium">
            LegalOS / <span className="text-gray-900 font-semibold">Genel Bakış</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm relative cursor-pointer transition-colors">
            <Bell size={20} />
            <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
          </button>
        </div>

        {/* Welcome Hero */}
        <div className="w-full bg-[#fcefe6] rounded-3xl p-10 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="relative z-10">
            <p className="text-[#a66a41] font-semibold text-[15px] mb-2">8 Ağustos 2026, Cumartesi</p>
            <h1 className="text-[42px] font-bold text-gray-900 mb-8 tracking-tight">İyi günler, Elif</h1>
            
            <div className="flex gap-4">
              <button className="flex items-center gap-2 bg-white/80 hover:bg-white text-gray-900 px-5 py-3 rounded-full font-medium shadow-sm transition-all cursor-pointer">
                <Plus size={18} />
                Yeni Dosya
              </button>
              <button className="flex items-center gap-2 bg-white/80 hover:bg-white text-gray-900 px-5 py-3 rounded-full font-medium shadow-sm transition-all cursor-pointer">
                <Sparkles size={18} />
                Dilekçe Oluştur
              </button>
              <button className="flex items-center gap-2 bg-white/80 hover:bg-white text-gray-900 px-5 py-3 rounded-full font-medium shadow-sm transition-all cursor-pointer">
                <Search size={18} />
                İçtihat Ara
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <Folder size={24} />
            </div>
            <div className="text-[32px] font-bold text-gray-900 leading-none mb-2">24</div>
            <div className="text-[15px] text-gray-500 font-medium">Aktif Dosyalar</div>
          </div>
          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6">
              <Calendar size={24} />
            </div>
            <div className="text-[32px] font-bold text-gray-900 leading-none mb-2">4</div>
            <div className="text-[15px] text-gray-500 font-medium">Bu Hafta Duruşma</div>
          </div>
          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6">
              <FileText size={24} />
            </div>
            <div className="text-[32px] font-bold text-gray-900 leading-none mb-2">3</div>
            <div className="text-[15px] text-gray-500 font-medium">Bekleyen Dilekçe</div>
          </div>
          {/* Card 4 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
              <UserIcon size={24} />
            </div>
            <div className="text-[32px] font-bold text-gray-900 leading-none mb-2">2</div>
            <div className="text-[15px] text-gray-500 font-medium">Yeni Müvekkil</div>
          </div>
        </div>

        {/* Lists Area */}
        <div className="grid grid-cols-2 gap-10">
          
          {/* Upcoming Hearings */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Yaklaşan Duruşmalar</h2>
            <div className="flex flex-col gap-3">
              {/* Item 1 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">2026/1398 — Deniz Software Ltd.</h4>
                    <p className="text-sm text-gray-500">Ön İnceleme · İstanbul 4. İş Mahkemesi</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-gray-900">10 Ağustos</div>
                  <div className="text-sm text-gray-500">09:30</div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">2026/1452 — Yılmaz İnşaat A.Ş.</h4>
                    <p className="text-sm text-gray-500">Tanık Dinleme · Ankara 7. Asliye Ticaret Mahkemesi</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-gray-900">12 Ağustos</div>
                  <div className="text-sm text-gray-500">11:00</div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">2026/1204 — Selin Yurdakul</h4>
                    <p className="text-sm text-gray-500">Duruşma · İstanbul 12. Aile Mahkemesi</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-gray-900">14 Ağustos</div>
                  <div className="text-sm text-gray-500">14:15</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-5">Son Dosya Hareketleri</h2>
            <div className="flex flex-col gap-3">
              {/* Item 1 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Yılmaz İnşaat A.Ş.</h4>
                  <p className="text-sm text-gray-500">Av. Elif Kaya</p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 font-medium text-[13px] rounded-lg">
                  Aktif
                </div>
              </div>

              {/* Item 2 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Deniz Software Ltd.</h4>
                  <p className="text-sm text-gray-500">Av. Mert Aydın</p>
                </div>
                <div className="px-3 py-1 bg-orange-50 text-orange-700 font-medium text-[13px] rounded-lg">
                  Duruşma Bekliyor
                </div>
              </div>

              {/* Item 3 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Aslan Gıda San.</h4>
                  <p className="text-sm text-gray-500">Av. Elif Kaya</p>
                </div>
                <div className="px-3 py-1 bg-purple-50 text-purple-700 font-medium text-[13px] rounded-lg">
                  Temyiz
                </div>
              </div>
              
              {/* Item 4 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Selin Yurdakul</h4>
                  <p className="text-sm text-gray-500">Av. Elif Kaya</p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 font-medium text-[13px] rounded-lg">
                  Aktif
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
