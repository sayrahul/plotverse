const fs = require('fs');
let svg = fs.readFileSync('public/data/plot.svg', 'utf8');

// Remove the dark gray background path
svg = svg.replace(/<g id="bacground">[\s\S]*?<\/g>/g, '');

// Convert inline styles to presentation attributes which Mapbox handles better
svg = svg.replace(/style="fill:\s*(#[^;]+);\s*stroke:\s*(#[^;]+);\s*stroke-miterlimit:\s*([^;]+);\s*stroke-width:\s*([^;"]+);?"/g, 'fill="$1" stroke="$2" stroke-miterlimit="$3" stroke-width="$4"');

fs.writeFileSync('public/data/plot.svg', svg);
console.log('Fixed SVG!');
