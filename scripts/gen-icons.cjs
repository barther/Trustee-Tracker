// One-off icon generator. Run: node scripts/gen-icons.cjs
// Produces sage-square lettermark icons in public/icons/.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const sage = '#4a6b54';
const white = '#ffffff';

function svg({ size, radius, fontSize, text = 'LS' }) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${sage}"/>
    <text x="50%" y="50%" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="-${fontSize * 0.04}" text-anchor="middle" dominant-baseline="central" fill="${white}">${text}</text>
  </svg>`;
}

async function render(svgString, outPath) {
  await sharp(Buffer.from(svgString)).png().toFile(outPath);
  console.log('wrote', path.relative(process.cwd(), outPath));
}

(async () => {
  await render(svg({ size: 192, radius: 36, fontSize: 92 }), path.join(OUT, 'icon-192.png'));
  await render(svg({ size: 512, radius: 96, fontSize: 248 }), path.join(OUT, 'icon-512.png'));
  // Maskable: no rounded corners, inset content within safe zone (~80% of frame)
  await render(svg({ size: 512, radius: 0, fontSize: 200 }), path.join(OUT, 'icon-512-maskable.png'));
  // Apple touch icon (iOS rounds corners itself)
  await render(svg({ size: 180, radius: 0, fontSize: 88 }), path.join(OUT, 'apple-touch-icon.png'));
  // Source SVG for reference
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svg({ size: 512, radius: 96, fontSize: 248 }));
  console.log('wrote', path.relative(process.cwd(), path.join(OUT, 'icon.svg')));
})();
