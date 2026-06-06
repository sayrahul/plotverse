const fs = require('fs');

try {
  let svg = fs.readFileSync('public/data/plot.svg', 'utf8');

  // Regex to find groups with data-name and rects inside
  // e.g. <g id="_122" data-name="122">\n    <rect x="315.55" y="263.61" width="122.66" height="49.06" .../>\n  </g>
  
  const modifiedSvg = svg.replace(/<g[^>]*data-name="([^"]+)"[^>]*>\s*(<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"[^>]*\/>|\s*<path d="([^"]+)"[^>]*\/>)\s*<\/g>/g, (match, dataName, innerHtml, rx, ry, rw, rh, pd) => {
    
    let cx, cy;
    
    if (rx !== undefined) {
      // It's a rect
      cx = parseFloat(rx) + parseFloat(rw) / 2;
      cy = parseFloat(ry) + parseFloat(rh) / 2;
    } else if (pd !== undefined) {
      // It's a path. Just roughly estimate center based on bounding box or first coordinates
      // M438.21,165.48h-98.13...
      const m = pd.match(/M([\d.]+),([\d.]+)/);
      if (m) {
        cx = parseFloat(m[1]) - 40; // rough guess based on path drawing leftwards
        cy = parseFloat(m[2]) + 40;
      }
    }
    
    if (cx !== undefined && cy !== undefined) {
      // Add a text tag centered at cx, cy
      // adjust cy slightly for vertical centering of text
      const textTag = `\n    <text x="${cx}" y="${cy + 5}" font-family="Arial" font-size="16" font-weight="bold" fill="#333" text-anchor="middle">${dataName}</text>`;
      // return the group with the original innerHtml AND the new text tag
      return match.replace(innerHtml, innerHtml + textTag);
    }
    
    return match;
  });

  fs.writeFileSync('public/data/plot.svg', modifiedSvg);
  console.log('Injected plot numbers into SVG!');
} catch (e) {
  console.error('Error:', e);
}
