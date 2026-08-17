/**
 * Ceza Muhakemesi Hukuku (CMK & TCK) Bilgi Bankası & Safahat Kılavuzu
 * AyrisLegal Dava Analizi, Safahat Tespiti, Evrak Sınıflandırma ve Dilekçe Motoru için temel referans.
 */

export interface CriminalDocumentDef {
  name: string;
  stage: 'Soruşturma' | 'Kovuşturma - Tensip & Hazırlık' | 'Kovuşturma - Duruşma & Tahkikat' | 'Kovuşturma - Mütalaa' | 'Kovuşturma - Karar & Gerekçe' | 'Kanun Yolu' | 'İnfaz';
  description: string;
  effect: string;
}

export const CRIMINAL_DOCUMENTS_CATALOG: CriminalDocumentDef[] = [
  {
    name: 'Tensip Zaptı / Tensip Tutanağı',
    stage: 'Kovuşturma - Tensip & Hazırlık',
    description: 'İddianame mahkemece kabul edildikten sonra ilk duruşmaya kadar yapılacak işlemleri ve duruşma gününü belirleyen resmi yol haritası.',
    effect: 'Kovuşturma evresini resmen başlatır. Dosya esas numarası alır ve kişi sanık sıfatını kazanır.'
  },
  {
    name: 'Çağrı Kâğıdı (Davetiye)',
    stage: 'Kovuşturma - Tensip & Hazırlık',
    description: 'Sanık, katılan, müşteki, tanık ve bilirkişilerin duruşmada hazır bulunmaları için tebliğ edilen resmi çağrı.',
    effect: 'Tebliğ tarihinden itibaren yasal süreleri ve duruşma iştirak yükümlülüğünü doğurur.'
  },
  {
    name: 'Zorla Getirme Kararı (Müzekkeresi)',
    stage: 'Kovuşturma - Duruşma & Tahkikat',
    description: 'Davetiye tebliğine rağmen mazeretsiz gelmeyen kişilerin kolluk marifetiyle mahkemeye getirilmesi.',
    effect: 'Duruşmada hazır bulundurma tedbiridir.'
  },
  {
    name: 'Yakalama Emri',
    stage: 'Kovuşturma - Duruşma & Tahkikat',
    description: 'Kaçak, adresi meçhul veya duruşmadan kaçan sanığın görüldüğü yerde yakalanması için verilen adli karar.',
    effect: 'CMK m. 98 uyarınca yakalama ve mahkeme önüne çıkarma sonucunu doğurur.'
  },
  {
    name: 'İstinabe Müzekkeresi / Talimat Yazısı',
    stage: 'Kovuşturma - Duruşma & Tahkikat',
    description: 'Mahkemenin yargı çevresi dışındaki sanık, tanık veya mağdurun ifadesinin o yer mahkemesince alınması talimatı.',
    effect: 'Kovuşturma aşamasında delil toplama işlemidir. Talimat ikmal edildiğinde dosya esas mahkemesine döner.'
  },
  {
    name: 'Duruşma Tutanağı (Celse Zaptı)',
    stage: 'Kovuşturma - Duruşma & Tahkikat',
    description: 'Duruşmadaki tüm beyanların, savunmaların, tanık anlatımlarının ve mahkeme ara kararlarının harfiyen kaydı.',
    effect: 'Mahkemenin resmi duruşma sicilidir ve bir sonraki celseye kadar yapılacak ara kararları belirler.'
  },
  {
    name: 'Müzekkere',
    stage: 'Kovuşturma - Duruşma & Tahkikat',
    description: 'Kamu kurumları veya özel tüzel kişilerden bilgi, belge ve rapor talep edilen resmi mahkeme yazısı.',
    effect: 'Maddi gerçeğin ortaya çıkarılması için delil ikamesini sağlar.'
  },
  {
    name: 'Bilirkişi Görevlendirme ve Tevdi Tutanağı',
    stage: 'Kovuşturma - Duruşma & Tahkikat',
    description: 'Teknik veya uzmanlık gerektiren konularda bilirkişi görevlendirilmesi ve rapor teslim süresi.',
    effect: 'Uzman incelemesi sürecini başlatır.'
  },
  {
    name: 'Keşif Tutanağı',
    stage: 'Kovuşturma - Duruşma & Tahkikat',
    description: 'Olay yerinde hâkim/heyetçe yapılan inceleme ve gözlem tutanağı.',
    effect: 'Doğrudan delil niteliğindedir.'
  },
  {
    name: 'Ara Karar',
    stage: 'Kovuşturma - Duruşma & Tahkikat',
    description: 'Yargılama sürerken davanın esasına girmeyen delil ve usul kararları.',
    effect: 'Bir sonraki duruşmaya kadar taraflara ve mahkeme kalemine ödev yükler.'
  },
  {
    name: 'Esas Hakkında Mütalaa',
    stage: 'Kovuşturma - Mütalaa',
    description: 'Delillerin toplanması bittikten sonra savcılığın sanığın cezalandırılması veya beraati yönündeki nihai görüşü.',
    effect: 'Esas hakkında son savunmaların yapılmasına zemin hazırlar.'
  },
  {
    name: 'Kısa Karar (Hüküm Özeti)',
    stage: 'Kovuşturma - Karar & Gerekçe',
    description: 'Duruşma sonunda tarafların yüzüne karşı tefhim edilen nihai sonuç.',
    effect: 'Yargılamayı ilk derece mahkemesinde sonlandırır.'
  },
  {
    name: 'Gerekçeli Karar',
    stage: 'Kovuşturma - Karar & Gerekçe',
    description: 'Hükmün hukuki, maddi ve delil gerekçelerini açıklayan resmi mahkeme ilamı.',
    effect: 'Tebliği ile birlikte İstinaf kanun yolu süresini (CMK m. 273) başlatır.'
  },
  {
    name: 'Kesinleşme Şerhi',
    stage: 'İnfaz',
    description: 'Hükmün yasal sürede kanun yoluna başvurulmayarak veya onanarak kesinleştiğini onaylayan mühür/yazı.',
    effect: 'Hükmü kesinleştirir ve infaz kabiliyeti kazandırır.'
  },
  {
    name: 'İnfaz Müzekkeresi',
    stage: 'İnfaz',
    description: 'Kesinleşen cezanın infazı için Cumhuriyet Başsavcılığı İnfaz Bürosu\'na gönderilen resmi yazı.',
    effect: 'Cezanın infaz sürecini başlatır.'
  }
];

export interface CriminalVerdictDef {
  name: string;
  category: 'Esastan Çözen Hüküm' | 'Usule İlişkin Karar' | 'Özel Hüküm';
  legalBasis: string;
  description: string;
  conditions: string[];
}

export const CRIMINAL_VERDICTS_CATALOG: CriminalVerdictDef[] = [
  {
    name: 'Beraat Kararı',
    category: 'Esastan Çözen Hüküm',
    legalBasis: 'CMK m. 223/2',
    description: 'Sanığın suçsuz olduğunu veya cezalandırılamayacağını belirten aklanma kararı.',
    conditions: [
      'Fiilin kanunda suç olarak tanımlanmamış olması',
      'Suçun sanık tarafından işlenmediğinin sabit olması',
      'Kast veya taksirin bulunmaması',
      'Hukuka uygunluk nedeninin bulunması (meşru müdafaa vb.)',
      'Suçun sanık tarafından işlendiğinin sabit olmaması (şüpheden sanık yararlanır)'
    ]
  },
  {
    name: 'Mahkûmiyet Kararı',
    category: 'Esastan Çözen Hüküm',
    legalBasis: 'CMK m. 223/5',
    description: 'Sanığın suçu işlediğinin kesin olarak sabit olması hali; Hapis ve/veya Adli Para Cezası.',
    conditions: ['Suçun işlendiğinin sabit olması', 'Seçenek yaptırımlara çevirme veya erteleme']
  },
  {
    name: 'Ceza Verilmesine Yer Olmadığı Kararı (CYOK)',
    category: 'Esastan Çözen Hüküm',
    legalBasis: 'CMK m. 223/3,4',
    description: 'Fiil suç olsa dahi kusursuzluk veya cezasızlık halleri sebebiyle ceza tayin edilmemesi.',
    conditions: [
      'Yaş küçüklüğü, akıl hastalığı, sağır-dilsizlik, zorunluluk hali, cebir/tehdit, kaçınılmaz hata',
      'Etkin pişmanlık, şahsi cezasızlık sebebi, karşılıklı hakaret, haksızlık içeriğinin azlığı'
    ]
  },
  {
    name: 'Güvenlik Tedbirine Hükmedilmesi',
    category: 'Esastan Çözen Hüküm',
    legalBasis: 'CMK m. 223/6',
    description: 'Ceza verilmese dahi veya cezanın yanında uygulanan yaptırımlar (tedavi, müsadere vb.).',
    conditions: ['Akıl hastalarına özgü tedavi', 'Müsadere', 'Hak yoksunlukları']
  },
  {
    name: 'Davanın Düşmesi Kararı',
    category: 'Esastan Çözen Hüküm',
    legalBasis: 'CMK m. 223/8',
    description: 'Kovuşturma şartlarının gerçekleşmemesi veya engellerin ortaya çıkması hali.',
    conditions: ['Sanığın ölümü', 'Dava zamanaşımı', 'Genel af', 'Şikâyetten vazgeçme', 'Uzlaşma']
  },
  {
    name: 'Davanın Reddi Kararı',
    category: 'Esastan Çözen Hüküm',
    legalBasis: 'CMK m. 223/7',
    description: 'Aynı fiil nedeniyle kesin hüküm veya derdest dava bulunması (Non bis in idem).',
    conditions: ['Önceden verilmiş kesin hüküm', 'Derdest ceza davası']
  },
  {
    name: 'Görevsizlik Kararı',
    category: 'Usule İlişkin Karar',
    legalBasis: 'CMK m. 4, 5',
    description: 'Dosyanın görevli mahkemeye (Asliye Ceza / Ağır Ceza) gönderilmesi kararı.',
    conditions: ['Mahkemenin madde yönünden görevsiz olması']
  },
  {
    name: 'Yetkisizlik Kararı',
    category: 'Usule İlişkin Karar',
    legalBasis: 'CMK m. 12 vd.',
    description: 'Suçun işlendiği yer bakımından yetkili mahkemeye gönderme kararı.',
    conditions: ['Coğrafi yetkisizlik']
  },
  {
    name: 'Durma Kararı',
    category: 'Usule İlişkin Karar',
    legalBasis: 'CMK m. 223/8',
    description: 'İzin, dokunulmazlık veya bekletici mesele şartının beklenmesi.',
    conditions: ['Kovuşturma izni beklenmesi', 'Bekletici mesele']
  },
  {
    name: 'Hükmün Açıklanmasının Geri Bırakılması (HAGB)',
    category: 'Özel Hüküm',
    legalBasis: 'CMK m. 231',
    description: '2 yıl veya altı cezalarda 5 yıl denetim süresi; süre sonunda suç işlenmezse davanın düşürülmesi.',
    conditions: ['2 yıl veya daha az hapis / adli para cezası', '5 yıllık denetim süresi', 'Sicilde görünmez']
  }
];

/**
 * Yapay Zeka Sistem İstemi için Ceza Muhakemesi Hukuku Kuralları
 */
export function buildCriminalProcedureSystemPrompt(): string {
  return `
[CEZA MUHAKEMESİ HUKUKU (CMK & TCK) KESİN KURALLARI]:
1. SORUŞTURMA EVRESİ: Suç şüphesinin savcılıkça öğrenilmesinden iddianamenin kabulü veya KYOK kararına kadar sürer. Bu aşamada kişi "Şüpheli"dir.
2. KOVUŞTURMA EVRESİ: İddianamenin mahkemece kabulü ve Tensip Zaptı düzenlenmesi ile başlar. Mahkemede dava açıldıktan ve esas numarası aldıktan sonra dosya ASLA "iddianame aşamasında" veya "soruşturma evresinde" olarak nitelendirilemez! Bu aşamada kişi "Sanık"tır.
3. KOVUŞTURMA SAFHALARI:
   - Tensip & Duruşmaya Hazırlık: Tensip zaptı düzenlenmiş, ilk duruşma günü ve ön müzekkereler bekleniyor.
   - Duruşma & Delil Toplama (Tahkikat): Sanık savunması, tanık beyanları, istinabe/talimat mahkemesi işlemleri, bilirkişi raporu toplanıyor.
   - Esas Hakkında Mütalaa: Deliller toplanmış, savcılık nihai mütalaasını sunmuş/sunacaktır.
   - Karar & Gerekçeli Karar: Kısa karar tefhim edilmiş veya gerekçeli karar yazımındadır.
   - Kanun Yolu (İstinaf / Temyiz): BAM veya Yargıtay incelemesindedir.
   - İnfaz: Kesinleşme şerhi sonrası İnfaz Bürosu işlemindedir.
4. HÜKÜM VE KARAR TÜRLERİ (CMK m. 223):
   - Beraat, Mahkûmiyet, Ceza Verilmesine Yer Olmadığı (CYOK), Güvenlik Tedbiri, Düşme, Red, Görevsizlik, Yetkisizlik, Durma ve HAGB (CMK m. 231).
5. TALİMAT (İSTİNABE) İŞLEMLERİ: Başka mahkemeye yazılan talimat evrakları soruşturma işlemi değildir; kovuşturma aşamasında bir delil/ifade toplama işlemidir.
`;
}

