'use strict';

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// build nesnesi yoksa oluştur
if (!pkg.build) {
  pkg.build = {};
}

// buildVersion numarasını artır (örn: 19, 20, 21...)
const currentBuildVersion = parseInt(pkg.build.buildVersion || '18', 10);
const newBuildVersion = currentBuildVersion + 1;

pkg.build.buildVersion = String(newBuildVersion);

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`\n🚀 [Auto-Build] Sürüm: v${pkg.version} | Build Numarası: ${newBuildVersion}\n`);
