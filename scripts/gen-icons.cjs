// One-off icon generator. Run: node scripts/gen-icons.cjs
// Resizes public/icons/source.png into the app icon set.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'icons');
const SRC = path.join(OUT, 'source.png');

const sage = '#4a6b54';

async function resize(size, outName) {
  const out = path.join(OUT, outName);
  await sharp(SRC).resize(size, size, { fit: 'cover' }).png().toFile(out);
  console.log('wrote', path.relative(process.cwd(), out));
}

async function maskable(size, outName) {
  // Maskable safe zone is the inner 80%. Scale source to 80% of canvas and
  // pad with sage so corner cropping by the OS reveals theme color, not white.
  const inner = Math.round(size * 0.8);
  const pad = Math.round((size - inner) / 2);
  const out = path.join(OUT, outName);
  const resized = await sharp(SRC).resize(inner, inner, { fit: 'cover' }).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: sage,
    },
  })
    .composite([{ input: resized, top: pad, left: pad }])
    .png()
    .toFile(out);
  console.log('wrote', path.relative(process.cwd(), out));
}

(async () => {
  await resize(192, 'icon-192.png');
  await resize(512, 'icon-512.png');
  await maskable(512, 'icon-512-maskable.png');
  await resize(180, 'apple-touch-icon.png');

  // SVG favicon: embed the 512 PNG as a data URI so /icons/icon.svg keeps
  // working without a separate vector source.
  const png512 = fs.readFileSync(path.join(OUT, 'icon-512.png')).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image href="data:image/png;base64,${png512}" width="512" height="512"/></svg>`;
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svg);
  console.log('wrote', path.relative(process.cwd(), path.join(OUT, 'icon.svg')));
})();
