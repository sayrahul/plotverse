import fs from 'fs';
import path from 'path';
import * as turf from '@turf/turf';

const inputData = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [75.1179944, 20.2716129],
          [75.1197601, 20.2712631],
          [75.1182913, 20.2731166],
          [75.1179944, 20.2716129] // Closed the loop perfectly
        ]
      }
    }
  ]
};

const plots = [];

inputData.features.forEach((feature, index) => {
  // Convert LineString to Polygon for PlotVerse
  const polyCoords = [feature.geometry.coordinates];
  const polygonFeature = turf.polygon(polyCoords);
  
  const areaSqm = turf.area(polygonFeature);
  const center = turf.centerOfMass(polygonFeature).geometry.coordinates;

  const plot = {
    id: `plot-test-${index}`,
    projectId: "single",
    number: `P-${index + 1}`,
    geometry: polygonFeature.geometry,
    areaSqm: Math.round(areaSqm),
    status: "available",
    centroid: center,
    points: polyCoords[0],
  };
  plots.push(plot);
});

const existingDataPath = path.resolve('public/data/plot-data.json');
let existingData = { project: {}, zones: [] };

if (fs.existsSync(existingDataPath)) {
    const raw = fs.readFileSync(existingDataPath, 'utf8');
    const parsed = JSON.parse(raw);
    existingData.project = parsed.project || {};
    existingData.zones = parsed.zones || [];
}

let projectCenter = [0, 0];
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

fs.writeFileSync(existingDataPath, JSON.stringify(newData, null, 2));
console.log(`Successfully imported test plot!`);
