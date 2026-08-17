// Tek komutla sürüm yayınlama: package.json'daki patch versiyonu otomatik
// artırır, mac (Intel + Apple Silicon tek `electron-builder --mac` çağrısında
// zaten ikisini birden üretiyor) ve windows'u build alır, ikisini de
// Supabase Storage'a yükler ve app_releases tablosuna satır ekler.
//
// Her adım spawnSync'e ARRAY olarak veriliyor (shell string birleştirmesi
// yok) — bu yüzden --notes="a;b;c" gibi noktalı virgüllü argümanlar da
// güvenle geçiyor; eski "npm run build:mac && npm run upload:mac" zincirinde
// olduğu gibi npm'in shell'e çiğ metin yapıştırmasından kaynaklı kırılma yok.
//
// Kullanım: node scripts/release.js [--mandatory] [--notes="a;b;c"] [--min-version=1.0.0] [--skip-win] [--skip-mac]
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');

// .env.release'i BURADA yüklemek şart — electron-builder'ı spawnSync ile
// çağırıyoruz ve notarization (APPLE_ID/APPLE_APP_SPECIFIC_PASSWORD/
// APPLE_TEAM_ID) tam olarak o adımda, @electron/notarize'ın process.env'i
// okuduğu yerde gerekiyor. Önceden bu dosya sadece upload-release.js
// tarafından yükleniyordu (o adım notarization'dan SONRA çalışıyor) — yani
// Apple kimlik bilgileri build'e hiç ulaşmıyordu, notarization sessizce
// atlanıyordu.
if (!process.env.APPLE_ID) {
  try {
    process.loadEnvFile(path.join(ROOT, '.env.release'));
  } catch {
    // dosya yoksa notarization zaten atlanacak, bu normal (sertifika yoksa vs.)
  }
}

function bumpPatchVersion() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const parts = String(pkg.version || '0.0.0').split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1; // patch bump
  const newVersion = parts.join('.');
  pkg.version = newVersion;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  return newVersion;
}

function run(label, command, args) {
  console.log(`\n== ${label} ==\n`);
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: ROOT });
  if (result.status !== 0) {
    console.error(`\n✗ "${label}" başarısız oldu (exit ${result.status}).\n`);
    process.exit(result.status || 1);
  }
}

function main() {
  const extraArgs = process.argv.slice(2);
  const skipWin = extraArgs.includes('--skip-win');
  const skipMac = extraArgs.includes('--skip-mac');
  const passthroughArgs = extraArgs.filter((a) => a !== '--skip-win' && a !== '--skip-mac');

  const oldVersion = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8')).version;
  const newVersion = bumpPatchVersion();
  console.log(`\nSürüm: ${oldVersion} → ${newVersion}\n`);

  // dist/ eski build kalıntılarıyla (eski ürün adı, eski sürümler) doluysa
  // upload script'i onları da yeni sürümün dosyalarıymış gibi Storage'a
  // taşımaya çalışıyor — her release'de temiz başlangıç şart.
  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(distDir)) {
    console.log('Eski dist/ temizleniyor...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  if (skipMac && skipWin) {
    console.error('\n✗ --skip-win ve --skip-mac birlikte verilemez, yayınlanacak hiçbir şey kalmıyor.\n');
    process.exit(1);
  }

  // Next.js çıktısı her iki platform installer'ı için de ortak — bir kere yeter.
  run('Next.js build', 'npx', ['next', 'build']);

  // electron-builder'ın mac config'i zaten hem x64 (Intel) hem arm64 (Apple
  // Silicon) için dmg+zip üretiyor (bkz. package.json build.mac.target) — tek
  // çağrı, iki mimari birden. Windows ayrı çağrı çünkü NSIS hedefi.
  if (!skipMac) run('Build: macOS installer (Intel + Apple Silicon)', 'npx', ['electron-builder', '--mac']);
  if (!skipWin) run('Build: Windows installer (64-bit)', 'npx', ['electron-builder', '--win']);

  if (!skipMac) run('Upload: macOS → Supabase', 'node', ['scripts/upload-release.js', 'mac', ...passthroughArgs]);
  if (!skipWin) run('Upload: Windows → Supabase', 'node', ['scripts/upload-release.js', 'windows', ...passthroughArgs]);

  console.log(`\n✓ v${newVersion} yayınlandı${skipMac ? ' (sadece Windows)' : skipWin ? ' (sadece macOS)' : ' (macOS + Windows)'}.\n`);
}

main();
