import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# We need to find the chat section.
start_marker = ") : (activeTab === 'files' || activeTab === 'chats') && activeSession ? ("
end_marker = ") : ("

# Because the end_marker ") : (" appears multiple times, we'll find the one that is right after the start_marker + some length.
start_idx = content.find(start_marker)
if start_idx != -1:
    search_str = """                </div>
              </div>
            </div>
          </div>"""
    end_idx = content.find(search_str, start_idx) + len(search_str)
    
    new_chat = """) : (activeTab === 'files' || activeTab === 'chats') && activeSession ? (
          <div className="flex h-full w-full bg-white">
            {/* Middle Pane: Chat Feed & Input */}
            <div className="flex-1 flex flex-col bg-white relative z-10 border-r border-gray-100">
              
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-6 shrink-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <select className="appearance-none bg-transparent font-semibold text-gray-800 outline-none cursor-pointer pr-4 hover:text-gray-600 transition-colors">
                    <option>{activeSession.name}</option>
                  </select>
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
                <button className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                  Bize ulaşın
                </button>
              </div>

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
                <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-4">
                  {activeSession.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center mt-24 text-gray-400">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                        <UserIcon size={28} />
                      </div>
                      <p>Apilex ile sohbet etmeye başlayın.</p>
                    </div>
                  ) : (
                    activeSession.messages.map((msg, i) => (
                      <div key={msg.id} className="w-full relative">
                        {msg.role === 'user' ? (
                          <div className="flex justify-end mb-2">
                            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-tr-none text-sm max-w-[80%] whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-800 text-sm">Apilex</span>
                            </div>
                            <div className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {isAiTyping && (
                    <div className="flex items-center gap-3 text-gray-500">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Apilex yazıyor...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white shrink-0">
                <div className="max-w-3xl mx-auto relative flex flex-col bg-white border border-gray-200 rounded-2xl p-2 transition-all focus-within:border-gray-300 focus-within:shadow-sm">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Apilex'e bir soru sorun..."
                    className="w-full bg-transparent border-none text-gray-900 pt-2 pb-12 px-2 focus:outline-none focus:ring-0 resize-none min-h-[50px] max-h-32 text-sm placeholder-gray-400"
                    rows={1}
                  />
                  
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-gray-400">
                    <button className="p-2 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <Paperclip size={18} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <Folder size={18} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <Settings size={18} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <FileText size={18} />
                    </button>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 transition-all"
                    >
                      <Send size={16} className="ml-0.5" />
                    </button>
                  </div>
                </div>
                <div className="text-center mt-3 text-[10px] text-gray-400">
                  Apilex'in yanıtları yalnızca bilgi amaçlıdır; hukuki danışmanlık ya da bağlayıcı görüş niteliği taşımaz.
                </div>
              </div>
            </div>

            {/* Right Pane: Document Editor */}
            <div className="w-[50%] flex flex-col bg-white">
              <div className="h-16 flex items-center justify-between px-6 shrink-0 bg-white border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"><X size={16}/></button>
                  <h2 className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{activeSession.name.toUpperCase()}</h2>
                  <span className="text-xs text-gray-400">792 kelime</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><FileText size={16}/></button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><FolderUp size={16}/></button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Search size={16}/></button>
                  <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">Versiyonlar</button>
                </div>
              </div>
              
              <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-white overflow-x-auto text-gray-600 text-sm">
                <button className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight className="rotate-180" size={16}/></button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={16}/></button>
                <div className="w-px h-4 bg-gray-200 mx-2"></div>
                <button className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 rounded-lg font-medium text-xs">
                  Normal <ChevronDown size={14}/>
                </button>
                <div className="w-px h-4 bg-gray-200 mx-2"></div>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg font-serif italic">B</button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg font-serif italic">I</button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg font-serif underline">U</button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg line-through">S</button>
                <div className="w-px h-4 bg-gray-200 mx-2"></div>
                <div className="w-4 h-4 bg-black rounded-full mx-1"></div>
                <div className="w-px h-4 bg-gray-200 mx-2"></div>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg"><FileText size={16}/></button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg"><CheckSquare size={16}/></button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Users size={16}/></button>
              </div>

              <div className="flex-1 p-8 overflow-y-auto bg-gray-50/30 flex justify-center">
                <div className="w-[85%] bg-white border border-gray-200 rounded-sm shadow-sm p-12 min-h-[800px] text-gray-800">
                  <h3 className="text-center font-bold text-lg mb-8 uppercase">[İL] [İLGİLİ CEZA MAHKEMESİ] MAHKEMESİNE</h3>
                  
                  <div className="space-y-4 mb-8 text-sm">
                    <p><span className="font-bold">Dosya No:</span> [Esas No]</p>
                    <p><span className="font-bold">SANIK:</span> [Ad SOYAD]<br/>[T.C. Kimlik No]<br/>[Adres]</p>
                    <p><span className="font-bold">MÜDAFİİ:</span> Av. [Ad SOYAD]<br/>[Baro / Sicil No]<br/>[Adres]</p>
                    <p><span className="font-bold">KATILAN / MÜŞTEKİ:</span> [Varsa ad-soyad / sıfat]<br/>[Adres]</p>
                    <p><span className="font-bold">KONU:</span> Sanığın bizzat mahkeme huzurunda dinlenmesine, duruşmada fiziken hazır edilmesine ve savunmasının doğrudan alınmasına yönelik talebimizden ibarettir.</p>
                  </div>

                  <h4 className="font-bold mb-4 text-base">AÇIKLAMALAR</h4>
                  <div className="space-y-4 text-sm leading-relaxed">
                    <p className="font-bold">1- Sanığın bizzat dinlenmesi savunma hakkının doğal ve vazgeçilmez bir unsurudur</p>
                    <p>Ceza yargılamasının temel amacı, maddi gerçeğin hukuka uygun biçimde ortaya çıkarılmasıdır. Bu amaca ulaşılabilmesi ise yalnızca yazılı beyanların dosya içerisinde bulunmasıyla değil, sanığın mahkeme huzurunda bizzat dinlenmesiyle mümkün hale gelir. Sanığın doğrudan hâkim önünde konuşabilmesi, kendisine yöneltilen isnadı açıklaması, olayın oluşuna dair kendi anlatımını sunması ve gerekiyorsa çelişkileri anında gidermesi savunma hakkının özünü oluşturur.</p>
                    <p>Anayasa'nın 36. maddesi ile güvence altına alınan adil yargılanma hakkı, şekli bir savunma imkânından ibaret değildir. Sanığın savunmasının etkili, somut ve sonuç doğurabilir nitelikte kullanılabilmesi gerekir. Bu nedenle mahkemenizce sanığın bizzat huzurda dinlenmesini talep ediyoruz.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>"""
    
    updated_content = content[:start_idx] + new_chat + content[end_idx:]
    with open('src/app/page.tsx', 'w') as f:
        f.write(updated_content)
    print("Successfully replaced chat.")
else:
    print("Could not find start marker.")
