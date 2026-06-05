import fs from 'fs';
import path from 'path';
import * as turf from '@turf/turf';

const inputPath = path.resolve('data/mygeodata-fixed.geojson');
const raw = fs.readFileSync(inputPath, 'utf8');
const geojson = JSON.parse(raw);

const plots = [];

geojson.features.forEach((feature, index) => {
  let geometry = feature.geometry;

  // Handle MultiPolygon by taking the first polygon
  if (geometry.type === 'MultiPolygon') {
    geometry = { type: 'Polygon', coordinates: geometry.coordinates[0] };
  }

  if (geometry.type === 'Polygon') {
    const polyFeature = turf.polygon(geometry.coordinates);
    const areaSqm = turf.area(polyFeature);
    const center = turf.centerOfMass(polyFeature).geometry.coordinates;

    plots.push({
      id: `plot-${index}`,
      projectId: "single",
      number: `P-${index + 1}`,
      geometry: geometry,
      areaSqm: Math.round(areaSqm),
      status: "available",
      centroid: center,
      points: geometry.coordinates[0],
    });
  }
});

const dataPath = path.resolve('public/data/plot-data.json');
let existingData = { project: {}, zones: [] };

if (fs.existsSync(dataPath)) {
  const existingRaw = fs.readFileSync(dataPath, 'utf8');
  existingData = JSON.parse(existingRaw);
}

let projectCenter = existingData.project.center || [0, 0];
if (plots.length > 0) {
  const allFeatures = turf.featureCollection(plots.map(p => turf.polygon([p.points])));
  projectCenter = turf.center(allFeatures).geometry.coordinates;
}

const newData = {
  project: {
    ...existingData.project,
    center: projectCenter
  },
  plots: plots,
  zones: existingData.zones || []
};

fs.writeFileSync(dataPath, JSON.stringify(newData, null, 2));
console.log(`Successfully loaded ${plots.length} plots into the app!`);
