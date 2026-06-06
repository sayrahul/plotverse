const fs = require('fs');
const { execSync } = require('child_process');

try {
  // Restore original SVG from git
  execSync('git checkout public/data/plot.svg');
  console.log('Restored original SVG from git');

  // Read the restored SVG
  let svg = fs.readFileSync('public/data/plot.svg', 'utf8');

  // ONLY convert inline styles to presentation attributes, DO NOT remove background
  svg = svg.replace(/style="fill:\s*(#[^;]+);\s*stroke:\s*(#[^;]+);\s*stroke-miterlimit:\s*([^;]+);\s*stroke-width:\s*([^;"]+);?"/g, 'fill="$1" stroke="$2" stroke-miterlimit="$3" stroke-width="$4"');
  
  // also catch the ones that only have fill
  svg = svg.replace(/style="fill:\s*(#[^;"]+);?"/g, 'fill="$1"');

  // Write it back
  fs.writeFileSync('public/data/plot.svg', svg);
  console.log('Fixed inline styles without removing background!');
} catch (e) {
  console.error('Error:', e);
}
