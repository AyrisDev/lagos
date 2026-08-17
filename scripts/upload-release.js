// Uploads electron-builder's dist/ output to Supabase Storage, matching the
// `publish.url` paths configured in package.json (build.mac / build.win) —
// bu, electron-updater'ın KENDİ (latest.yml tabanlı) indirme kontrolünün
// okuduğu dosyaları besler.
//
// Bu tek başına yetmiyor: updateService.js'in checkForUpdates() fonksiyonu
// önce ayrı bir kapı olan app_releases tablosunu (bkz. sql/12_app_releases.sql,
// supabase/functions/app-update) soruyor — o tabloda yeni sürüme dair bir satır
// olmadan uygulama "güncelleme var" demiyor, dosyalar Storage'da dursa bile.
// Bu yüzden bu script dosyaları yükledikten sonra o satırı da ekliyor.
//
// Usage: node scripts/upload-release.js <mac|windows> [--mandatory] [--notes="a;b;c"] [--min-version=1.0.0]
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const tus = require('tus-js-client');
const { version: APP_VERSION } = require('../package.json');

// .env.release'i kendi yüklüyoruz (release.js tarafından spawn edildiğinde zaten
// process.env'de olabilir — o zaman try/catch sessizce geçer). Standalone
// çalıştırıldığında da --env-file flag'ine gerek kalmasın diye.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    process.loadEnvFile(path.join(__dirname, '..', '.env.release'));
  } catch {
    // dosya yoksa aşağıdaki kontrol zaten anlaşılır hata verecek
  }
}

const BUCKET = 'app-releases';
const DIST_DIR = path.join(__dirname, '..', 'dist');
const DB_PLATFORM = { mac: 'darwin', windows: 'win32' };
// Projenin geri kalanındaki (main.js, updateService.js) aynı fallback deseni —
// .env'de NEXT_PUBLIC_SUPABASE_URL tanımlı değilse bile script çalışsın.
const DEFAULT_SUPABASE_URL = 'https://supa.ayris.tech';

const CONTENT_TYPES = {
  '.dmg': 'application/x-apple-diskimage',
  '.zip': 'application/zip',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.yml': 'application/x-yaml',
  '.blockmap': 'application/octet-stream',
};

// Sadece BU sürüme ait dosyaları yakala — dist/ eski build kalıntılarıyla
// dolu olabilir (eski ürün adı, eski sürüm numaraları). release.js zaten
// build öncesi dist/'i temizliyor ama script tek başına da çalıştırılabildiği
// için burada da ikinci bir güvenlik katmanı var.
const PLATFORM_FILTERS = {
  mac: (name) =>
    name === 'latest-mac.yml' ||
    ((/\.(dmg|zip)$/.test(name) || name.endsWith('.blockmap')) && name.includes(APP_VERSION)),
  windows: (name) =>
    name === 'latest.yml' ||
    ((/\.exe$/.test(name) || name.endsWith('.blockmap')) && name.includes(APP_VERSION)),
};

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

// Basit tek-parça POST (@supabase/supabase-js'in .storage.upload()'ı) büyük
// installer dosyalarında (200-300+ MB) self-hosted Kong gateway'de zaman
// aşımına uğruyordu (Gateway Timeout / status 499). Supabase'in resumable
// (TUS) protokolü aynı isteği 6MB'lık parçalara bölüp gönderiyor — hem
// timeout riskini ortadan kaldırıyor hem de kesilirse kaldığı yerden devam
// edebiliyor (findPreviousUploads / resumeFromPreviousUpload).
function uploadViaTus({ supabaseUrl, serviceRoleKey, filePath, fileName, objectName }) {
  return new Promise((resolve, reject) => {
    const ext = fileName.endsWith('.blockmap') ? '.blockmap' : path.extname(fileName);
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    const fileSize = fs.statSync(filePath).size;
    const fileStream = fs.createReadStream(filePath);

    const upload = new tus.Upload(fileStream, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      uploadSize: fileSize,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName,
        contentType,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // Supabase resumable upload sabit gereksinimi: 6MB
      onError: reject,
      onSuccess: resolve,
    });

    upload.start();
  });
}

function parseFlags(argv) {
  const flags = { mandatory: false, notes: [], minVersion: '0.0.0' };
  for (const arg of argv) {
    if (arg === '--mandatory') flags.mandatory = true;
    else if (arg.startsWith('--notes=')) flags.notes = arg.slice('--notes='.length).split(';').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--min-version=')) flags.minVersion = arg.slice('--min-version='.length);
  }
  return flags;
}

async function main() {
  const platformArg = (process.argv[2] || '').toLowerCase();
  const platform = platformArg === 'win' ? 'windows' : platformArg;
  const flags = parseFlags(process.argv.slice(3));

  if (!PLATFORM_FILTERS[platform]) {
    fail(`Kullanım: node scripts/upload-release.js <mac|windows> [--mandatory] [--notes="a;b"] [--min-version=1.0.0]  (aldığım: "${process.argv[2] || ''}")`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    fail(
      'SUPABASE_SERVICE_ROLE_KEY tanımlı değil.\n' +
      '  1) .env.release dosyası oluşturun (bkz. .env.release.example)\n' +
      '  2) Supabase dashboard > Project Settings > API > service_role key\'i içine yapıştırın\n' +
      '  3) node scripts/upload-release.js ' + platform + ' ile çalıştırın'
    );
  }

  if (!fs.existsSync(DIST_DIR)) {
    fail(`dist/ klasörü bulunamadı. Önce build alın: npm run build:${platform === 'windows' ? 'win' : 'mac'}`);
  }

  const files = fs
    .readdirSync(DIST_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && PLATFORM_FILTERS[platform](entry.name))
    .map((entry) => entry.name);

  if (files.length === 0) {
    fail(`dist/ içinde ${platform} için yüklenecek dosya bulunamadı. Önce build alın: npm run build:${platform === 'windows' ? 'win' : 'mac'}`);
  }

  console.log(`\n${platform} için ${files.length} dosya bulundu:`);
  files.forEach((f) => console.log(`  - ${f}`));
  console.log(`\nHedef: ${supabaseUrl}/storage/v1/object/public/${BUCKET}/${platform}/\n`);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  let hadError = false;

  for (const fileName of files) {
    const filePath = path.join(DIST_DIR, fileName);
    const sizeMB = fs.statSync(filePath).size / 1024 / 1024;
    process.stdout.write(`  yükleniyor: ${fileName} (${sizeMB.toFixed(1)} MB) `);
    try {
      await uploadViaTus({ supabaseUrl, serviceRoleKey, filePath, fileName, objectName: `${platform}/${fileName}` });
      console.log('— tamam');
    } catch (err) {
      hadError = true;
      console.log('— HATA');
      console.error(`    ${err.message || err}`);
    }
  }

  if (hadError) {
    fail('Bazı dosyalar yüklenemedi — yukarıdaki hataları kontrol edin (muhtemelen bucket yok ya da service_role key yanlış).');
  }

  console.log(`\n  Dosyalar Storage'a yüklendi. Şimdi app_releases tablosuna satır ekleniyor (uygulamanın "güncelleme var" demesini sağlayan asıl kapı)...\n`);

  // "Ana" installer'ı download_url/sha256 için referans alıyoruz — bu iki alan
  // Edge Function tarafından client'a hiç dönülmüyor (sadece version/mandatory/
  // release_notes dönüyor), yani gerçek indirme akışını etkilemiyorlar, salt
  // kayıt amaçlı. mac'te iki mimari (x64+arm64) olduğu için electron-updater'ın
  // asıl okuduğu latest-mac.yml'i referans alıyoruz; windows'ta tek installer var.
  const primaryFile = platform === 'mac'
    ? 'latest-mac.yml'
    : files.find((f) => f.endsWith('.exe')) || 'latest.yml';
  const primaryBuffer = fs.readFileSync(path.join(DIST_DIR, primaryFile));
  const sha256 = crypto.createHash('sha256').update(primaryBuffer).digest('hex');
  const downloadUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${platform}/${primaryFile}`;

  const row = {
    platform: DB_PLATFORM[platform],
    version: APP_VERSION,
    minimum_version: flags.minVersion,
    mandatory: flags.mandatory,
    release_notes: flags.notes,
    sha256,
    download_url: downloadUrl,
    published_at: new Date().toISOString(),
  };

  const { error: dbError } = await supabase
    .from('app_releases')
    .upsert(row, { onConflict: 'platform,version' });

  if (dbError) {
    fail(
      `Dosyalar yüklendi ama app_releases satırı eklenemedi: ${dbError.message}\n` +
      `  Uygulama hâlâ eski sürümü "güncel" sanacak. Tabloyu ve service_role izinlerini kontrol edin.`
    );
  }

  console.log(`  app_releases: ${row.platform} / ${row.version}${row.mandatory ? ' (ZORUNLU)' : ''} eklendi.`);
  if (row.release_notes.length) console.log(`  Notlar: ${row.release_notes.join(' · ')}`);

  console.log(`\n✓ ${platform} sürümü (v${APP_VERSION}) yayınlandı — mevcut kullanıcılar bir sonraki kontrolde görecek.\n`);
}

main().catch((err) => fail(err.stack || String(err)));
