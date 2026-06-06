/**
 * Converts SVG plot shapes → GeoJSON plot features using the overlay geo bounds.
 * Writes updated plot-data.json with all plots from plot.svg.
 */
const fs = require('fs');
const path = require('path');

// ── Geo bounds matching plot-data.json imageOverlay coordinates ─────────────
// Top-Left, Top-Right, Bottom-Right, Bottom-Left
const GEO = {
  minLng: 75.11812766906638,
  maxLng: 75.11844906229001,
  minLat: 20.271525845992514,
  maxLat: 20.271823416822215,
};

// SVG canvas size
const SVG_W = 1080;
const SVG_H = 1080;

// Convert SVG pixel [x, y] → [lng, lat]
function svgToGeo(x, y) {
  const lng = GEO.minLng + (x / SVG_W) * (GEO.maxLng - GEO.minLng);
  // SVG y goes top→down; lat goes bottom→up
  const lat = GEO.maxLat - (y / SVG_H) * (GEO.maxLat - GEO.minLat);
  return [lng, lat];
}

// Build a rectangular GeoJSON polygon from bbox [x, y, w, h]
function rectToPolygon(x, y, w, h) {
  const tl = svgToGeo(x,     y);
  const tr = svgToGeo(x + w, y);
  const br = svgToGeo(x + w, y + h);
  const bl = svgToGeo(x,     y + h);
  return {
    type: 'Polygon',
    coordinates: [[tl, tr, br, bl, tl]],
  };
}

function centroid(coords) {
  const ring = coords[0];
  const lng = ring.slice(0, -1).reduce((s, c) => s + c[0], 0) / (ring.length - 1);
  const lat = ring.slice(0, -1).reduce((s, c) => s + c[1], 0) / (ring.length - 1);
  return [lng, lat];
}

// Rough area in sqm from a tiny geo polygon (using planar approximation)
function areaFromGeoRect(w_svg, h_svg) {
  const mPerLng = 111320 * Math.cos((GEO.minLat + GEO.maxLat) / 2 * Math.PI / 180);
  const mPerLat = 110574;
  const wM = (w_svg / SVG_W) * (GEO.maxLng - GEO.minLng) * mPerLng;
  const hM = (h_svg / SVG_H) * (GEO.maxLat - GEO.minLat) * mPerLat;
  return Math.round(wM * hM);
}

// ── Parse plot.svg ───────────────────────────────────────────────────────────
const svgText = fs.readFileSync(path.join(__dirname, '../public/data/plot.svg'), 'utf8');

const plots = [];
let plotIdx = 0;

// Match each <g> with data-name (= plot number)
const groupRe = /<g[^>]+data-name="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g;
let gMatch;
while ((gMatch = groupRe.exec(svgText)) !== null) {
  const name = gMatch[1].trim();
  const inner = gMatch[2];
  
  // Skip non-numeric names (like "LAYOUT PLAN")
  if (!/^\d+$/.test(name)) continue;

  let geometry = null;
  let areaSqm = 0;

  // Try <rect>
  const rectRe = /<rect[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]+width="([^"]+)"[^>]+height="([^"]+)"/;
  const rm = inner.match(rectRe);
  if (rm) {
    const [, x, y, w, h] = rm.map(parseFloat);
    geometry = rectToPolygon(x, y, w, h);
    areaSqm = areaFromGeoRect(w, h);
  } else {
    // For path shapes (top/bottom corner plots), extract M x,y to get rough bounding box
    const pathRe = /<path[^>]+d="([^"]+)"/;
    const pm = inner.match(pathRe);
    if (pm) {
      const d = pm[1];
      // Extract all numeric coordinate pairs
      const numRe = /[\d.]+,[\d.]+/g;
      const pairs = [];
      let nm;
      while ((nm = numRe.exec(d)) !== null) {
        const [px, py] = nm[0].split(',').map(parseFloat);
        pairs.push([px, py]);
      }
      if (pairs.length > 1) {
        const xs = pairs.map(p => p[0]);
        const ys = pairs.map(p => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        geometry = rectToPolygon(minX, minY, maxX - minX, maxY - minY);
        areaSqm = areaFromGeoRect(maxX - minX, maxY - minY);
      }
    }
  }

  if (!geometry) continue;

  plots.push({
    id: `plot-${plotIdx}`,
    projectId: 'single',
    number: name,
    status: 'available',
    geometry,
    areaSqm,
    centroid: centroid(geometry.coordinates),
    price: null,
    facing: null,
    zoneId: null,
  });
  plotIdx++;
}

// ── Read existing data and update ────────────────────────────────────────────
const dataPath = path.join(__dirname, '../public/data/plot-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
data.plots = plots;
data.zones = [];

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`✅ Generated ${plots.length} plots → plot-data.json`);
plots.slice(0, 5).forEach(p => console.log(`   Plot ${p.number}: ${p.areaSqm} sqm, centroid=[${p.centroid.map(v=>v.toFixed(7)).join(', ')}]`));
