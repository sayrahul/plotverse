import fs from 'fs';

const raw = fs.readFileSync('data/mygeodata.geojson', 'utf8');
const geojson = JSON.parse(raw);

let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;

geojson.features.forEach(f => {
  const processCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      coords.forEach(processCoords);
    }
  };
  processCoords(f.geometry.coordinates);
});

console.log(`Bounds: X:[${minX}, ${maxX}], Y:[${minY}, ${maxY}]`);
console.log(`Width: ${maxX - minX}`);
console.log(`Height: ${maxY - minY}`);
