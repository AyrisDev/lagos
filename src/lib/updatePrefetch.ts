'use client';

// Lisans doğrulaması (LicenseGate) ile güncelleme kontrolü (UpdateGate) iki
// ayrı, birbirinden bağımsız network isteğiydi ama UpdateGate LicenseGate'in
// İÇİNDE mount olduğu için art arda gidiyorlardı — açılışta iki round-trip
// üst üste bekleniyordu. Bu modül güncelleme isteğini LicenseGate mount olur
// olmaz (lisans sonucunu beklemeden) ateşliyor; UpdateGate mount olduğunda
// zaten devam eden/tamamlanmış bu isteği tekrar başlatmadan kullanıyor.
//
// PRD'nin "License Valid → Update Check" sırası bozulmuyor — sadece hangi
// noktada güncelleme UI'ının GÖSTERİLECEĞİ/indirmenin BAŞLAYACAĞI hâlâ lisans
// geçerli olana kadar bekliyor (UpdateGate zaten sadece o zaman mount oluyor).
// Değişen tek şey: ağ isteğinin ne zaman gönderildiği.

interface UpdateCheckResult {
  checked: boolean;
  dev?: boolean;
  networkError?: boolean;
  updateAvailable?: boolean;
  version?: string | null;
  mandatory?: boolean;
  releaseNotes?: string[];
}

interface UpdateElectronApi {
  updateCheck?: () => Promise<UpdateCheckResult>;
}

let inFlight: Promise<UpdateCheckResult> | null = null;

export function startOrGetUpdateCheck(): Promise<UpdateCheckResult> {
  if (inFlight) return inFlight;
  const api = (window as unknown as { electron?: UpdateElectronApi }).electron;
  inFlight = api?.updateCheck ? api.updateCheck() : Promise.resolve({ checked: false });
  return inFlight;
}
