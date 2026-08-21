const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const src = path.join(rootDir, 'public/icon.png');
const appxDirs = [
  path.join(rootDir, 'build/appx'),
  path.join(rootDir, 'public/appx')
];

for (const dir of appxDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function generateAppxIcons() {
  console.log('Generating AppX tile & logo assets...');

  for (const appxDir of appxDirs) {
    // Square logos
    await sharp(src).resize(50, 50).toFile(path.join(appxDir, 'StoreLogo.png'));
    await sharp(src).resize(150, 150).toFile(path.join(appxDir, 'Square150x150Logo.png'));
    await sharp(src).resize(44, 44).toFile(path.join(appxDir, 'Square44x44Logo.png'));
    await sharp(src).resize(310, 310).toFile(path.join(appxDir, 'Square310x310Logo.png'));
    await sharp(src).resize(310, 310).toFile(path.join(appxDir, 'LargeTile.png'));
    await sharp(src).resize(71, 71).toFile(path.join(appxDir, 'SmallTile.png'));
    await sharp(src).resize(71, 71).toFile(path.join(appxDir, 'Square71x71Logo.png'));
    await sharp(src).resize(24, 24).toFile(path.join(appxDir, 'BadgeLogo.png'));

    // Wide310x150Logo (310x150)
    await sharp(src)
      .resize(130, 130, { fit: 'contain', background: { r: 9, g: 13, b: 22, alpha: 1 } })
      .extend({
        top: 10,
        bottom: 10,
        left: 90,
        right: 90,
        background: { r: 9, g: 13, b: 22, alpha: 1 }
      })
      .resize(310, 150)
      .toFile(path.join(appxDir, 'Wide310x150Logo.png'));

    // SplashScreen (620x300)
    await sharp(src)
      .resize(200, 200, { fit: 'contain', background: { r: 9, g: 13, b: 22, alpha: 1 } })
      .extend({
        top: 50,
        bottom: 50,
        left: 210,
        right: 210,
        background: { r: 9, g: 13, b: 22, alpha: 1 }
      })
      .resize(620, 300)
      .toFile(path.join(appxDir, 'SplashScreen.png'));
  }

  console.log('AppX assets generated in build/appx/ and public/appx/');
}

async function generateIco() {
  console.log('Generating build/icon.ico...');
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(src).resize(size, size).png().toBuffer();
    pngBuffers.push({ size, buf });
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(sizes.length, 4); // count

  let offset = 6 + sizes.length * 16;
  const entries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 0); // width
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 1); // height
    entry.writeUInt8(0, 2); // palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buf.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += item.buf.length;
  }

  const icoBuf = Buffer.concat([header, ...entries, ...pngBuffers.map(x => x.buf)]);
  fs.writeFileSync(path.join(rootDir, 'build/icon.ico'), icoBuf);
  fs.writeFileSync(path.join(rootDir, 'public/icon.ico'), icoBuf);
  console.log('icon.ico created successfully in build/ and public/.');
}

async function main() {
  await generateAppxIcons();
  await generateIco();
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
