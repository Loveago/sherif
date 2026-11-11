const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const appDir = path.join(__dirname, '..', 'src', 'app');
const originalImagePath = path.join(publicDir, 'crazy-tech-enterprise-original.png');

// Helper to build a valid multi-image ICO binary embedding PNG frames
function buildIcoFile(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type ICO (1)
  header.writeUInt16LE(count, 4); // number of images

  let offset = 6 + count * 16;
  const dirEntries = [];
  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width === 256 ? 0 : width, 0);
    entry.writeUInt8(height === 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color palette (0 for truecolor)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel (32 bpp RGBA)
    entry.writeUInt32LE(buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    dirEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.buffer)]);
}

// 1. Sleek Vector 100x100 Crazy Tech Enterprise Emblem Favicon SVG
// Metallic Chrome Bevels + Glowing Electric Cyan Circuits & Nodes + Dagger Stem T
const crazyFaviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">
  <defs>
    <!-- Dark Obsidian Canvas Gradient -->
    <radialGradient id="ctBgGrad" cx="50%" cy="48%" r="56%">
      <stop offset="0%" stop-color="#182230" />
      <stop offset="55%" stop-color="#101622" />
      <stop offset="100%" stop-color="#080c14" />
    </radialGradient>

    <!-- Chrome Metallic Highlight -->
    <linearGradient id="ctChrome" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="25%" stop-color="#94a3b8" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="75%" stop-color="#64748b" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>

    <!-- Bevel light edge -->
    <linearGradient id="ctBevelLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#64748b" stop-opacity="0.3" />
    </linearGradient>

    <!-- Electric Cyan Circuit Glow -->
    <linearGradient id="ctCyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="50%" stop-color="#00d2ff" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <!-- Ambient Core Glow -->
    <radialGradient id="ctCoreGlow" cx="50%" cy="46%" r="42%">
      <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.24" />
      <stop offset="100%" stop-color="#00e5ff" stop-opacity="0" />
    </radialGradient>

    <!-- Subtle Outer Rim Gradient -->
    <linearGradient id="ctRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6" />
      <stop offset="50%" stop-color="#1e293b" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#00f2fe" stop-opacity="0.5" />
    </linearGradient>

    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.65" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Squircle Canvas Badge -->
  <rect width="100" height="100" rx="22" fill="url(#ctBgGrad)" />
  <rect x="1" y="1" width="98" height="98" rx="21" stroke="url(#ctRimGrad)" stroke-width="1.2" />
  <circle cx="50" cy="46" r="36" fill="url(#ctCoreGlow)" />

  <!-- Outer Faceted C Shape with Chrome Bevel -->
  <path
    d="M 64 19
       L 36 19
       L 19 36
       L 19 62
       L 36 79
       L 58 79
       L 73 64
       L 64 55
       L 54 65
       L 40 65
       L 32 57
       L 32 41
       L 40 33
       L 59 33
       L 64 26
       Z"
    fill="#121824"
    stroke="url(#ctChrome)"
    stroke-width="2.6"
    stroke-linejoin="round"
  />

  <!-- Chrome Specular Inner Rim -->
  <path
    d="M 62 20.5 L 36.5 20.5 L 20.5 36.5 L 20.5 61.5 L 36.5 77.5 L 57.5 77.5 L 71 64"
    fill="none"
    stroke="url(#ctBevelLight)"
    stroke-width="1"
    stroke-linecap="round"
  />

  <!-- Glowing Cyan Circuit Traces inside C -->
  <g filter="url(#neonGlow)">
    <path
      d="M 60 26 L 39 26 L 26 39 L 26 59 L 38 71 L 53 71 L 67 60"
      fill="none"
      stroke="url(#ctCyanGlow)"
      stroke-width="1.8"
      stroke-linejoin="round"
      stroke-linecap="round"
    />

    <!-- Cyan Circuit Nodes / Terminals -->
    <circle cx="60" cy="26" r="2.2" fill="#00f2fe" />
    <circle cx="60" cy="26" r="1.1" fill="#ffffff" />

    <circle cx="48" cy="26" r="1.6" fill="#00f2fe" />
    <circle cx="48" cy="26" r="0.8" fill="#ffffff" />

    <circle cx="31" cy="34" r="1.6" fill="#00f2fe" />

    <circle cx="26" cy="49" r="2" fill="#00f2fe" />
    <circle cx="26" cy="49" r="1" fill="#ffffff" />

    <circle cx="31" cy="64" r="1.6" fill="#00f2fe" />

    <circle cx="48" cy="71" r="1.6" fill="#00f2fe" />
    <circle cx="48" cy="71" r="0.8" fill="#ffffff" />

    <circle cx="67" cy="60" r="2.2" fill="#00f2fe" />
    <circle cx="67" cy="60" r="1.1" fill="#ffffff" />
  </g>

  <!-- Central T Symbol (Metallic Chrome with Dagger Point) -->
  <!-- Top Crossbar of T -->
  <path
    d="M 42 34
       L 75 34
       L 69 41
       L 54 41
       L 42 34 Z"
    fill="#121824"
    stroke="url(#ctChrome)"
    stroke-width="2.2"
    stroke-linejoin="round"
  />

  <!-- Crossbar Cyan Circuit Trace -->
  <g filter="url(#neonGlow)">
    <path d="M 46 37.5 L 68 37.5" fill="none" stroke="url(#ctCyanGlow)" stroke-width="1.4" stroke-linecap="round" />
    <circle cx="67" cy="37.5" r="1.6" fill="#00f2fe" />
    <circle cx="67" cy="37.5" r="0.8" fill="#ffffff" />
  </g>

  <!-- Vertical Dagger Stem of T -->
  <path
    d="M 47 41
       L 53 41
       L 53 73
       L 50 85
       L 47 73
       Z"
    fill="#121824"
    stroke="url(#ctChrome)"
    stroke-width="2.2"
    stroke-linejoin="round"
  />

  <!-- Glowing Cyan Conduit Beam down the center of T -->
  <g filter="url(#neonGlow)">
    <line x1="50" y1="41" x2="50" y2="78" stroke="url(#ctCyanGlow)" stroke-width="2" stroke-linecap="round" />
    <line x1="50" y1="41" x2="50" y2="77" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" />
  </g>
</svg>`;

// 2. Full Horizontal Brand Logo (Crazy Tech Enterprise)
const crazyLogoHorizontalSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 96" width="540" height="96" fill="none">
  <defs>
    <linearGradient id="ctHTextCyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="60%" stop-color="#00c6ff" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="ctHChrome" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="50%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
  </defs>

  <!-- Freestanding Mark on left -->
  <g transform="translate(10, 8) scale(0.8)">
    ${crazyFaviconSvg.replace(/<\?xml.*?\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>

  <!-- Typography -->
  <g transform="translate(104, 52)">
    <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" letter-spacing="-0.5">
      <tspan fill="#0f172a">CRAZY</tspan> <tspan fill="url(#ctHTextCyan)">TECH</tspan>
    </text>
    <text x="2" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" letter-spacing="4.5" fill="#64748b">
      ENTERPRISE
    </text>
  </g>
</svg>`;

// 3. Dark Horizontal Brand Logo (for dark surfaces)
const crazyLogoHorizontalDarkSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 96" width="540" height="96" fill="none">
  <defs>
    <linearGradient id="ctHTextCyanDark" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="60%" stop-color="#00c6ff" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>

  <!-- Freestanding Mark on left -->
  <g transform="translate(10, 8) scale(0.8)">
    ${crazyFaviconSvg.replace(/<\?xml.*?\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>

  <!-- Typography -->
  <g transform="translate(104, 52)">
    <text x="0" y="0" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" letter-spacing="-0.5">
      <tspan fill="#ffffff">CRAZY</tspan> <tspan fill="url(#ctHTextCyanDark)">TECH</tspan>
    </text>
    <text x="2" y="24" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" letter-spacing="4.5" fill="#38bdf8">
      ENTERPRISE
    </text>
  </g>
</svg>`;

// 4. Square Stacked Logo (Light & Dark)
const crazyLogoSquareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="600" height="520" fill="none">
  <defs>
    <linearGradient id="ctSqTextCyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="50%" stop-color="#00c6ff" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>

  <g transform="translate(180, 36) scale(2.4)">
    ${crazyFaviconSvg.replace(/<\?xml.*?\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>

  <g transform="translate(300, 340)">
    <text text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" letter-spacing="-0.5">
      <tspan fill="#0f172a">CRAZY</tspan> <tspan fill="url(#ctSqTextCyan)">TECH</tspan>
    </text>
    <text y="42" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" letter-spacing="8" fill="#64748b">
      ENTERPRISE
    </text>
    <text y="78" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="3" fill="#94a3b8">
      HIGH-SPEED TELECOM &amp; AUTOMATION
    </text>
  </g>
</svg>`;

const crazyLogoSquareDarkSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520" width="600" height="520" fill="none">
  <defs>
    <linearGradient id="ctSqDarkTextCyan" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f2fe" />
      <stop offset="50%" stop-color="#00c6ff" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>

  <g transform="translate(180, 36) scale(2.4)">
    ${crazyFaviconSvg.replace(/<\?xml.*?\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>

  <g transform="translate(300, 340)">
    <text text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" letter-spacing="-0.5">
      <tspan fill="#ffffff">CRAZY</tspan> <tspan fill="url(#ctSqDarkTextCyan)">TECH</tspan>
    </text>
    <text y="42" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" letter-spacing="8" fill="#38bdf8">
      ENTERPRISE
    </text>
    <text y="78" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="3" fill="#64748b">
      HIGH-SPEED TELECOM &amp; AUTOMATION
    </text>
  </g>
</svg>`;

async function buildAssets() {
  console.log("⚡ Building Crazy Tech Enterprise brand assets...");

  // Write SVGs to public/
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), crazyFaviconSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), crazyFaviconSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), crazyLogoSquareSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-dark.svg'), crazyLogoSquareDarkSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'logo-horizontal.svg'), crazyLogoHorizontalSvg, 'utf8');

  // Also write SVGs to src/app/
  fs.writeFileSync(path.join(appDir, 'icon.svg'), crazyFaviconSvg, 'utf8');

  // Extract authentic 360x360 master square emblem from original image
  const masterEmblemBuf = await sharp(originalImagePath)
    .extract({ left: 332, top: 72, width: 360, height: 360 })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'emblem-master.png'), masterEmblemBuf);

  // 1. icon-512.png (512x512)
  await sharp(masterEmblemBuf)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  // 2. icon-192.png (192x192)
  await sharp(masterEmblemBuf)
    .resize(192, 192, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.8, m1: 1.2, m2: 1.8 })
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  // 3. apple-icon.png (180x180)
  const appleBuf = await sharp(masterEmblemBuf)
    .resize(180, 180, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.8, m1: 1.2, m2: 1.8 })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-icon.png'), appleBuf);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), appleBuf);

  // 4. icon.png (32x32)
  const icon32Buf = await sharp(masterEmblemBuf)
    .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.0, m1: 1.6, m2: 2.2 })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon.png'), icon32Buf);
  fs.writeFileSync(path.join(appDir, 'icon.png'), icon32Buf);

  // 5. 16x16 and 48x48 icon frames for multi-res ICO
  const icon16Buf = await sharp(masterEmblemBuf)
    .resize(16, 16, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.8, m1: 2.0, m2: 2.5 })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-16.png'), icon16Buf);

  const icon48Buf = await sharp(masterEmblemBuf)
    .resize(48, 48, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.9, m1: 1.4, m2: 2.0 })
    .png()
    .toBuffer();

  // 6. True Multi-Resolution favicon.ico (16, 32, 48)
  const icoData = buildIcoFile([
    { width: 16, height: 16, buffer: icon16Buf },
    { width: 32, height: 32, buffer: icon32Buf },
    { width: 48, height: 48, buffer: icon48Buf },
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoData);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoData);

  // 7. Full master logo.png (1024x558)
  await sharp(originalImagePath)
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  // 8. Horizontal brand logo.png (800x180)
  const emblemForH = await sharp(masterEmblemBuf)
    .resize(140, 140)
    .toBuffer();

  const hSvgText = `<svg width="580" height="180" viewBox="0 0 580 180" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="82" font-family="system-ui, -apple-system, sans-serif" font-size="46" font-weight="900" letter-spacing="-0.5">
      <tspan fill="#ffffff">CRAZY</tspan> <tspan fill="#00e5ff">TECH</tspan>
    </text>
    <text x="3" y="122" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" letter-spacing="7" fill="#94a3b8">
      ENTERPRISE
    </text>
  </svg>`;

  await sharp({
    create: {
      width: 760,
      height: 180,
      channels: 4,
      background: { r: 16, g: 21, b: 30, alpha: 1 },
    },
  })
    .composite([
      { input: emblemForH, top: 20, left: 24 },
      { input: Buffer.from(hSvgText), top: 20, left: 180 },
    ])
    .png()
    .toFile(path.join(publicDir, 'logo-horizontal.png'));

  console.log("✅ Crazy Tech Enterprise brand assets built successfully!");
}

buildAssets().catch((err) => {
  console.error("Asset build error:", err);
  process.exit(1);
});
