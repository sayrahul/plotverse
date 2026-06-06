const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/data/plot.svg');
const pngPath = path.join(__dirname, '../public/data/plot.png');

async function convert() {
  console.log('Reading SVG...');
  const svgBuffer = fs.readFileSync(svgPath);
  const sizeMB = (svgBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`SVG size: ${sizeMB} MB`);

  console.log('Converting SVG → PNG at 4096px width (high res)...');
  await sharp(svgBuffer, { density: 150 })
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(pngPath);

  const outStat = fs.statSync(pngPath);
  console.log(`PNG saved: ${(outStat.size / 1024 / 1024).toFixed(2)} MB → ${pngPath}`);
}

convert().catch(e => {
  console.error('Conversion failed:', e.message);
  process.exit(1);
});
