import fs from 'fs';

const raw = fs.readFileSync('data/mygeodata.geojson', 'utf8');
const geojson = JSON.parse(raw);

let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;

geojson.features.forEach(f => {
  const processBounds = (coords) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      coords.forEach(processBounds);
    }
  };
  processBounds(f.geometry.coordinates);
});

const width = maxX - minX;
const height = maxY - minY;

// Target coordinates (approximate Kannad, Maharashtra)
const targetLng = 75.118;
const targetLat = 20.271;
const degreeScale = 0.005; // Make the whole layout roughly 500 meters wide

geojson.features.forEach(f => {
  const transformCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      // Normalize to 0..1
      const normX = (x - minX) / width;
      const normY = (y - minY) / height;
      
      // Scale and shift
      // Keep aspect ratio
      const aspect = height / width;
      const finalLng = targetLng + (normX * degreeScale);
      const finalLat = targetLat + (normY * degreeScale * aspect);
      
      coords[0] = finalLng;
      coords[1] = finalLat;
    } else {
      coords.forEach(transformCoords);
    }
  };
  transformCoords(f.geometry.coordinates);
});

fs.writeFileSync('data/mygeodata-fixed.geojson', JSON.stringify(geojson, null, 2));
console.log("Successfully normalized coordinates into valid GPS bounds.");
