const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 1. Sleek 100x100 Storefront Favicon SVG (Obsidian + Pure White + Slate + Refined Emerald)
const storeFaviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">
  <!-- Sleek Obsidian Background -->
  <rect width="100" height="100" rx="24" fill="#080e1a" />
  <rect x="1" y="1" width="98" height="98" rx="23" stroke="#1e293b" stroke-width="1.5" />

  <!-- Shopping Bag Handle (Silver Slate) -->
  <path
    d="M 35 34 C 35 19, 65 19, 65 34"
    fill="none"
    stroke="#94a3b8"
    stroke-width="7"
    stroke-linecap="round"
  />

  <!-- Subtle Emerald Accent Jewel at Handle Apex -->
  <circle cx="50" cy="19.5" r="3.5" fill="#10b981" />

  <!-- Modern Bag Body (Pure White) -->
  <path
    d="M 22 36 L 78 36 L 72 84 C 71.5 87.5, 68 90, 64 90 L 36 90 C 32 90, 28.5 87.5, 28 84 Z"
    fill="none"
    stroke="#ffffff"
    stroke-width="7"
    stroke-linejoin="round"
    stroke-linecap="round"
  />

  <!-- Center Instant Telecom Data Spark (Refined Emerald) -->
  <path
    d="M 53 45 L 41.5 60 L 50 60 L 46 76 L 59 58 L 50.5 58 Z"
    fill="#10b981"
  />
</svg>`;

// 2. Apple Touch Icon 180x180 SVG (iOS standard)
const storeAppleIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180" fill="none">
  <!-- Sleek Obsidian Background for iOS -->
  <rect width="180" height="180" fill="#080e1a" />
  <rect x="2" y="2" width="176" height="176" rx="40" stroke="#1e293b" stroke-width="2" />

  <g transform="translate(18, 18) scale(1.44)">
    <!-- Shopping Bag Handle -->
    <path
      d="M 35 34 C 35 19, 65 19, 65 34"
      fill="none"
      stroke="#94a3b8"
      stroke-width="7"
      stroke-linecap="round"
    />

    <!-- Emerald Jewel at Handle Apex -->
    <circle cx="50" cy="19.5" r="3.5" fill="#10b981" />

    <!-- Modern Bag Body -->
    <path
      d="M 22 36 L 78 36 L 72 84 C 71.5 87.5, 68 90, 64 90 L 36 90 C 32 90, 28.5 87.5, 28 84 Z"
      fill="none"
      stroke="#ffffff"
      stroke-width="7"
      stroke-linejoin="round"
      stroke-linecap="round"
    />

    <!-- Center Instant Telecom Data Spark -->
    <path
      d="M 53 45 L 41.5 60 L 50 60 L 46 76 L 59 58 L 50.5 58 Z"
      fill="#10b981"
    />
  </g>
</svg>`;

async function buildIcons() {
  const root = path.resolve(__dirname, '..');

  // Save SVGs
  fs.writeFileSync(path.join(root, 'src/app/store/icon.svg'), storeFaviconSvg);
  fs.writeFileSync(path.join(root, 'src/app/store/apple-icon.svg'), storeAppleIconSvg);
  fs.writeFileSync(path.join(root, 'public/store-icon.svg'), storeFaviconSvg);
  fs.writeFileSync(path.join(root, 'public/store-favicon.svg'), storeFaviconSvg);

  const svgBuffer = Buffer.from(storeFaviconSvg);
  const appleSvgBuffer = Buffer.from(storeAppleIconSvg);

  // Generate PNGs
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(root, 'public/store-icon-512.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(root, 'public/store-icon-192.png'));
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(root, 'public/store-icon-32.png'));
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(root, 'public/store-icon-16.png'));
  await sharp(appleSvgBuffer).resize(180, 180).png().toFile(path.join(root, 'public/store-apple-icon.png'));

  // Also write src/app/store/icon.png and apple-icon.png for Next.js App Router metadata conventions
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(root, 'src/app/store/icon.png'));
  await sharp(appleSvgBuffer).resize(180, 180).png().toFile(path.join(root, 'src/app/store/apple-icon.png'));

  // Generate Multi-size .ico file (16x16, 32x32, 48x48)
  const b16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const b32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const b48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();

  const icoBuffer = createIco([b16, b32, b48]);
  fs.writeFileSync(path.join(root, 'public/store-favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(root, 'src/app/store/favicon.ico'), icoBuffer);

  console.log('✓ Successfully generated all storefront favicons and icons!');
}

function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + (dirEntrySize * numImages);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(numImages, 4); // Count

  const entries = [];
  for (const buf of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    // Read dimensions from PNG IHDR (bytes 16-24)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);

    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // Colors
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Size
    entry.writeUInt32LE(offset, 12); // Offset

    entries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

buildIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
