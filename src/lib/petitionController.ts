export interface PetitionTypeItem {
  id: string;
  title: string;
  shortTitle: string;
  categoryId: string;
  lawRef: string;
  courtType: string;
  keyElements: string[];
  suggestedNotes: string;
  aiPromptGuide: string;
}

export interface PetitionCategory {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  badgeColor: string;
  description: string;
}

export const PETITION_CATEGORIES: PetitionCategory[] = [
  {
    id: 'hmk',
    name: '1. Hukuk Yargılaması (HMK)',
    shortName: 'Hukuk (HMK)',
    icon: '⚖️',
    badgeColor: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/30',
    description: 'Hukuk Muhakemeleri Kanunu kapsamındaki dava, cevap, beyan, delil, ıslah, ihtiyati tedbir ve temyiz dilekçeleri'
  },
  {
    id: 'cmk',
    name: '2. Ceza Yargılaması (CMK & TCK)',
    shortName: 'Ceza (CMK)',
    icon: '🛡️',
    badgeColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
    description: 'Ceza Muhakemesi Kanunu uyarınca şikâyet, KYOK itiraz, tutukluluğa itiraz, savunma ve ceza temyiz talepleri'
  },
  {
    id: 'iik',
    name: '3. İcra ve İflas Hukuku (İİK)',
    shortName: 'İcra-İflas (İİK)',
    icon: '🏢',
    badgeColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
    description: 'İcra takipleri, ödeme emrine itiraz, itirazın iptali/kaldırılması, menfi tespit, istihkak ve ihale feshi'
  },
  {
    id: 'iyuk',
    name: '4. İdare ve Vergi Yargılaması (İYUK)',
    shortName: 'İdare-Vergi (İYUK)',
    icon: '🏛️',
    badgeColor: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30',
    description: 'İdari iptal ve tam yargı davaları, yürütmenin durdurulması (YD), vergi cezası iptalleri ve Danıştay başvuruları'
  },
  {
    id: 'is',
    name: '5. İş ve Sosyal Güvenlik Hukuku',
    shortName: 'İş Hukuku',
    icon: '💼',
    badgeColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
    description: 'İşe iade, arabuluculuk başvurusu, kıdem-ihbar alacakları, hizmet tespiti ve iş kazası tazminat davaları'
  },
  {
    id: 'tmk',
    name: '6. Aile ve Kişiler Hukuku (TMK)',
    shortName: 'Aile (TMK)',
    icon: '👨‍👩‍👧',
    badgeColor: 'text-[#EC4899] bg-[#EC4899]/10 border-[#EC4899]/30',
    description: 'Anlaşmalı/çekişmeli boşanma, 6284 koruma kararı, nafaka, velayet, mal rejimi tasfiyesi ve vesayet'
  },
  {
    id: 'ttk',
    name: '7. Ticaret, Şirketler ve Tüketici Hukuku',
    shortName: 'Ticaret & Tüketici',
    icon: '📈',
    badgeColor: 'text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/30',
    description: 'Tüketici Hakem Heyeti, zayi çek/senet iptali, ayıplı mal tazminatı ve şirket genel kurul iptali'
  },
  {
    id: 'tbk',
    name: '8. Gayrimenkul ve Eşya Hukuku',
    shortName: 'Gayrimenkul (TBK)',
    icon: '🏠',
    badgeColor: 'text-[#F97316] bg-[#F97316]/10 border-[#F97316]/30',
    description: 'Kira tahliye, kira tespit/uyarlama, tapu iptal-tescil, izale-i şüyu ve ecrimisil davaları'
  },
  {
    id: 'aym',
    name: '9. Anayasa Mahkemesi ve Uluslararası Yargı',
    shortName: 'AYM & AİHM',
    icon: '🌐',
    badgeColor: 'text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/30',
    description: 'Anayasa Mahkemesi (AYM) bireysel başvuru formu ve AİHM insan hakları ihlali başvuru dilekçeleri'
  },
  {
    id: 'usul',
    name: '10. Genel Usul, Kalem ve Duruşma Talepleri',
    shortName: 'Usul & Kalem Talepleri',
    icon: '📑',
    badgeColor: 'text-[#64748B] bg-[#64748B]/10 border-[#64748B]/30',
    description: 'Mazeret, süre tutum, vekillikten istifa, Mernis tebligat yenileme, dosya inceleme ve gerekçeli karar tebliği'
  }
];

export const PETITION_TYPES_CATALOG: PetitionTypeItem[] = [
  // -------------------------------------------------------------
  // 1. HUKUK YARGILAMASI (HMK)
  // -------------------------------------------------------------
  {
    id: 'hmk-dava',
    title: 'Dava Dilekçesi',
    shortTitle: 'Dava Dilekçesi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 119',
    courtType: 'Asliye Hukuk / Asliye Ticaret / İş Mahkemesi',
    keyElements: [
      'Mahkeme Adı ve Dosya Konusu',
      'Tarafların Kimlik/Adres Bilgileri ve T.C. No',
      'Davanın Konusu ve Dava Değeri',
      'Somut Vakıalar ve Maddeler Halinde Açıklamalar',
      'Hukuki Sebepler ve Deliller Listesi',
      'Netice-i Talep (Sonuç ve İstem)'
    ],
    suggestedNotes: 'Dava konusu alacak miktarını belirten fazlaya ilişkin haklar saklı tutulsun. Emsal Yargıtay kararlarına atıf yapılsın.',
    aiPromptGuide: 'HMK m. 119\'daki tüm zorunlu unsurları içeren, mahkeme başlığı, taraf bilgileri, dava konusu, harca esas değer, somut vakıalar, hukuki deliller ve netice-i talep kısmını eksiksiz içeren resmi bir Dava Dilekçesi kaleme al.'
  },
  {
    id: 'hmk-cevap',
    title: 'Cevap Dilekçesi',
    shortTitle: 'Cevap Dilekçesi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 129',
    courtType: 'Davaya Bakmakta Olan Hukuk Mahkemesi',
    keyElements: [
      'İlk İtirazlar (Zamanaşımı, Yetki, Görev vs.)',
      'Davacının İddialarına Karşı Maddeler Halinde Cevaplar',
      'Savunmanın Dayandığı Hukuki Sebepler',
      'Karşı Deliller ve Karşı Tarafın İddialarının Reddi Talebi'
    ],
    suggestedNotes: 'Davanın süresinde açılmadığı ve zamanaşımına uğradığı savunulsun. Davacının iddiaları tek tek çürütülsün.',
    aiPromptGuide: 'HMK m. 129 uyarınca, davanın reddini, ilk itirazları, esasa ilişkin cevapları ve davacının haksız iddialarının reddini içeren Cevap Dilekçesi kaleme al.'
  },
  {
    id: 'hmk-replik',
    title: 'Cevaba Cevap Dilekçesi (Replik)',
    shortTitle: 'Cevaba Cevap (Replik)',
    categoryId: 'hmk',
    lawRef: 'HMK m. 136',
    courtType: 'Davaya Bakmakta Olan Hukuk Mahkemesi',
    keyElements: [
      'Davalı Tarafın Cevap Dilekçesindeki İddiaların Çürütülmesi',
      'Dava Dilekçesindeki Vakıaların Pekiştirilmesi',
      'Davalı Tarafça İleri Sürülen Zamanaşımı / İlk İtirazların Reddi'
    ],
    suggestedNotes: 'Davalının zamanaşımı ve yetki itirazlarının hukuki dayanaktan yoksun olduğu açıklansın.',
    aiPromptGuide: 'HMK m. 136 kapsamında dilekçeler teatisi ikinci aşaması olarak davalının cevaplarına cevap veren Replik Dilekçesi kaleme al.'
  },
  {
    id: 'hmk-duplik',
    title: 'İkinci Cevap Dilekçesi (Düplik)',
    shortTitle: 'İkinci Cevap (Düplik)',
    categoryId: 'hmk',
    lawRef: 'HMK m. 136',
    courtType: 'Davaya Bakmakta Olan Hukuk Mahkemesi',
    keyElements: [
      'Davacının Replik Dilekçesine Karşı Son Cevaplar',
      'Savunmanın Tamamlanması ve Savunma Haklarının Korunması',
      'Davanın Reddi Yönündeki Talebin Yinelenmesi'
    ],
    suggestedNotes: 'Davacının cevaba cevap dilekçesindeki yeni beyanlarının kabul edilmediği vurgulansın.',
    aiPromptGuide: 'HMK m. 136 dilekçeler teatisini tamamlayan davalının İkinci Cevap (Düplik) Dilekçesini kaleme al.'
  },
  {
    id: 'hmk-on-inceleme',
    title: 'Ön İnceleme Aşaması Beyan Dilekçesi',
    shortTitle: 'Ön İnceleme Beyanı',
    categoryId: 'hmk',
    lawRef: 'HMK m. 140',
    courtType: 'Davaya Bakmakta Olan Hukuk Mahkemesi',
    keyElements: [
      'Anlaşma/Sulh Olunup Olunamayacağı Beyanı',
      'Uyuşmazlık Konusu Noktaların Tespiti',
      'Tahkikat Aşamasına Geçilmesi Talebi'
    ],
    suggestedNotes: 'Sulh olunmasının mümkün olmadığı, uyuşmazlık noktalarının tespiti ile tahkikata geçilmesi talep edilsin.',
    aiPromptGuide: 'HMK m. 140 uyarınca ön inceleme duruşması öncesinde mahkemeye sunulacak Ön İnceleme Beyan Dilekçesini oluştur.'
  },
  {
    id: 'hmk-delil-tanik',
    title: 'Delil ve Tanık Listesi Sunum Dilekçesi',
    shortTitle: 'Delil & Tanık Listesi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 240, 243',
    courtType: 'Davaya Bakmakta Olan Hukuk Mahkemesi',
    keyElements: [
      'Maddi Vakıaları İspatlayacak Belgeler Listesi',
      'Tanıkların Adı, Soyadı, T.C. Kimlik No ve Adresleri',
      'Hangi Tanık İle Hangi Vakıanın İspat Edileceğinin Belirtilmesi',
      'Tanıkların Davetiye İle Çağrılması Talebi'
    ],
    suggestedNotes: 'Tanıkların dinleneceği hususlar net olarak eşleştirilsin. İlgili kurum ve bankalardan müzekkere yazılması istensin.',
    aiPromptGuide: 'HMK m. 240 uyarınca eksiksiz delil ve tanık listesi içeren, hangi tanığın hangi hususta dinleneceğini açıkça belirten dilekçeyi kaleme al.'
  },
  {
    id: 'hmk-ihtiyati-tedbir',
    title: 'İhtiyati Tedbir Talep Dilekçesi',
    shortTitle: 'İhtiyati Tedbir Talebi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 389',
    courtType: 'Görevli Hukuk Mahkemesi',
    keyElements: [
      'Gecikmesinde Sakınca Bulunan Hal Beyanı',
      'Hakkın Elde Edilmesinin Zorlaşacağı / İmkânsızlaşacağı Riski',
      'Yaklaşık İspat Kuralları ve Deliller',
      'Teminat Gösterilerek veya Teminatsız Tedbir Konulması Talebi'
    ],
    suggestedNotes: 'Dava konusu taşınır/taşınmaz üzerine 3. kişilere devrinin önlenmesi için ivedilikle ihtiyati tedbir konulması talep edilsin.',
    aiPromptGuide: 'HMK m. 389 vd. çerçevesinde hak kaybını önlemek amacıyla acil İhtiyati Tedbir Talep Dilekçesi hazırla.'
  },
  {
    id: 'hmk-delil-tespiti',
    title: 'Delil Tespiti Talep Dilekçesi',
    shortTitle: 'Delil Tespiti Talebi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 400',
    courtType: 'Sulh Hukuk / Asliye Hukuk Mahkemesi',
    keyElements: [
      'Kaybolma veya İspatın Zorlaşması Tehlikesi Alan Beyanı',
      'Keşif ve Bilirkişi İncelemesi Yapılması Talebi',
      'Tespiti İstenen Ayıp / Hasar / Durum Maddeleri'
    ],
    suggestedNotes: 'Hasarın zamanla kaybolacağı riskiyle mahallinde acil keşif ve bilirkişi tespiti yapılsın.',
    aiPromptGuide: 'HMK m. 400 uyarınca delillerin kaybolmasını önlemek için acil Delil Tespiti Talep Dilekçesini kaleme al.'
  },
  {
    id: 'hmk-bilirKisi-itiraz',
    title: 'Bilirkişi Raporuna İtiraz / Beyan Dilekçesi',
    shortTitle: 'Bilirkişi Raporuna İtiraz',
    categoryId: 'hmk',
    lawRef: 'HMK m. 281',
    courtType: 'Davaya Bakmakta Olan Hukuk Mahkemesi',
    keyElements: [
      'Bilirkişi Raporunun Tebliğ Tarihi',
      'Rapordaki Maddi ve Hukuki Hataların Tespiti',
      'Denetime Elverişsizlik ve Eksik İnceleme Gerekçeleri',
      'Ek Rapor Alınması veya Yeni Bilirkişi Heyeti Tayini Talebi'
    ],
    suggestedNotes: 'Rapordaki hesaplama hataları ve tarafımızca sunulan belgelerin dikkate alınmadığı vurgulansın.',
    aiPromptGuide: 'HMK m. 281 uyarınca 2 haftalık süre içinde bilirkişi raporunun çelişkili ve eksik yönlerini belirterek ek/yeni rapor talep eden itiraz dilekçesini yaz.'
  },
  {
    id: 'hmk-islah',
    title: 'Islah Dilekçesi (Tam Islah / Kısmi Islah)',
    shortTitle: 'Islah Dilekçesi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 176',
    courtType: 'Davaya Bakmakta Olan Hukuk Mahkemesi',
    keyElements: [
      'Davanın Islah Edildiği Hususu (Miktar Artırımı / Talep Değişikliği)',
      'Kısmi Islah Miktarı ve Harç Tamamlama Makbuzu',
      'Islah Edilen Netice-i Talep Maddeleri'
    ],
    suggestedNotes: 'Bilirkişi raporu doğrultusunda dava miktarının artırıldığı, ıslah harcının yatırıldığı belirtilsin.',
    aiPromptGuide: 'HMK m. 176 vd. uyarınca dava talebini veya miktarını artıran/değiştiren Islah Dilekçesini hazırlansın.'
  },
  {
    id: 'hmk-feragat-sulh',
    title: 'Davadan Feragat / Kabul / Sulh Dilekçesi',
    shortTitle: 'Feragat / Kabul / Sulh',
    categoryId: 'hmk',
    lawRef: 'HMK m. 307 vd.',
    courtType: 'Davaya Bakmakta Olan Hukuk Mahkemesi',
    keyElements: [
      'Feragat/Kabul/Sulh İradesinin Açık Beyanı',
      'Vekilin Özel Yetkisinin Bulunduğu Beyanı ve Vekaletname Şerhi',
      'Yargılama Giderleri ve Vekalet Ücreti Konusundaki Anlaşma'
    ],
    suggestedNotes: 'Tarafların karşılıklı olarak vekalet ücreti ve yargılama gideri talep etmedikleri belirtilsin.',
    aiPromptGuide: 'HMK m. 307-315 hükümleri gereğince davadan feragat veya sulh beyanını içeren kesin sonuç doğurucu dilekçeyi kaleme al.'
  },
  {
    id: 'hmk-istinaf-basvuru',
    title: 'İstinaf Başvuru Dilekçesi',
    shortTitle: 'İstinaf Başvurusu',
    categoryId: 'hmk',
    lawRef: 'HMK m. 342',
    courtType: 'Bölge Adliye Mahkemesi (Gönderilmek Üzere İlk Derece Mahkemesi)',
    keyElements: [
      'İlk Derece Mahkemesi Karar Bilgileri (Esas, Karar No, Tarih)',
      'Kararın Usul ve Esas Yönünden Hukuka Aykırılık Nedenleri',
      'İstinaf Sebepleri ve Gerekçeleri',
      'Kararın Kaldırılarak Taleplerimiz Doğrultusunda Yeniden Hüküm Kurulması Talebi'
    ],
    suggestedNotes: 'Kararın eksik incelemeyle kurulduğu, delillerin değerlendirilmediği gerekçesiyle kaldırılması talep edilsin.',
    aiPromptGuide: 'HMK m. 342 gereğince Bölge Adliye Mahkemesi (BAM) nezdinde ilk derece mahkemesi kararının kaldırılması talepli İstinaf Dilekçesini kaleme al.'
  },
  {
    id: 'hmk-istinafa-cevap',
    title: 'İstinafa Cevap ve Katılma Yoluyla İstinaf Dilekçesi',
    shortTitle: 'İstinafa Cevap & Katılma',
    categoryId: 'hmk',
    lawRef: 'HMK m. 347, 348',
    courtType: 'Bölge Adliye Mahkemesi Hukuk Dairesi',
    keyElements: [
      'Karşı Tarafın İstinaf Başvuru Dilekçesindeki Haksız İddiaların Reddi',
      'Yerel Mahkeme Kararının Usul ve Kanuna Uygun Olduğu Beyanı',
      'Katılma Yoluyla İstinaf Sebepleri (Varsa)'
    ],
    suggestedNotes: 'Aleyhe olan istinaf başvurusunun haksız ve hukuki dayanaktan yoksun olduğu savunulsun.',
    aiPromptGuide: 'HMK m. 347/348 uyarınca karşı tarafın istinaf dilekçesine karşı cevap ve katılma yoluyla istinaf beyanlarını içeren dilekçeyi kaleme al.'
  },
  {
    id: 'hmk-temyiz-basvuru',
    title: 'Temyiz Başvuru Dilekçesi',
    shortTitle: 'Temyiz Başvurusu (Yargıtay)',
    categoryId: 'hmk',
    lawRef: 'HMK m. 364',
    courtType: 'Yargıtay Relevant Hukuk Dairesi (BAM Aracılığıyla)',
    keyElements: [
      'Bölge Adliye Mahkemesi (BAM) Karar Bilgileri',
      'BAM Kararının Kanuna ve Emsal Yargıtay İçtihatlarına Aykırılığı',
      'Bozma (Temyiz) Sebepleri ve Hukuki Gerekçeler',
      'Kararın Bozularak Dosyanın Yeniden İncelenmesi Talebi'
    ],
    suggestedNotes: 'Hukuk kurallarının yanlış uygulandığı ve Yargıtay HGK kararlarına aykırılık bulunduğu gerekçeleri sunulsun.',
    aiPromptGuide: 'HMK m. 364 vd. uyarınca Yargıtay ilgili Hukuk Dairesine sunulmak üzere BAM kararının bozulması talepli Temyiz Dilekçesini hazırlansın.'
  },
  {
    id: 'hmk-temyize-cevap',
    title: 'Temyize Cevap Dilekçesi',
    shortTitle: 'Temyize Cevap Dilekçesi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 367',
    courtType: 'Yargıtay İlgili Hukuk Dairesi',
    keyElements: [
      'Temyiz Eden Tarafın İddialarının Reddi',
      'Bölge Adliye Mahkemesi Kararının Onanması Talebi'
    ],
    suggestedNotes: 'BAM kararının hukuka uygun olduğu ve temyiz isteminin reddiyle kararın onanması talep edilsin.',
    aiPromptGuide: 'HMK m. 367 uyarınca temyiz dilekçesine karşı cevabi beyanları ve kararın onanması talebini içeren dilekçeyi yaz.'
  },
  {
    id: 'hmk-yargilamanin-yenilenmesi',
    title: 'Yargılamanın Yenilenmesi Dilekçesi',
    shortTitle: 'Yargılamanın Yenilenmesi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 375',
    courtType: 'Kararı Veren Hukuk Mahkemesi',
    keyElements: [
      'HMK m. 375\'teki Yargılamanın Yenilenmesi Sebeplerinden Birinin Varlığı (Sahtecilik, Yeni Belge, Yalan Tanıklık vs.)',
      'Sebebin Öğrenildiği Tarih ve Hak Düşürücü Süre',
      'Kararın İptali ve Yeniden Yargılama Yapılması Talebi'
    ],
    suggestedNotes: 'Hükme esas alınan belgenin sahteliğinin kesinleştiği veya yeni somut delil ele geçirildiği belgelensin.',
    aiPromptGuide: 'HMK m. 375 gereğince kesinleşmiş karara karşı Yargılamanın Yenilenmesi Talep Dilekçesi kaleme al.'
  },
  {
    id: 'hmk-tavzih-tashih',
    title: 'Tavzih ve Tashih Talep Dilekçesi',
    shortTitle: 'Tavzih ve Tashih Talebi',
    categoryId: 'hmk',
    lawRef: 'HMK m. 305',
    courtType: 'Kararı Veren Hukuk Mahkemesi',
    keyElements: [
      'Gerekçeli Karardaki İcra Edilebilirlik / Çelişki Unsuru',
      'Maddi Hata veya Açık Olamayan İbarelerin Tespiti',
      'Hükmün Açıklanması (Tavzih) veya Yazım Hatasının Düzeltilmesi (Tashih) Talebi'
    ],
    suggestedNotes: 'Hüküm fıkrasındaki isim/hesap yazım hatasının tashih edilmesi talep edilsin.',
    aiPromptGuide: 'HMK m. 305/304 uyarınca mahkeme kararındaki çelişkili veya hatalı hususların düzeltilmesi için Tavzih/Tashih Dilekçesi hazırla.'
  },

  // -------------------------------------------------------------
  // 2. CEZA YARGILAMASI (CMK & TCK)
  // -------------------------------------------------------------
  {
    id: 'cmk-sikayet',
    title: 'Şikâyet ve Suç Duyurusu Dilekçesi (Cumhuriyet Başsavcılığı)',
    shortTitle: 'Suç Duyurusu / Şikâyet',
    categoryId: 'cmk',
    lawRef: 'CMK m. 158',
    courtType: 'Nöbetçi Cumhuriyet Başsavcılığı',
    keyElements: [
      'Şikayetçi ve Şüpheli Kimlik / Adres Bilgileri',
      'Suç Tipleri (TCK Madde Numaraları)',
      'Suç Tarihi ve Suç Yeri',
      'Olayın Özeti ve Somut Deliller (Kamera, Mesaj, Tanık)',
      'Kamu Davası Açılması Talebi'
    ],
    suggestedNotes: 'Şüpheli hakkında kamu davası açılması için soruşturma başlatılması ve delillerin toplanması istensin.',
    aiPromptGuide: 'CMK m. 158 uyarınca Cumhuriyet Başsavcılığına sunulacak, şüphelinin cezalandırılması istemli Suç Duyurusu Dilekçesi kaleme al.'
  },
  {
    id: 'cmk-kyok-itiraz',
    title: 'Kovuşturmaya Yer Olmadığına Dair Karara (KYOK) İtiraz Dilekçesi',
    shortTitle: 'KYOK (Takipsizlik) İtirazı',
    categoryId: 'cmk',
    lawRef: 'CMK m. 173',
    courtType: 'Nöbetçi Sulh Ceza Hakimliği',
    keyElements: [
      'Cumhuriyet Başsavcılığı Karar Sayısı (Soruşturma No, Karar No)',
      'Kararın Tebliğ Tarihi ve 15 Günlük İtiraz Süresi',
      'Soruşturmadaki Eksik İncelemeler ve Toplanmayan Deliller',
      'KYOK Kararının Kaldırılarak Kamu Davası Açılması Talebi'
    ],
    suggestedNotes: 'Savcılıkça etkin soruşturma yapılmadığı, tanıkların dinlenmediği ve HTS/kamera kayıtlarının istenmediği gerekçeleri sunulsun.',
    aiPromptGuide: 'CMK m. 173 gereğince 15 günlük süre içinde Sulh Ceza Hakimliğine sunulmak üzere Takipsizlik (KYOK) kararına İtiraz Dilekçesi hazırla.'
  },
  {
    id: 'cmk-tutukluluk-itiraz',
    title: 'Tutukluluğa / Yakalamaya İtiraz Dilekçesi',
    shortTitle: 'Tutukluluğa İtiraz',
    categoryId: 'cmk',
    lawRef: 'CMK m. 101, 104',
    courtType: 'Sulh Ceza Hakimliği / Asliye Ceza / Ağır Ceza Mahkemesi',
    keyElements: [
      'Tutuklama Kararını Veren Makam ve Karar Tarihi',
      'CMK m. 100 Karinesinin Yokluğu (Kaçma / Delil Karartma Şüphesinin Olmaması)',
      'Ölçülülük ve Orantılılık İlkeleri',
      'Adli Kontrol Hükümleri Uyarınca Tahliye Talebi'
    ],
    suggestedNotes: 'Şüphelinin sabıkasız olduğu, sabit ikametgah sahibi olduğu ve tutuklamanın orantısız tedbir olduğu vurgulanıp tahliyesi istenilsin.',
    aiPromptGuide: 'CMK m. 101/104 çerçevesinde tutukluluk haline itiraz eden ve adli kontrolle serbest bırakılma talep eden Ceza Tahliye Dilekçesini yaz.'
  },
  {
    id: 'cmk-adli-kontrol-itiraz',
    title: 'Adli Kontrol Kararının Kaldırılması / İtiraz Dilekçesi',
    shortTitle: 'Adli Kontrol İtirazı',
    categoryId: 'cmk',
    lawRef: 'CMK m. 111',
    courtType: 'İlgili Ceza Mahkemesi / Sulh Ceza Hakimliği',
    keyElements: [
      'Adli Kontrol Tedbirinin Türü (Yurtdışı Çıkış Yasağı, İmza Yükümlülüğü)',
      'Tedbirin Katlanılmaz Hale Gelmesi ve Mağduriyetler',
      'Adli Kontrolün Kaldırılması Talebi'
    ],
    suggestedNotes: 'Yurtdışı çıkış yasağının veya haftalık imza tedbirinin mesleki/kişisel mağduriyete yol açtığı belirtilerek kaldırılması istensin.',
    aiPromptGuide: 'CMK m. 111 uyarınca adli kontrol tedbirinin kaldırılması veya hafifletilmesi talepli dilekçe oluştur.'
  },
  {
    id: 'cmk-katilma-talep',
    title: 'Katılma (Müdahil Olma) Talep Dilekçesi',
    shortTitle: 'Katılma (Müdahil) Talebi',
    categoryId: 'cmk',
    lawRef: 'CMK m. 237',
    courtType: 'Kovuşturmayı Yürüten Ceza Mahkemesi',
    keyElements: [
      'Suçtan Doğrudan Zarar Görme Durumu',
      'CMK m. 237 Uyarınca Davaya Katılan Sıfatıyla Kabul Edilme Talebi',
      'Sanığın Cezalandırılması Beyanları'
    ],
    suggestedNotes: 'Müvekkilin suçtan zarar gördüğü belgelenip katılan (müdahil) olarak davaya kabulü talep edilsin.',
    aiPromptGuide: 'CMK m. 237 uyarınca ceza davasında kamu davasına katılma (müdahillik) talebini içeren dilekçeyi kaleme al.'
  },
  {
    id: 'cmk-savunma-mutalaa',
    title: 'Savunma ve Esas Hakkında Mütalaaya Karşı Savunma Dilekçesi',
    shortTitle: 'Esas Hakkında Savunma',
    categoryId: 'cmk',
    lawRef: 'CMK m. 216',
    courtType: 'Davaya Bakmakta Olan Ceza Mahkemesi',
    keyElements: [
      'İddianame ve İddia Makamının Mütalaasına Yanıtlar',
      'Delillerin Değerlendirilmesi ve Hukuka Aykırı Delillerin Reddi',
      'Şüpheden Sanık Yararlanır (In Dubio Pro Reo) İlkesi',
      'Beraat veya Lehdeki Hükümlerin Uygulanması Talebi'
    ],
    suggestedNotes: 'İddia makamının mütalaasındaki suç vasfının hatalı olduğu ve suçun unsurlarının oluşmadığı savunulup beraat talep edilsin.',
    aiPromptGuide: 'CMK m. 216 gereğince esas hakkındaki mütalaaya karşı ayrıntılı beraat ve savunma beyanlarını içeren ceza savunma dilekçesini kaleme al.'
  },
  {
    id: 'cmk-ceza-istinaf',
    title: 'Ceza İstinaf Başvuru Dilekçesi',
    shortTitle: 'Ceza İstinaf Başvurusu',
    categoryId: 'cmk',
    lawRef: 'CMK m. 272 vd.',
    courtType: 'Bölge Adliye Mahkemesi Ceza Dairesi',
    keyElements: [
      'İlk Derece Ceza Mahkemesi Kararı Bilgileri',
      'Süre Tutum Sonrası Gerekçeli İstinaf Nedenleri',
      'Hukuka Aykırılıklar (Sübut, Suç Niteliği, Takdiri İndirimler)',
      'Beraat veya Kararın Bozulması Talebi'
    ],
    suggestedNotes: 'İlk derece mahkemesi kararının eksik incelemeye ve hatalı hukuki nitelendirmeye dayandığı vurgulansın.',
    aiPromptGuide: 'CMK m. 272 uyarınca ceza mahkemesi mahkûmiyet kararının iptali/bozulması talepli Ceza İstinaf Dilekçesini oluştur.'
  },
  {
    id: 'cmk-ceza-temyiz',
    title: 'Ceza Temyiz Başvuru Dilekçesi',
    shortTitle: 'Ceza Temyiz (Yargıtay)',
    categoryId: 'cmk',
    lawRef: 'CMK m. 286 vd.',
    courtType: 'Yargıtay İlgili Ceza Dairesi',
    keyElements: [
      'BAM Ceza Dairesi Kararının Temyiz Sebepleri',
      'CMK m. 289 Hukuka Kesin Aykırılık Halleri',
      'Yargıtay Kararının Bozulması Talebi'
    ],
    suggestedNotes: 'BAM kararının CMK m. 289\'daki kesin hukuka aykırılık hallerini taşıdığı belirtilsin.',
    aiPromptGuide: 'CMK m. 286-289 uyarınca Yargıtay Ceza Dairesine hitaben Temyiz Dilekçesini kaleme al.'
  },
  {
    id: 'cmk-hagb-itiraz',
    title: 'Hükmün Açıklanmasının Geri Bırakılmasına (HAGB) İtiraz Dilekçesi',
    shortTitle: 'HAGB Kararına İtiraz',
    categoryId: 'cmk',
    lawRef: 'CMK m. 231/12',
    courtType: 'Nöbetçi Ağır Ceza / Asliye Ceza Mahkemesi',
    keyElements: [
      'HAGB Kararının Sübut ve Usul Yönünden Denetimi',
      'Sanığın Beraat Etmesi Gerektiği Halde HAGB Verilmesi Hatası',
      'HAGB Kararının Kaldırılması ve Beraat Kararı Verilmesi Talebi'
    ],
    suggestedNotes: 'Sanığın suçsuz olduğu, HAGB kararının beraat hakkını engellediği vurgulanarak kararın kaldırılması istensin.',
    aiPromptGuide: 'CMK m. 231/12 uyarınca verilen HAGB kararının kaldırılması ve sanık hakkında beraat kararı kurulması istemli İtiraz Dilekçesini kaleme al.'
  },
  {
    id: 'cmk-infaz-erteleme',
    title: 'İnfazın Ertelenmesi / Durdurulması Talep Dilekçesi',
    shortTitle: 'İnfazın Ertelenmesi Talebi',
    categoryId: 'cmk',
    lawRef: '5275 Sayılı Kanun m. 16, 17',
    courtType: 'İnfaz Hakimliği / Cumhuriyet Başsavcılığı İnfaz Bürosu',
    keyElements: [
      'Hükümlünün Sağlık / Aile / Meslek Sebepleri',
      'Tam Teşekküllü Hastane / Adli Tıp Raporları',
      '5275 Sayılı Kanun Uyarınca İnfazın 6 Ay / 1 Yıl Ertelenmesi Talebi'
    ],
    suggestedNotes: 'Hükümlünün ağır hastalığı veya bakmakla yükümlü olduğu ailesinin durumu sebebiyle infazın ertelenmesi istenilsin.',
    aiPromptGuide: '5275 Sayılı Ceza ve Güvenlik Tedbirlerinin İnfazı Hakkında Kanun m. 16/17 uyarınca İnfaz Erteleme Dilekçesini kaleme al.'
  },
  {
    id: 'cmk-adli-sicil-silme',
    title: 'Adli Sicil Kaydının Silinmesi / Arşiv Kaydının Silinmesi Talebi',
    shortTitle: 'Adli Sicil & Arşiv Silme',
    categoryId: 'cmk',
    lawRef: '5352 Sayılı Kanun m. 12',
    courtType: 'Adli Sicil ve İstatistik Genel Müdürlüğü / Karar Mahkemesi',
    keyElements: [
      'Cezanın İnfaz Edildiğine Dair İnfaz Evrakı / Bildiri Fişi',
      'Yasal Sürelerin (5 Yıl / 15 Yıl / 30 Yıl) Dolmuş Olması',
      'Sicil ve Arşiv Kaydının Adli Sicilden Çıkarılması Talebi'
    ],
    suggestedNotes: 'Cezanın infaz edildiği, kanuni bekleme süresinin dolduğu belirtilerek adli sicil ve arşiv kaydının silinmesi talep edilsin.',
    aiPromptGuide: '5352 Sayılı Adli Sicil Kanunu hükümleri uyarınca Adli Sicil Kaydının ve Arşiv Kaydının Silinmesi Talep Dilekçesini hazırla.'
  },

  // -------------------------------------------------------------
  // 3. İCRA VE İFLAS HUKUKU (İİK)
  // -------------------------------------------------------------
  {
    id: 'iik-takip-talebi',
    title: 'İlamsız / İlamlı / Kambiyo Takip Talebi',
    shortTitle: 'İcra Takip Talebi',
    categoryId: 'iik',
    lawRef: 'İİK m. 58',
    courtType: 'İcra Dairesi Müdürlüğü',
    keyElements: [
      'Alacaklı ve Borçlu Bilgileri (T.C./VKN, Adres)',
      'Alacağın Miktarı, Faiz Oranı ve İşlemeye Başladığı Tarih',
      'Takibin Dayanağı Belge (Senet, Çek, Fatura, İlam)',
      'Haciz / Ödeme Emri Gönderilmesi Talebi'
    ],
    suggestedNotes: 'İşlemiş faiz ve asıl alacak tutarı ayrı ayrı belirtilerek takibin başlatılması ve ödeme emri tebliği talep edilsin.',
    aiPromptGuide: 'İİK m. 58 uyarınca icra takibi başlatmak için eksiksiz İcra Takip Talebi formunu ve dilekçesini kaleme al.'
  },
  {
    id: 'iik-odeme-emri-itiraz',
    title: 'Ödeme / İcra Emrine İtiraz Dilekçesi (Borca / İmzaya / Yetkiye)',
    shortTitle: 'İcra Takibine İtiraz',
    categoryId: 'iik',
    lawRef: 'İİK m. 62',
    courtType: 'Relevant İcra Dairesi Müdürlüğü',
    keyElements: [
      'İcra Dosya Numarası',
      '7 Günlük Yasal İtiraz Süresi İçinde Başvuru',
      'Borca İtiraz / İmzaya İtiraz / Yetki İtirazı Nedenleri',
      'Takibin Durdurulması Talebi'
    ],
    suggestedNotes: 'Borcun ödendiği, imzaya itiraz edildiği ve takibin durdurulması talep edilsin.',
    aiPromptGuide: 'İİK m. 62 gereğince 7 günlük hak düşürücü süre içinde borca, faize ve imzaya itiraz eden ve takibi durduran dilekçeyi yaz.'
  },
  {
    id: 'iik-gecikmis-itiraz',
    title: 'Gecikmiş İtiraz Dilekçesi',
    shortTitle: 'Gecikmiş İtiraz Talebi',
    categoryId: 'iik',
    lawRef: 'İİK m. 65',
    courtType: 'İcra Hukuk Mahkemesi',
    keyElements: [
      'Engelin Varlığı (Ağır Hastalık, Mücbir Sebep vs.)',
      'Engelin Kalktığı Tarihten İtibaren 3 Gün İçinde Başvuru',
      'Mazeret Delilleri ve Borca İtiraz Beyanları',
      'Takibin Durdurulması Talebi'
    ],
    suggestedNotes: 'Borçlunun hastanede yatarak tedavi gördüğü ve tebligattan haberdar olamadığı belgelensin.',
    aiPromptGuide: 'İİK m. 65 uyarınca mazereti nedeniyle icra takibine süresinde itiraz edemeyen borçlu adına Gecikmiş İtiraz Dilekçesini kaleme al.'
  },
  {
    id: 'iik-itirazin-iptali',
    title: 'İtirazın İptali Dava Dilekçesi (Genel Mahkemeler)',
    shortTitle: 'İtirazın İptali Davası',
    categoryId: 'iik',
    lawRef: 'İİK m. 67',
    courtType: 'Asliye Hukuk / Asliye Ticaret / Tüketici Mahkemesi',
    keyElements: [
      'İcra Takip Dosyası ve Borçlunun Haksız İtirazı',
      '1 Yıllık Dava Açma Süresi',
      'Alacağın Varlığını İspatlayan Faturalar, Sözleşmeler, Defterler',
      'İtirazın İptali, Takibin Devamı ve En Az %20 İcra İnkâr Tazminatı Talebi'
    ],
    suggestedNotes: 'Borçlunun itirazının kötüniyetli olduğu vurgulanarak en az %20 icra inkâr tazminatına hükmedilmesi istensin.',
    aiPromptGuide: 'İİK m. 67 uyarınca borçlunun icra takibine yaptığı itirazın iptali ve %20 icra inkâr tazminatı talepli Dava Dilekçesi hazırla.'
  },
  {
    id: 'iik-itirazin-kaldirilmasi',
    title: 'İtirazın Geçici / Kesin Kaldırılması Talep Dilekçesi (İcra Hukuk Mahkemesi)',
    shortTitle: 'İtirazın Kaldırılması Talebi',
    categoryId: 'iik',
    lawRef: 'İİK m. 68',
    courtType: 'İcra Hukuk Mahkemesi Hakimliği',
    keyElements: [
      'İİK m. 68 MADDESİNDEKİ BELGELERDEN BİRİNE DAYANILMASI (Noter Senedi, Resmi Daire Makbuzu, İmzası İkrar Edilmiş Belge)',
      '6 Aylık Başvuru Süresi',
      'İtirazın Kaldırılması ve %20 İcra İnkar Tazminatı Talebi'
    ],
    suggestedNotes: 'Alacağın İİK 68 niteliğinde resmi imzalı belgeye dayandığı belirtilsin.',
    aiPromptGuide: 'İİK m. 68 gereğince İcra Hukuk Mahkemesinde İtirazın Kaldırılması talepli dilekçeyi kaleme al.'
  },
  {
    id: 'iik-menfi-tespit',
    title: 'Menfi Tespit ve İstirdat Dava Dilekçesi',
    shortTitle: 'Menfi Tespit Davası',
    categoryId: 'iik',
    lawRef: 'İİK m. 72',
    courtType: 'Asliye Hukuk / Asliye Ticaret Mahkemesi',
    keyElements: [
      'Borçlu Olunmadığının Tespiti Talebi',
      'İcra Takibinden Önce veya Sonra Açılma Durumu',
      'Teminat Karşılığında İcra Veznesindeki Paranın Alacaklıya Ödenmemesi (İhtiyati Tedbir) Talebi',
      '%20 Kötüniyet Tazminatı Talebi'
    ],
    suggestedNotes: 'Müvekkilin takip konusu senet/fatura sebebiyle borçlu olmadığının tespiti ve takibin tedbiren durdurulması talep edilsin.',
    aiPromptGuide: 'İİK m. 72 uyarınca borçlu olunmadığının tespiti (Menfi Tespit) ve haksız ödenen paranın iadesi (İstirdat) Dava Dilekçesini oluştur.'
  },
  {
    id: 'iik-istihkak',
    title: 'İstihkak İddiası ve İstihkak Davası Dilekçesi',
    shortTitle: 'İstihkak Davası',
    categoryId: 'iik',
    lawRef: 'İİK m. 96, 97',
    courtType: 'İcra Hukuk Mahkemesi',
    keyElements: [
      'Haczedilen Malın 3. Kişiye Ait Olduğu İddiası',
      '7 Günlük Dava Açma Süresi',
      'Mülkiyet ve Zilyetlik Delilleri (Fatura, Defter Kaydı)',
      'Haczin Kaldırılması Talebi'
    ],
    suggestedNotes: 'Haczedilen malların müvekkil 3. kişiye ait olduğu faturalarla kanıtlanarak haczin kaldırılması istenilsin.',
    aiPromptGuide: 'İİK m. 96-97 uyarınca 3. kişinin haczedilen mal üzerindeki mülkiyet hakkına dayalı İstihkak Davası Dilekçesini yaz.'
  },
  {
    id: 'iik-ihalenin-feshi',
    title: 'İhalenin Feshi Talep Dilekçesi',
    shortTitle: 'İhalenin Feshi Talebi',
    categoryId: 'iik',
    lawRef: 'İİK m. 134',
    courtType: 'İcra Hukuk Mahkemesi',
    keyElements: [
      'İhale İlanı ve İhale Sürecindeki Usulsüzlükler',
      '7 Günlük Şikayet Süresi',
      'Satış İlanının Tebligat Usulsüzlüğü, İhaleye Fesat Karıştırılması vs.',
      'İhalenin Feshi Kararı Verilmesi Talebi'
    ],
    suggestedNotes: 'Satış ilanının usulsüz tebliğ edildiği ve ihaleyle malın değerinin çok altında satıldığı gerekçeleri sunulsun.',
    aiPromptGuide: 'İİK m. 134 uyarınca İcra Hukuk Mahkemesinde İhalenin Feshi talepli şikayet dilekçesini kaleme al.'
  },
  {
    id: 'iik-icra-sikayet',
    title: 'İcra Memurunun Muamelesini Şikâyet Dilekçesi',
    shortTitle: 'İcra Memuru Muamelesini Şikâyet',
    categoryId: 'iik',
    lawRef: 'İİK m. 16',
    courtType: 'İcra Hukuk Mahkemesi',
    keyElements: [
      'Şikayet Edilen İcra İşlemi (Haciz, Red Kararı vs.)',
      '7 Günlük Hak Düşürücü Süre (Kamu Düzenine Aykırılıkta Süresiz)',
      'İşlemin İptali veya Düzeltilmesi Talebi'
    ],
    suggestedNotes: 'İcra müdürünün kanuna aykırı işleminin veya nedensiz ret kararının iptali talep edilsin.',
    aiPromptGuide: 'İİK m. 16 gereğince icra müdürünün Kanuna ve olaya aykırı işleminin iptali için İcra Hukuk Mahkemesine Şikayet Dilekçesini yaz.'
  },
  {
    id: 'iik-haciz-satis-talepleri',
    title: 'Haciz, Satış, Maaş Haczi ve Müzekkere Talepleri',
    shortTitle: 'Haciz & Satış & Müzekkere Talebi',
    categoryId: 'iik',
    lawRef: 'İİK m. 78, 106, 355',
    courtType: 'Relevant İcra Dairesi Müdürlüğü',
    keyElements: [
      'Borçlunun UYAP / SGK / Araç / Taşınmaz Sorguları',
      'Maaş Haczi Müzekkeresi Yazılması Talebi',
      'Menkul / Gayrimenkul Satış İstenmesi Talebi'
    ],
    suggestedNotes: 'Borçlunun SGK adresine maaş haczi müzekkeresi yazılması ve tapu kayıtlarına haciz işlenmesi talep edilsin.',
    aiPromptGuide: 'İİK m. 78/106 uyarınca icra dairesinden araç haczi, tapu haczi, maaş haczi müzekkeresi ve satış talebini içeren icra talep dilekçesini hazırla.'
  },
  {
    id: 'iik-ihtiyati-haciz',
    title: 'İhtiyati Haciz Talep Dilekçesi',
    shortTitle: 'İhtiyati Haciz Talebi',
    categoryId: 'iik',
    lawRef: 'İİK m. 257',
    courtType: 'Asliye Ticaret / Asliye Hukuk Mahkemesi',
    keyElements: [
      'Rehinle Temin Edilmemiş Muaccel Borç Varlığı',
      'Borçlunun Kaçma / Mal Kaçırma Tehlikesi',
      'Teminat Gösterilerek Mallarına İhtiyati Haciz Konulması Talebi'
    ],
    suggestedNotes: 'Vadesi gelmiş alacağın ödenmediği ve borçlunun mal kaçırdığı belirtilerek ihtiyati haciz kararı verilsin.',
    aiPromptGuide: 'İİK m. 257 uyarınca borçlunun taşınır, taşınmaz ve 3. kişilerdeki alacaklarına ihtiyati haciz konulması talepli dilekçeyi yaz.'
  },
  {
    id: 'iik-konkordato-iflas',
    title: 'Konkordato / İflas Talep Dilekçesi',
    shortTitle: 'Konkordato / İflas Talebi',
    categoryId: 'iik',
    lawRef: 'İİK m. 285 vd.',
    courtType: 'Asliye Ticaret Mahkemesi',
    keyElements: [
      'Borç Ödeme Güçlüğü ve Finansal Durum Raporları',
      'Konkordato Ön Projesi ve Bağımsız Denetim Raporu',
      'Geçici Meyil ve İhtiyati Tedbir Kararı Verilmesi Talebi'
    ],
    suggestedNotes: 'Şirketin mali yapısının iyileştirilmesi için geçici mühlet ve konkordato komiseri atanması istensin.',
    aiPromptGuide: 'İİK m. 285 vd. hükümleri çerçevesinde Asliye Ticaret Mahkemesinden Konkordato Geçici Mühleti ve Tedbir Talepli Dava Dilekçesini kaleme al.'
  },

  // -------------------------------------------------------------
  // 4. İDARE VE VERGİ YARGILAMASI (İYUK)
  // -------------------------------------------------------------
  {
    id: 'iyuk-iptal-davasi',
    title: 'İdari İptal Davası Dilekçesi',
    shortTitle: 'İdari İptal Davası',
    categoryId: 'iyuk',
    lawRef: 'İYUK m. 2/1-a',
    courtType: 'Nöbetçi İdare Mahkemesi Başkanlığı',
    keyElements: [
      'İptali İstenen İdari İşlemin Tarih ve Sayısı',
      'Tebliğ Tarihi ve 60 Günlük Dava Açma Süresi',
      'Hukuka Aykırılık Unsurları (Yetki, Şekil, Sebep, Konu, Maksat)',
      'İdari İşlemin İptali Talebi'
    ],
    suggestedNotes: 'İdari işlemin yetki ve maksat unsurları yönünden hukuka aykırı olduğu açıklanarak iptali sağlansın.',
    aiPromptGuide: 'İYUK m. 2/1-a ve m. 3 uyarınca idari işlemin yetki, şekil, sebep, konu ve maksat yönünden sakatlığı nedeniyle İptal Davası Dilekçesini kaleme al.'
  },
  {
    id: 'iyuk-tam-yargi',
    title: 'Tam Yargı (Tazminat) Davası Dilekçesi',
    shortTitle: 'Tam Yargı (Tazminat) Davası',
    categoryId: 'iyuk',
    lawRef: 'İYUK m. 2/1-b',
    courtType: 'Nöbetçi İdare Mahkemesi Başkanlığı',
    keyElements: [
      'İdarenin Hizmet Kusuru veya Kusursuz Sorumluluğu',
      'Ön Karar Başvurusu ve İdarenin Cevabı / Zımni Reddi',
      'Uğranılan Maddi ve Manevi Zararların Kalemleri ve Miktarları',
      'Zararın Yasal Faiziyle Birlikte Tazmini Talebi'
    ],
    suggestedNotes: 'İdarenin eylem ve işlemleri sonucu oluşan maddi/manevi zararın idarece tazmin edilmesi talep edilsin.',
    aiPromptGuide: 'İYUK m. 2/1-b uyarınca idarenin kusurlu/kusursuz sorumluluğuna dayalı Tam Yargı (Tazminat) Dava Dilekçesini oluştur.'
  },
  {
    id: 'iyuk-yd-talebi',
    title: 'Yürütmenin Durdurulması (YD) Talep Dilekçesi',
    shortTitle: 'Yürütmenin Durdurulması (YD)',
    categoryId: 'iyuk',
    lawRef: 'İYUK m. 27',
    courtType: 'İdare / Vergi Mahkemesi Başkanlığı',
    keyElements: [
      'İYUK m. 27 Şartlarının Birlikte Gerçekleşmesi:',
      '1) İdari İşlemin Uygulanması Halinde Telafisi Güç veya İmkânsız Zararların Doğması',
      '2) İdari İşlemin Açıkça Hukuka Aykırı Olması',
      'Tebligat Yapılmaksızın veya Savunma Alınana Kadar YD Kararı Verilmesi Talebi'
    ],
    suggestedNotes: 'İşlemin uygulanması halinde giderilmesi imkansız zararlar doğacağı gerekçesiyle acil YD kararı istensin.',
    aiPromptGuide: 'İYUK m. 27 uyarınca telafisi imkansız zarar ve açık hukuka aykırılık unsurlarını vurgulayan Yürütmenin Durdurulması (YD) Talep Dilekçesini yaz.'
  },
  {
    id: 'iyuk-yd-itiraz',
    title: 'Yürütmenin Durdurulması Kararına İtiraz Dilekçesi',
    shortTitle: 'YD Kararına İtiraz',
    categoryId: 'iyuk',
    lawRef: 'İYUK m. 27/7',
    courtType: 'Bölge İdare Mahkemesi (İdare Mahkemesi Aracılığıyla)',
    keyElements: [
      'YD Red veya YD Kabul Kararının Tebliğ Tarihi',
      '7 Günlük İtiraz Süresi',
      'Bölge İdare Mahkemesince YD İtirazının Kabulü Talebi'
    ],
    suggestedNotes: 'İdare Mahkemesince verilen YD red kararının kaldırılması ve YD verilmesi talep edilsin.',
    aiPromptGuide: 'İYUK m. 27/7 uyarınca Yürütmenin Durdurulması talebinin reddi kararına karşı Bölge İdare Mahkemesine sunulacak İtiraz Dilekçesini kaleme al.'
  },
  {
    id: 'iyuk-idari-basvuru',
    title: 'İdari Başvuru Dilekçesi (Ön Karar Talebi)',
    shortTitle: 'İdari Ön Başvuru Dilekçesi',
    categoryId: 'iyuk',
    lawRef: 'İYUK m. 10, 13',
    courtType: 'İlgili İdari Kurum / Bakanlık / Valilik',
    keyElements: [
      'İdareden Bir İşlem veya Eylem Yapılmasının İstenmesi',
      'İYUK m. 10 Uyarınca 30 Günlük Zımni Red Karinesi',
      'Dava Ön Şartı Olarak İdari Başvurunun Yapılması'
    ],
    suggestedNotes: 'Dava açılmadan önce idareye başvurulup hakkın yerine getirilmesi veya ön karar verilmesi istensin.',
    aiPromptGuide: 'İYUK m. 10 veya m. 13 uyarınca idareye sunulacak Dava Ön Şartı niteliğindeki İdari Başvuru Dilekçesini hazırla.'
  },
  {
    id: 'iyuk-vergi-davası',
    title: 'Vergi Cezası / Tarhiyat / Ödeme Emri İptali Dava Dilekçesi',
    shortTitle: 'Vergi Cezası & Ödeme Emri İptali',
    categoryId: 'iyuk',
    lawRef: 'VUK & İYUK',
    courtType: 'Nöbetçi Vergi Mahkemesi Başkanlığı',
    keyElements: [
      'Vergi / Ceza İhbarnamesi veya Ödeme Emri Tarih ve Nosu',
      '30 Günlük Dava Açma Süresi',
      'Vergi Usul Kanununa (VUK) Aykırılıklar (Zamanaşımı, Şekil Hataları)',
      'Vergi Ziyaı / Özel Usulsüzlük Cezasının İptali Talebi'
    ],
    suggestedNotes: 'Tarhiyatın hukuka ve VUK düzenlemelerine aykırı olduğu gerekçesiyle cezanın iptali talep edilsin.',
    aiPromptGuide: 'Vergi Usul Kanunu ve İYUK uyarınca Vergi Mahkemesinde açılacak Vergi Cezası / Tarhiyat İptali Dava Dilekçesini yaz.'
  },
  {
    id: 'iyuk-bim-istinaf',
    title: 'Bölge İdare Mahkemesi İstinaf Başvuru Dilekçesi',
    shortTitle: 'Bölge İdare (BİM) İstinaf',
    categoryId: 'iyuk',
    lawRef: 'İYUK m. 45',
    courtType: 'Bölge İdare Mahkemesi (İdare/Vergi Mahkemesi Aracılığıyla)',
    keyElements: [
      'İdare / Vergi Mahkemesi Karar Bilgileri',
      '30 Günlük İstinaf Süresi',
      'Kararın Kaldırılması ve İptal / Tazminat Kararı Verilmesi Talebi'
    ],
    suggestedNotes: 'Yerel idare mahkemesinin kararı usul ve yasaya aykırı olup Bölge İdare Mahkemesince kaldırılmalıdır.',
    aiPromptGuide: 'İYUK m. 45 gereğince Bölge İdare Mahkemesi (BİM) nezdinde İstinaf Dilekçesini kaleme al.'
  },
  {
    id: 'iyuk-danistay-temyiz',
    title: 'Danıştay Temyiz Başvuru Dilekçesi',
    shortTitle: 'Danıştay Temyiz Dilekçesi',
    categoryId: 'iyuk',
    lawRef: 'İYUK m. 46',
    courtType: 'Danıştay İlgili Dairesi (BİM Aracılığıyla)',
    keyElements: [
      'Bölge İdare Mahkemesi Kararının Temyiz Sebepleri',
      'Hukuk Kurallarının Yanlış Uygulanması veya Görev/Yetki Hataları',
      'BİM Kararının Bozulması Talebi'
    ],
    suggestedNotes: 'BİM kararının emsal Danıştay içtihatlarına aykırı olduğu ve bozulması gerektiği belirtilsin.',
    aiPromptGuide: 'İYUK m. 46 uyarınca Danıştay İlgili Dairesine hitaben Temyiz Başvuru Dilekçesini kaleme al.'
  },

  // -------------------------------------------------------------
  // 5. İŞ VE SOSYAL GÜVENLİK HUKUKU
  // -------------------------------------------------------------
  {
    id: 'is-arabuluculuk-basvuru',
    title: 'Dava Şartı / İhtiyari Arabuluculuk Başvuru Formu / Dilekçesi',
    shortTitle: 'İş Hukuku Arabuluculuk Başvurusu',
    categoryId: 'is',
    lawRef: '7036 Sayılı Kanun m. 3',
    courtType: 'Arabuluculuk Bürosu / Adli Yargı İlk Derece Adalet Komisyonu',
    keyElements: [
      'Başvuran İşçi ve Karşı Taraf İşveren Bilgileri',
      'İş Sözleşmesi Tarihleri ve Ücret Bilgisi',
      'Talep Edilen İşçilik Alacakları (Kıdem, İhbar, Fazla Mesai, İşe İade vs.)',
      'Dava Şartı Arabuluculuk Sürecinin Başlatılması Talebi'
    ],
    suggestedNotes: 'İşe iade ve tüm kıdem, ihbar, yıllık izin, fazla mesai alacakları için arabuluculuk bürosuna başvurulsun.',
    aiPromptGuide: '7036 Sayılı İş Mahkemeleri Kanunu m. 3 uyarınca Arabuluculuk Bürosuna sunulacak İş Hukuku Arabuluculuk Başvuru Formunu kaleme al.'
  },
  {
    id: 'is-ise-iade',
    title: 'İşe İade Dava Dilekçesi',
    shortTitle: 'İşe İade Dava Dilekçesi',
    categoryId: 'is',
    lawRef: '4857 Sayılı İş Kanunu m. 20',
    courtType: 'İş Mahkemesi Hâkimliği',
    keyElements: [
      'Fesih Bildirim Tarihi ve Arabuluculuk Son Tutanak Tarihi',
      '1 Aylık Hak Düşürücü Süreye Uyulduğu Beyanı',
      'Geçerli/Haklı Bir Fesih Sebebinin Bulunmadığı',
      'Feshin Geçersizliği ve İşe İade Talebi',
      'En Çok 4 Aylık Boşta Geçen Süre Ücreti ve 4-8 Aylık İşe Başlatmama Tazminatı Talebi'
    ],
    suggestedNotes: 'İş sözleşmesinin geçerli neden olmadan feshedildiği, arabuluculuk anlaşmazlık tutanağının eklendiği vurgulansın.',
    aiPromptGuide: '4857 Sayılı İş Kanunu m. 20 ve 7036 Sayılı Kanun uyarınca feshin geçersizliği ve İşe İade Dava Dilekçesini kaleme al.'
  },
  {
    id: 'is-iscilik-alacaklari',
    title: 'Kıdem, İhbar ve Fazla Mesai Alacakları Dava Dilekçesi',
    shortTitle: 'İşçilik Alacakları Davası',
    categoryId: 'is',
    lawRef: '4857 Sayılı Kanun',
    courtType: 'İş Mahkemesi Hâkimliği',
    keyElements: [
      'İşyerindeki Çalışma Dönemi, Unvan ve Net Ücret',
      'İş Akdinin Fesih Şekli (İşverence Haksız Fesih / İşçinin Haklı Feshi)',
      'Kıdem Tazminatı, İhbar Tazminatı, Fazla Çalışma, UBGT, Yıllık İzin Alacağı Hesap Kalemleri',
      'Belirsiz Alacak Davası Olarak Açılması ve En Yüksek Banka Mevduat Faizi Talebi'
    ],
    suggestedNotes: 'Müvekkilin mobbinge uğradığı, fazla mesailerinin ödenmediği ve iş akdini haklı nedenle feshettiği savunulsun.',
    aiPromptGuide: '4857 Sayılı İş Kanunu çerçevesinde Belirsiz Alacak Davası türünde Kıdem, İhbar ve İşçilik Alacakları Dava Dilekçesini oluştur.'
  },
  {
    id: 'is-hizmet-tespiti',
    title: 'Hizmet Tespiti Dava Dilekçesi',
    shortTitle: 'Hizmet Tespiti Davası (SGK)',
    categoryId: 'is',
    lawRef: '5510 Sayılı Kanun m. 86',
    courtType: 'İş Mahkemesi Hâkimliği (SGK Fer\'i Müdahil)',
    keyElements: [
      'Sigortasız / Eksik Bildirilen Çalışma Dönemleri',
      '5 Yıllık Hak Düşürücü Süre İncelemesi',
      'Bordro Tanıkları ve Emsal İşyeri Kayıtları',
      'Sigortalı Hizmetlerin Tespiti ve SGK Kayıtlarına İşlenmesi Talebi'
    ],
    suggestedNotes: 'Müvekkilin işyerinde kesintisiz çalıştığı halde SGK\'ya bildirilmediği komşu işyeri tanıklarıyla kanıtlanarak hizmet tespiti sağlansın.',
    aiPromptGuide: '5510 Sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu m. 86/9 uyarınca Hizmet Tespiti Dava Dilekçesini yaz.'
  },
  {
    id: 'is-kazasi-tazminat',
    title: 'İş Kazası Kaynaklı Maddi ve Manevi Tazminat Dava Dilekçesi',
    shortTitle: 'İş Kazası Tazminat Davası',
    categoryId: 'is',
    lawRef: 'TBK m. 49, 53, 54 & 4857',
    courtType: 'İş Mahkemesi Hâkimliği',
    keyElements: [
      'İş Kazasının Meydana Geldiği Tarih ve Oluş Şekli',
      'İşverenin İş Sağlığı ve Güvenliği Önlemlerini Almama Kusuru',
      'Maluliyet Oranı ve Adli Tıp / SGK Raporları',
      'Maddi Tazminat (Geçici/Sürekli İş Göremezlik, Bakıcı Gideri) ve Manevi Tazminat Talebi'
    ],
    suggestedNotes: 'İşverenin kusurlu olduğu, müvekkilin malul kaldığı belirtilerek maddi ve manevi tazminat hükmedilmesi talep edilsin.',
    aiPromptGuide: 'Türk Borçlar Kanunu ve İş Kanunu uyarınca İş Kazası sonucu oluşan Maddi ve Manevi Tazminat Dava Dilekçesini kaleme al.'
  },

  // -------------------------------------------------------------
  // 6. AİLE VE KİŞİLER HUKUKU (TMK)
  // -------------------------------------------------------------
  {
    id: 'tmk-anlasmali-bosanma',
    title: 'Anlaşmalı Boşanma Dava Dilekçesi ve Protokolü',
    shortTitle: 'Anlaşmalı Boşanma & Protokol',
    categoryId: 'tmk',
    lawRef: 'Türk Medeni Kanunu (TMK m. 166/3)',
    courtType: 'Aile Mahkemesi Hâkimliği',
    keyElements: [
      'En Az 1 Yıllık Evlilik Süresi Şartı',
      'Evlilik Birliğinin Temelinden Sarsıldığı Beyanı',
      'Anlaşmalı Boşanma Protokolü Maddeleri (Velayet, İştirak/Yoksulluk Nafakası, Tazminat, Mal/Eşya Paylaşımı)',
      'Tarafların Boşanmalarına Karar Verilmesi Talebi'
    ],
    suggestedNotes: 'Ekteki anlaşmalı boşanma protokolünün mahkemece onaylanarak tarafların boşanmalarına karar verilmesi istenilsin.',
    aiPromptGuide: 'TMK m. 166/3 uyarınca hem Anlaşmalı Boşanma Dava Dilekçesini hem de ıslak imzalanacak Anlaşmalı Boşanma Protokolünü eksiksiz olarak kaleme al.'
  },
  {
    id: 'tmk-cekismeli-bosanma',
    title: 'Çekişmeli Boşanma Dava Dilekçesi',
    shortTitle: 'Çekişmeli Boşanma Davası',
    categoryId: 'tmk',
    lawRef: 'TMK m. 166/1 vd.',
    courtType: 'Aile Mahkemesi Hâkimliği',
    keyElements: [
      'Evlilik Birliğinin Temelinden Sarsılması / Özel Boşanma Sebepleri (Zina, Hayata Kast, Terk vs.)',
      'Davalı Eşin Kusurlu Davranışları (Şiddet, Hakaret, Sadakatsizlik, İlgisizlik)',
      'Tedbir / Yoksulluk / İştirak Nafakası Talepleri',
      'Maddi ve Manevi Tazminat Talepleri (TMK m. 174)',
      'Çocukların Velayetinin Davacıya Verilmesi Talebi'
    ],
    suggestedNotes: 'Davalının ağır kusurlu olduğu belirtilerek velayet, nafaka ve tazminat talepleriyle boşanmaya karar verilmesi istensin.',
    aiPromptGuide: 'TMK m. 166/1 gereğince evlilik birliğinin temelinden sarsılması nedeniyle Çekişmeli Boşanma Dava Dilekçesini hazırlansın.'
  },
  {
    id: 'tmk-6284-koruma',
    title: '6284 Sayılı Kanun Kapsamında Koruma ve Tedbir Talep Dilekçesi',
    shortTitle: '6284 Koruma & Uzaklaştırma Talebi',
    categoryId: 'tmk',
    lawRef: '6284 Sayılı Kanun m. 5',
    courtType: 'Nöbetçi Aile Mahkemesi Hâkimliği',
    keyElements: [
      'Şiddet veya Şiddet Uygulanma Tehlikesi Varlığı',
      'Uzaklaştırma, Yaklaşmama, İletişim Araçlarıyla Rahatsız Etmeme Tedbirleri',
      'Geçici Koruma ve Gizlilik Kararı Talebi',
      'İvedilikle Tedbir Kararı Verilmesi Talebi'
    ],
    suggestedNotes: 'Müvekkilin can güvenliği riski nedeniyle şiddet uygulayan eş/şahıs hakkında ivedilikle 6 ay süreyle uzaklaştırma kararı verilsin.',
    aiPromptGuide: '6284 Sayılı Ailenin Korunması ve Kadına Karşı Şiddetin Önlenmesine Dair Kanun uyarınca acil Koruma ve Uzaklaştırma Dilekçesini yaz.'
  },
  {
    id: 'tmk-nafaka-davasi',
    title: 'Nafaka (Tedbir, İştirak, Yoksulluk / Artırım-Azaltım) Dava Dilekçesi',
    shortTitle: 'Nafaka / Nafaka Artırım Davası',
    categoryId: 'tmk',
    lawRef: 'TMK m. 169, 175, 176, 182',
    courtType: 'Aile Mahkemesi Hâkimliği',
    keyElements: [
      'Mevcut Nafaka Miktarı ve Geçim Şartlarının Değişmesi',
      'Enflasyon, Çocuğun Eğitim/Sağlık Giderlerinin Artması',
      'Tarafların Ekonomik ve Sosyal Durum (SED) İncelemesi',
      'Nafakanın Günün Koşullarına Uyarlandırılarak Artırılması Talebi'
    ],
    suggestedNotes: 'Artan enflasyon ve çocuğun okul masrafları karşısında mevcut nafakanın yetersiz kaldığı belirtilerek artırım talep edilsin.',
    aiPromptGuide: 'TMK m. 176/4 ve m. 182 uyarınca değişen ekonomik koşullar sebebiyle Nafaka Artırım Dava Dilekçesini kaleme al.'
  },
  {
    id: 'tmk-velayet-degisiklik',
    title: 'Velayetin Değiştirilmesi / Kaldırılması Dava Dilekçesi',
    shortTitle: 'Velayetin Değiştirilmesi Davası',
    categoryId: 'tmk',
    lawRef: 'TMK m. 183, 348',
    courtType: 'Aile Mahkemesi Hâkimliği',
    keyElements: [
      'Velayet Sahibi Eşin Görevini İhmal Etmesi / Bakım Zorluğu',
      'Çocuğun Üstün Yararı (Best Interests of the Child)',
      'Sosyal İnceleme Raporu (SİR) Alınması Talebi',
      'Velayetin Davacı Ebeveyne Verilmesi Talebi'
    ],
    suggestedNotes: 'Çocuğun bedeni ve ruhi gelişiminin tehlikede olduğu belirtilerek velayetin değiştirilmesi istensin.',
    aiPromptGuide: 'TMK m. 183 uyarınca çocuğun üstün yararı ilkesi doğrultusunda Velayetin Değiştirilmesi Dava Dilekçesini yaz.'
  },
  {
    id: 'tmk-mal-rejimi',
    title: 'Mal Rejiminin Tasfiyesi ve Katılma Alacağı Dava Dilekçesi',
    shortTitle: 'Mal Rejimi Tasfiyesi & Katılma Alacağı',
    categoryId: 'tmk',
    lawRef: 'TMK m. 218 vd.',
    courtType: 'Aile Mahkemesi Hâkimliği',
    keyElements: [
      'Evlilik İçinde Edinilmiş Malların Tespiti (Taşınmaz, Araç, Banka Hesabı)',
      'Edinilmiş Mallara Katılma Rejimi Uyarınca Artık Değer Hesabı',
      'Değer Artış Payı ve Katılma Alacağı Miktarları',
      'Taşınmazlara İhtiyati Tedbir Konulması Talebi'
    ],
    suggestedNotes: 'Evlilik birliği içinde edinilen malların tasfiyesi ve 1/2 oranında katılma alacağına karar verilmesi talep edilsin.',
    aiPromptGuide: 'TMK m. 218-241 maddeleri gereğince boşanma sonrası Mal Rejiminin Tasfiyesi ve Katılma Alacağı Dava Dilekçesini kaleme al.'
  },
  {
    id: 'tmk-vesayet-vasi',
    title: 'Vesayet / Vasi Tayini / Kayyım Atanması Talep Dilekçesi',
    shortTitle: 'Vasi Tayini / Vesayet Talebi',
    categoryId: 'tmk',
    lawRef: 'TMK m. 404 vd.',
    courtType: 'Sulh Hukuk Mahkemesi Hâkimliği',
    keyElements: [
      'Kısıtlanması İstenen Şahsın Durumu (Akıl Sağlığı, Yaşlılık, Felç vs.)',
      'Sağlık Kurulu Raporu (Heyet Raporu) Alınması Talebi',
      'Müvekkilin Vasi Olarak Atanması Talebi'
    ],
    suggestedNotes: 'Kısıtlı adayının kendi işlerini göremeyecek durumda olduğu belirtilerek vasi atanması istensin.',
    aiPromptGuide: 'TMK m. 405/408 uyarınca akıl hastalığı/yaşlılık sebebiyle Vasi Tayini Talep Dilekçesini oluştur.'
  },
  {
    id: 'tmk-soybagi-babalik',
    title: 'Soybağının Reddi / Babalık Davası Dilekçesi',
    shortTitle: 'Soybağının Reddi / Babalık Davası',
    categoryId: 'tmk',
    lawRef: 'TMK m. 286 vd.',
    courtType: 'Aile Mahkemesi Hâkimliği',
    keyElements: [
      'Babalık Karinesinin Çürütülmesi / Biyolojik Babalığın Tespiti',
      'DNA İncelemesi Yapılması Talebi',
      'Hak Düşürücü Sürelere Uyulduğu Beyanı'
    ],
    suggestedNotes: 'Mahkemece Adli Tıp Kurumu kanalıyla DNA testi yapılarak soybağının düzeltilmesi talep edilsin.',
    aiPromptGuide: 'TMK m. 286 uyarınca soybağının reddi ve babalığın tespiti istemli Dava Dilekçesini kaleme al.'
  },

  // -------------------------------------------------------------
  // 7. TİCARET, ŞİRKETLER VE TÜKETİCİ HUKUKU
  // -------------------------------------------------------------
  {
    id: 'ttk-thh-basvuru',
    title: 'Tüketici Hakem Heyeti (THH) Başvuru Dilekçesi',
    shortTitle: 'Tüketici Hakem Heyeti Başvurusu',
    categoryId: 'ttk',
    lawRef: '6502 Sayılı Kanun m. 68',
    courtType: 'İl / İlçe Tüketici Hakem Heyeti Başkanlığı',
    keyElements: [
      'Tüketici ve Satıcı/Sağlayıcı Bilgileri',
      'Ayıplı Mal veya Hizmetin Niteliği',
      'Fatura, Garanti Belgesi ve Servis Fişleri',
      'Ücret İadesi veya Ücretsiz Değişim Talebi'
    ],
    suggestedNotes: 'Ayıplı malın bedel iadesi veya ayıpsız misli ile değiştirilmesi talep edilsin.',
    aiPromptGuide: '6502 Sayılı Tüketicinin Korunması Hakkında Kanun m. 68 uyarınca Tüketici Hakem Heyeti Başvuru Dilekçesini hazırla.'
  },
  {
    id: 'ttk-thh-itiraz',
    title: 'THH Kararına İtiraz Dava Dilekçesi (Tüketici Mahkemesi)',
    shortTitle: 'THH Kararına İtiraz Davası',
    categoryId: 'ttk',
    lawRef: '6502 Sayılı Kanun m. 70',
    courtType: 'Tüketici Mahkemesi Hâkimliği',
    keyElements: [
      'Tüketici Hakem Heyeti Karar Tarihi ve Numarası',
      'Kararın Tebliğinden İtibaren 15 Günlük Dava Açma Süresi',
      'THH Kararının Usul ve Esasa Aykırılık Nedenleri',
      'THH Kararının İptali Talebi'
    ],
    suggestedNotes: 'THH kararının eksik incelemeyle verildiği belirtilerek iptali talep edilsin.',
    aiPromptGuide: '6502 Sayılı Kanun m. 70 uyarınca Tüketici Mahkemesinde açılacak THH Kararına İtiraz Dava Dilekçesini yaz.'
  },
  {
    id: 'ttk-ayipli-mal',
    title: 'Ayıplı Mal / Hizmet Kaynaklı Bedel İadesi ve Tazminat Dilekçesi',
    shortTitle: 'Ayıplı Mal & Bedel İadesi Davası',
    categoryId: 'ttk',
    lawRef: '6502 Sayılı Kanun m. 11, 15',
    courtType: 'Tüketici Mahkemesi Hâkimliği',
    keyElements: [
      'Satın Alınan Mal veya Hizmetteki Gizli/Açık Ayıplar',
      'Sözleşmeden Dönme ve Bedel İadesi Talebi',
      'Uğranılan Zararın Tazmini Talebi'
    ],
    suggestedNotes: 'Gizli ayıp nedeniyle sözleşmeden dönüldüğü ve ödenen bedelin faiziyle iadesi istensin.',
    aiPromptGuide: '6502 Sayılı Kanun m. 11 uyarınca Ayıplı Mal nedeniyle Sözleşmeden Dönme ve Bedel İadesi Dava Dilekçesini kaleme al.'
  },
  {
    id: 'ttk-cek-senet-iptali',
    title: 'Ticari Nitelikteki Çek / Senet İptali (Zayi) Dilekçesi',
    shortTitle: 'Zayi Çek / Senet İptali Davası',
    categoryId: 'ttk',
    lawRef: 'TTK m. 757',
    courtType: 'Asliye Ticaret Mahkemesi Başkanlığı',
    keyElements: [
      'Zayi Olan Çek / Senet Keşidecisi, Vadesi ve Bedeli',
      'Kayıp / Çalma / Yangın Vaka Açıklaması',
      'Ödeme Yasağı Kararı Verilmesi (İhtiyati Tedbir) Talebi',
      'Kıymetli Evrakın İptaline Karar Verilmesi Talebi'
    ],
    suggestedNotes: 'Çekin kaybolduğu, zayi nedeniyle acilen bankaya ödeme yasağı konulması ve iptal kararı verilmesi talep edilsin.',
    aiPromptGuide: 'Türk Ticaret Kanunu m. 757 uyarınca Zayi Nedenleriyle Çek/Bononun İptali ve Ödeme Yasağı Talepli Dava Dilekçesini kaleme al.'
  },
  {
    id: 'ttk-genel-kurul-iptali',
    title: 'Şirket Genel Kurul Kararının İptali Dava Dilekçesi',
    shortTitle: 'Genel Kurul Kararının İptali',
    categoryId: 'ttk',
    lawRef: 'TTK m. 445',
    courtType: 'Asliye Ticaret Mahkemesi Başkanlığı',
    keyElements: [
      'İptali İstenen Genel Kurul Karar Tarihi ve Maddeleri',
      '3 Aylık Dava Açma Süresi',
      'Kanuna, Ana Sözleşmeye ve Dürüstlük Kuralına Aykırılıklar',
      'Kararların İptali Talebi'
    ],
    suggestedNotes: 'Genel kurul kararının şirket ana sözleşmesine aykırı alındığı vurgulansın.',
    aiPromptGuide: 'TTK m. 445 vd. uyarınca Anonim/Limited Şirket Genel Kurul Kararının İptali Dava Dilekçesini oluştur.'
  },

  // -------------------------------------------------------------
  // 8. GAYRİMENKUL VE EŞYA HUKUKU
  // -------------------------------------------------------------
  {
    id: 'tbk-tahliye-davasi',
    title: 'Tahliye Dava Dilekçesi (İhtiyaç Sebebiyle / Tahliye Taahhütnamesi ile)',
    shortTitle: 'Kira Tahliye Davası',
    categoryId: 'tbk',
    lawRef: 'TBK m. 350, 352',
    courtType: 'Sulh Hukuk Mahkemesi Hâkimliği',
    keyElements: [
      'Kira Sözleşmesi Başlangıç Tarihi ve Taşınmaz Bilgileri',
      'Tahliye Sebebi (Gereksinim, İki Haklı İhtar, Tahliye Taahhüdü)',
      'İhtarname ve Sürelere Uyum Beyanı',
      'Kiralananın Tahliyesi Talebi'
    ],
    suggestedNotes: 'Yazılı tahliye taahhüdüne dayalı olarak veya konut ihtiyacı nedeniyle kiracının tahliyesine karar verilsin.',
    aiPromptGuide: 'Türk Borçlar Kanunu m. 350/352 uyarınca Sulh Hukuk Mahkemesinde açılacak Kiralananın Tahliyesi Dava Dilekçesini kaleme al.'
  },
  {
    id: 'tbk-kira-tespit',
    title: 'Kira Tespit / Kira Uyarlama Dava Dilekçesi',
    shortTitle: 'Kira Tespit & Uyarlama Davası',
    categoryId: 'tbk',
    lawRef: 'TBK m. 344',
    courtType: 'Sulh Hukuk Mahkemesi Hâkimliği',
    keyElements: [
      '5 Yıllık Sürenin Dolmuş Olması (Kira Tespiti İçin)',
      'Emsal Kira Bedelleri ve Hakkaniyet İncelemesi',
      'Kira Bedelinin Rayiç Değerlere Uyarlanarak Yeniden Tespiti Talebi'
    ],
    suggestedNotes: '5 yıllık sürenin dolduğu, emsal kira rayiçlerinin çok gerisinde kalındığı belirtilerek tespit sağlansın.',
    aiPromptGuide: 'TBK m. 344 uyarınca 5 yılı aşan kira ilişkisinde rayiç değerlere göre Kira Bedelinin Tespiti Dava Dilekçesini yaz.'
  },
  {
    id: 'tmk-tapu-iptal',
    title: 'Tapu İptali ve Tescil Dava Dilekçesi (Muris Muvazaası / Yolsuz Tescil / İnançlı İşlem)',
    shortTitle: 'Tapu İptali ve Tescil Davası',
    categoryId: 'tbk',
    lawRef: 'TMK m. 1025 & TBK',
    courtType: 'Asliye Hukuk Mahkemesi Hâkimliği',
    keyElements: [
      'Tapu Kayıt Bilgileri (İl, İlçe, Ada, Parsel)',
      'Hukuki Sebeb (Muris Muvazaası, Hile, Vekalet Görevinin Kötüye Kullanılması)',
      'Tapu Kaydına İhtiyati Tedbir Konulması Talebi',
      'Tapunun İptali ve Davacı Adına Tescili Talebi'
    ],
    suggestedNotes: 'Mirasbırakanın mal kaçırma kastıyla muvazaalı temlik yaptığı gerekçesiyle tapunun iptali ve tedbir konulması istensin.',
    aiPromptGuide: 'TMK m. 1025 uyarınca Muris Muvazaası veya Yolsuz Tescil nedeniyle Tapu İptali ve Tescil Dava Dilekçesini kaleme al.'
  },
  {
    id: 'tmk-izale-i-suyu',
    title: 'Ortaklığın Giderilmesi (İzale-i Şüyu) Dava Dilekçesi',
    shortTitle: 'Ortaklığın Giderilmesi (İzale-i Şüyu)',
    categoryId: 'tbk',
    lawRef: 'TMK m. 698',
    courtType: 'Sulh Hukuk Mahkemesi Hâkimliği',
    keyElements: [
      'Paylı Mülkiyet veya Elbirliği Mülkiyeti Konusu Taşınmazlar',
      'Paydaşlar Arasında Aynen Taksimin Mümkün Olmaması',
      'Aynen Taksim Mümkün Değilse Satış Yoluyla Ortaklığın Giderilmesi Talebi'
    ],
    suggestedNotes: 'Paydaşlar arasında anlaşma sağlanamadığı için taşınmazın genel satış yoluyla ortaklığının giderilmesi talep edilsin.',
    aiPromptGuide: 'TMK m. 698 uyarınca elbirliği/paylı mülkiyetteki taşınmazların Satış Yoluyla Ortaklığının Giderilmesi Dava Dilekçesini kaleme al.'
  },
  {
    id: 'tbk-ecrimisil',
    title: 'Müdahalenin Men\'i ve Ecrimisil Dava Dilekçesi',
    shortTitle: 'Müdahalenin Men\'i & Ecrimisil',
    categoryId: 'tbk',
    lawRef: 'TMK m. 683, 995',
    courtType: 'Asliye Hukuk Mahkemesi Hâkimliği',
    keyElements: [
      'Taşınmaza Hak Dışı Haksız El Atma / Fuzuli Şagal',
      'İntifadan Men İhtarnamesi',
      'Geçmiş 5 Yıllık Haksız İşgal Tazminatı (Ecrimisil) Miktarı',
      'Müdahalenin Önlenmesi ve Ecrimisil Ödenmesi Talebi'
    ],
    suggestedNotes: 'Davalanın haksız işgalci olduğu belirtilerek haksız el atmanın önlenmesi ve 5 yıllık ecrimisil bedeli istensin.',
    aiPromptGuide: 'TMK m. 683 ve m. 995 hükümleri gereğince Müdahalenin Men\'i (El Atmanın Önlenmesi) ve Ecrimisil Dava Dilekçesini yaz.'
  },

  // -------------------------------------------------------------
  // 9. ANAYASA MAHKEMESİ VE ULUSLARARASI YARGI
  // -------------------------------------------------------------
  {
    id: 'aym-bireysel-basvuru',
    title: 'Anayasa Mahkemesi (AYM) Bireysel Başvuru Formu ve Beyan Dilekçesi',
    shortTitle: 'AYM Bireysel Başvuru Formu',
    categoryId: 'aym',
    lawRef: '6216 Sayılı Kanun m. 45',
    courtType: 'Anayasa Mahkemesi Başkanlığı',
    keyElements: [
      'Olağan Kanun Yollarının Tüketildiği Tarih (Nihai Karar Tebliği)',
      '1 Aylık Hak Düşürücü Süreye Uyulduğu',
      'İhlal Edilen Anayasal Haklar (Adil Yargılanma, Mülkiyet, Kişi Hürriyeti vs.)',
      'Yeniden Yargılama Kararı Verilmesi ve Tazminat Talebi'
    ],
    suggestedNotes: 'Adil yargılanma hakkı ve makul sürede yargılanma hakkının ihlal edildiği belirtilerek tazminat ve yeniden yargılama talep edilsin.',
    aiPromptGuide: '6216 Sayılı Kanun m. 45 uyarınca Anayasa Mahkemesine sunulacak Bireysel Başvuru Formunu ve Hak İhlali Dilekçesini kaleme al.'
  },
  {
    id: 'aihm-basvuru',
    title: 'Avrupa İnsan Hakları Mahkemesi (AİHM) Başvuru Formu ve Ekleri',
    shortTitle: 'AİHM Başvuru Formu',
    categoryId: 'aym',
    lawRef: 'AİHS m. 34',
    courtType: 'European Court of Human Rights (Strasbourg)',
    keyElements: [
      'İç Hukuk Yollarının (AYM Dahil) Tüketildiği Tarih',
      '4 Aylık Başvuru Süresi',
      'İhlal Edilen AİHS Maddeleri (Madde 6 Adil Yargılanma, Madde 8 Özel Hayat vs.)',
      'Adil Tatmin (Tazminat) Talebi'
    ],
    suggestedNotes: 'AİHS m. 6 uyarınca adil yargılanma hakkı ihlal edildiği gerekçesiyle AİHM başvuru formu hazırlansın.',
    aiPromptGuide: 'Avrupa İnsan Hakları Sözleşmesi (AİHS) m. 34 hükümleri gereğince Strasbourg AİHM Başvuru Metnini kaleme al.'
  },

  // -------------------------------------------------------------
  // 10. GENEL USUL, KALEM VE DURUŞMA TALEPLERİ
  // -------------------------------------------------------------
  {
    id: 'usul-mazeret',
    title: 'Mazeret Bildirim Dilekçesi (Mesleki mazeret / Duruşma çakışması)',
    shortTitle: 'Duruşma Mazeret Dilekçesi',
    categoryId: 'usul',
    lawRef: 'HMK m. 150 / CMK',
    courtType: 'Davaya Bakmakta Olan Mahkeme Hâkimliği',
    keyElements: [
      'Mazeret Gerekçesi (Çakışan Duruşma / Sağlık Mazereti)',
      'Çakışan Diğer Mahkeme Duruşma Zabtı / Sağlık Raporu Eki',
      'Mazeretin Kabulü ve Duruşma Gününün UYAP Meslektaşça Öğrenilmesine Karar Verilmesi Talebi'
    ],
    suggestedNotes: 'Aynı saatteki diğer mahkeme duruşması sebebiyle mazeretimin kabulü ve yeni duruşma gününün UYAP\'tan öğrenilmesine karar verilsin.',
    aiPromptGuide: 'HMK/CMK uyarınca mahkemeye sunulacak mesleki duruşma mazeret bildirim dilekçesini kaleme al.'
  },
  {
    id: 'usul-sure-tutum',
    title: 'Süre Tutum (Müddeti Muhafaza) Dilekçesi',
    shortTitle: 'Süre Tutum Dilekçesi',
    categoryId: 'usul',
    lawRef: 'HMK / CMK',
    courtType: 'Kararı Veren Mahkeme Hâkimliği',
    keyElements: [
      'Tefhim Edilen Kısa Karar Numarası',
      'Gerekçeli Karar Tebliğ Edilene Kadar Kanun Yolu Başvuru Süresinin Tutulması Talebi'
    ],
    suggestedNotes: 'Gerekçeli kararın tarafımıza tebliğinden itibaren ayrıntılı istinaf/temyiz dilekçesi verilecektir, süre tutulmaktadır.',
    aiPromptGuide: 'Kısa kararın tefhimi üzerine gerekçeli karar tebliğ edilinceye kadar kanun yolu başvuru süresini koruyan Süre Tutum Dilekçesini yaz.'
  },
  {
    id: 'usul-azil-istifa',
    title: 'Vekillikten Çekilme (İstifa) / Vekillikten Azil Bildirim Dilekçesi',
    shortTitle: 'Vekillikten Çekilme / Azil',
    categoryId: 'usul',
    lawRef: 'Avukatlık Kanunu m. 41',
    courtType: 'Davaya Bakmakta Olan Mahkeme Hâkimliği',
    keyElements: [
      'Vekillikten Çekilme (İstifa) İradesi',
      'Avukatlık Kanunu m. 41 Uyarınca 2 Haftalık Sorumluluk Süresi',
      'İstifa Dilekçesinin Asile Tebliği Talebi'
    ],
    suggestedNotes: 'Görülen lüzum üzerine vekillik görevinden çekilindiği, dilekçenin asile tebliği talep edilsin.',
    aiPromptGuide: 'Avukatlık Kanunu m. 41 uyarınca mahkemeye sunulacak Vekillikten Çekilme (İstifa) Bildirim Dilekçesini kaleme al.'
  },
  {
    id: 'usul-tebligat-yenileme',
    title: 'Tebligat Yenileme / Mernis Şerhli Tebligat Talebi',
    shortTitle: 'Mernis Şerhli Tebligat Talebi',
    categoryId: 'usul',
    lawRef: 'Tebligat Kanunu m. 21/2',
    courtType: 'İlgili Mahkeme / İcra Dairesi',
    keyElements: [
      'Bila İkmal İade Dönüşen Tebligat Mazbatası',
      'Tebligat Kanunu m. 21/2 Uyarınca Adrese Dayalı Nüfus Kayıt (MERNİS) Adresine Şerhli Tebliğ Çıkarılması Talebi'
    ],
    suggestedNotes: 'Tarafın MERNİS adresine Tebligat Kanunu 21/2 maddesine göre mavi şerhli tebligat çıkarılsın.',
    aiPromptGuide: 'Tebligat Kanunu m. 21/2 uyarınca MERNİS adresine şerhli tebligat çıkarılması talepli dilekçeyi kaleme al.'
  },
  {
    id: 'usul-dosya-inceleme',
    title: 'Dosya İnceleme ve Suret Alma Talep Dilekçesi',
    shortTitle: 'Dosya İnceleme & Suret Talebi',
    categoryId: 'usul',
    lawRef: 'HMK m. 161 & Avukatlık Kanunu',
    courtType: 'İlgili Mahkeme / Savcılık Kalemi',
    keyElements: [
      'Avukatlık Kanunu m. 46 Uyarınca Dosyayı İnceleme Hakkı',
      'Vekaletname veya Yetki Belgesi İbrazı',
      'Dosyadaki Belgelerden Onaylı Suret Verilmesi Talebi'
    ],
    suggestedNotes: 'Dosyanın tetkik edilmesine ve onaylı bir suretinin tarafımıza verilmesine izin verilmesi talep edilsin.',
    aiPromptGuide: 'HMK m. 161 ve Avukatlık Kanunu m. 46 gereğince Dosya İnceleme ve Onaylı Suret Alma Talep Dilekçesini kaleme al.'
  },
  {
    id: 'usul-gerekceli-karar-teblig',
    title: 'Gerekçeli Kararın Tebliği Talebi',
    shortTitle: 'Gerekçeli Karar Tebliğ Talebi',
    categoryId: 'usul',
    lawRef: 'HMK / CMK',
    courtType: 'Kararı Veren Mahkeme Hâkimliği',
    keyElements: [
      'Mahkeme Karar Numarası',
      'Kanun Yolu Sürecinin Başlatılabilmesi İçin Gerekçeli Kararın Karşı Tarafa / Tarafımıza Tebliğ Edilmesi Talebi'
    ],
    suggestedNotes: 'Gerekçeli kararın taraflara tebliğe çıkarılması talep edilsin.',
    aiPromptGuide: 'Mahkemece verilen kararın gerekçesinin kaleme alınarak taraflara tebliğe çıkarılması talepli kalem dilekçesini yaz.'
  }
];

// Helper functions for Petition Management Controller
export function getPetitionById(id: string): PetitionTypeItem | undefined {
  return PETITION_TYPES_CATALOG.find(p => p.id === id || p.title === id);
}

export function getPetitionsByCategory(categoryId: string): PetitionTypeItem[] {
  if (!categoryId || categoryId === 'all') return PETITION_TYPES_CATALOG;
  return PETITION_TYPES_CATALOG.filter(p => p.categoryId === categoryId);
}

export function searchPetitions(query: string): PetitionTypeItem[] {
  if (!query || !query.trim()) return PETITION_TYPES_CATALOG;
  const q = query.toLowerCase().trim();
  return PETITION_TYPES_CATALOG.filter(p => 
    p.title.toLowerCase().includes(q) ||
    p.shortTitle.toLowerCase().includes(q) ||
    p.lawRef.toLowerCase().includes(q) ||
    p.courtType.toLowerCase().includes(q) ||
    p.keyElements.some(el => el.toLowerCase().includes(q))
  );
}

export function buildPetitionPromptContext(petitionIdOrTitle: string, userNotes: string): {
  systemPromptAddon: string;
  enhancedNotes: string;
  selectedItem?: PetitionTypeItem;
} {
  const item = getPetitionById(petitionIdOrTitle);
  if (!item) {
    return {
      systemPromptAddon: '',
      enhancedNotes: userNotes
    };
  }

  const isCmk = item.categoryId === 'cmk';
  const cmkAddon = isCmk ? `
[CEZA MUHAKEMESİ HUKUKU (CMK & TCK) KESİN KURALLARI]:
1. Soruşturma aşamasında kişi "Şüpheli", iddianamenin kabulü / tensip zaptından sonraki kovuşturma aşamasında "Sanık", kesinleşen hüküm sonrası "Hükümlü" olarak adlandırılır.
2. Mahkemede dava açıldıktan sonra dosya asla "iddianame aşamasında" veya "soruşturma evresinde" olamaz; dosya "Kovuşturma Evresi"ndedir.
3. İstinabe / talimat evrakları kovuşturma safhasında bir delil toplama işlemidir.
` : '';

  const systemPromptAddon = `
${cmkAddon}
DİLEKÇE TÜRÜ ÖZEL HUKUKİ TALİMATI:
Seçilen Dilekçe Türü: ${item.title} (${item.lawRef})
Hedef Görevli Makam: ${item.courtType}
Zorunlu Hukuki Unsurlar & Kontrol Listesi:
${item.keyElements.map(el => `- ${el}`).join('\n')}

DİLEKÇE OLUŞTURMA REHBERİ:
${item.aiPromptGuide}
`.trim();

  const enhancedNotes = `
[Dilekçe Türü: ${item.title} - Dayanak: ${item.lawRef}]
[Görevli Makam: ${item.courtType}]
Zorunlu Unsurlar: ${item.keyElements.join(', ')}
${userNotes ? `Avukat Notları & Ek Talepler:\n${userNotes}` : ''}
`.trim();

  return {
    systemPromptAddon,
    enhancedNotes,
    selectedItem: item
  };
}

