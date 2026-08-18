const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { makeUniversalApp } = require('@electron/universal');
const { signAsync } = require('@electron/osx-sign');

const ROOT_DIR = path.resolve(__dirname, '..');
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const version = pkgJson.version;
const appName = 'Ayris Legal';

const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ARM64_APP = path.join(DIST_DIR, 'mas-arm64', `${appName}.app`);
const X64_APP = path.join(DIST_DIR, 'mas-x64', `${appName}.app`);
const UNIVERSAL_DIR = path.join(DIST_DIR, 'mas-universal');
const UNIVERSAL_APP = path.join(UNIVERSAL_DIR, `${appName}.app`);
const OUTPUT_PKG = path.join(DIST_DIR, `${appName}-${version}-universal.pkg`);

const SIGNING_IDENTITY = 'Apple Distribution: Mustafa YILDIZ (955Q2CT9X5)';
const INSTALLER_IDENTITY = '3rd Party Mac Developer Installer: Mustafa YILDIZ (955Q2CT9X5)';
const PROVISIONING_PROFILE = path.join(ROOT_DIR, 'build', 'embedded.provisionprofile');
const ENTITLEMENTS = path.join(ROOT_DIR, 'build', 'entitlements.mas.plist');
const ENTITLEMENTS_INHERIT = path.join(ROOT_DIR, 'build', 'entitlements.mas.inherit.plist');

function run(command) {
  console.log(`\n🚀 Çalıştırılıyor: ${command}`);
  execSync(command, { cwd: ROOT_DIR, stdio: 'inherit' });
}

async function main() {
  console.log(`\n========================================`);
  console.log(`🔨 Ayris Legal MAS Universal Build (v${version})`);
  console.log(`========================================\n`);

  // 0. Clean old build outputs
  console.log('🧹 Eski derleme çıktıları temizleniyor...');
  fs.rmSync(path.join(DIST_DIR, 'mas-arm64'), { recursive: true, force: true });
  fs.rmSync(path.join(DIST_DIR, 'mas-x64'), { recursive: true, force: true });
  fs.rmSync(path.join(DIST_DIR, 'mas'), { recursive: true, force: true });
  fs.rmSync(UNIVERSAL_DIR, { recursive: true, force: true });

  // 1. Next.js export build
  console.log('📦 Adım 1: Next.js build ediliyor...');
  run('npm run build');

  // 2. Build arm64 app directory (unpacked, unsigned)
  console.log('\n📦 Adım 2: Electron arm64 paketi hazırlanıyor...');
  run('npx electron-builder --mac mas --arm64 --dir -c.mac.identity=null');
  if (!fs.existsSync(ARM64_APP) && fs.existsSync(path.join(DIST_DIR, 'mas', `${appName}.app`))) {
    fs.renameSync(path.join(DIST_DIR, 'mas'), path.join(DIST_DIR, 'mas-arm64'));
  }

  // 3. Build x64 app directory (unpacked, unsigned)
  console.log('\n📦 Adım 3: Electron x64 paketi hazırlanıyor...');
  run('npx electron-builder --mac mas --x64 --dir -c.mac.identity=null');
  if (fs.existsSync(path.join(DIST_DIR, 'mas', `${appName}.app`))) {
    fs.renameSync(path.join(DIST_DIR, 'mas'), path.join(DIST_DIR, 'mas-x64'));
  }

  // Clean any stray _CodeSignature / provisionprofile before universal merge
  const cleanStrays = (appPath) => {
    execSync(`find "${appPath}" -name "_CodeSignature" -exec rm -rf {} + 2>/dev/null || true`);
    execSync(`rm -f "${path.join(appPath, 'Contents', 'embedded.provisionprofile')}" 2>/dev/null || true`);
  };
  cleanStrays(ARM64_APP);
  cleanStrays(X64_APP);

  // 4. Merge into Universal App
  console.log('\n🔗 Adım 4: arm64 ve x64 birleştiriliyor (makeUniversalApp)...');
  fs.mkdirSync(UNIVERSAL_DIR, { recursive: true });
  fs.rmSync(UNIVERSAL_APP, { recursive: true, force: true });

  await makeUniversalApp({
    x64AppPath: X64_APP,
    arm64AppPath: ARM64_APP,
    outAppPath: UNIVERSAL_APP,
    force: true,
    x64ArchFiles: '*',
  });
  console.log('✅ Universal .app başarıyla oluşturuldu.');

  // Copy provisioning profile into Contents/embedded.provisionprofile
  console.log('\n📋 Adım 5: Provisioning profile kopyalanıyor...');
  fs.copyFileSync(PROVISIONING_PROFILE, path.join(UNIVERSAL_APP, 'Contents', 'embedded.provisionprofile'));

  // 5. Code sign the universal app
  console.log('\n✍️ Adım 6: Universal .app MAS için imzalanıyor...');
  await signAsync({
    app: UNIVERSAL_APP,
    identity: SIGNING_IDENTITY,
    platform: 'mas',
    type: 'distribution',
    provisioningProfile: PROVISIONING_PROFILE,
    preAutoEntitlements: false,
    optionsForFile: (filePath) => {
      const isTopLevel = filePath === UNIVERSAL_APP;
      return {
        entitlements: isTopLevel ? ENTITLEMENTS : ENTITLEMENTS_INHERIT,
        hardenedRuntime: true,
      };
    },
  });
  console.log('✅ Kod imzalama tamamlandı.');

  // 6. Build MAS Installer PKG
  console.log('\n📦 Adım 7: MAS .pkg paketi oluşturuluyor...');
  fs.rmSync(OUTPUT_PKG, { force: true });
  run(`productbuild --component "${UNIVERSAL_APP}" /Applications --sign "${INSTALLER_IDENTITY}" "${OUTPUT_PKG}"`);

  // 7. Verify architectures
  console.log('\n🔍 Adım 8: Binary mimarisi kontrol ediliyor...');
  run(`file "${path.join(UNIVERSAL_APP, 'Contents', 'MacOS', appName)}"`);

  console.log(`\n========================================`);
  console.log(`🎉 MAS Universal Build Tamamlandı!`);
  console.log(`📁 Paket: ${OUTPUT_PKG}`);
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Build sırasında hata oluştu:', err);
  process.exit(1);
});
