import fs from 'fs';
import path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import * as toGeoJSON from '@tmcw/togeojson';
import * as turf from '@turf/turf';

// Usage: node scripts/convert-kml.mjs <path-to-kml-file>

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide the path to your KML file.");
  console.error("Example: node scripts/convert-kml.mjs my-project.kml");
  process.exit(1);
}

const kmlPath = path.resolve(args[0]);
if (!fs.existsSync(kmlPath)) {
  console.error(`File not found: ${kmlPath}`);
  process.exit(1);
}

console.log(`Reading KML file: ${kmlPath}`);
const kmlData = fs.readFileSync(kmlPath, 'utf8');

console.log("Converting KML to GeoJSON...");
const parser = new DOMParser();
const kmlDoc = parser.parseFromString(kmlData, 'text/xml');
const geojson = toGeoJSON.kml(kmlDoc);

console.log(`Found ${geojson.features.length} features.`);

const plots = [];
const zones = [];

// Convert standard GeoJSON features to PlotVerse format
geojson.features.forEach((feature, index) => {
  let geometry = feature.geometry;

  // Automatically convert closed LineStrings to Polygons
  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates;
    if (coords.length >= 4) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      // Check if it's a closed loop
      if (Math.abs(first[0] - last[0]) < 0.000001 && Math.abs(first[1] - last[1]) < 0.000001) {
        // Ensure they match exactly for Turf
        coords[coords.length - 1] = coords[0];
        geometry = { type: 'Polygon', coordinates: [coords] };
      }
    }
  }

  if (geometry.type === 'Polygon') {
    // Calculate area
    const polyFeature = turf.polygon(geometry.coordinates);
    const areaSqm = turf.area(polyFeature);
    const center = turf.centerOfMass(polyFeature).geometry.coordinates;

    const plot = {
      id: `plot-${index}`,
      projectId: "single",
      number: feature.properties.name || `P-${index + 1}`,
      geometry: geometry,
      areaSqm: Math.round(areaSqm),
      status: "available", // default status
      centroid: center,
      points: geometry.coordinates[0],
    };
    plots.push(plot);
  } else {
     // Handle zones/roads if needed
     console.log(`Skipped non-polygon feature: ${feature.properties.name || 'Unnamed'} (${geometry.type})`);
  }
});

const existingDataPath = path.resolve('public/data/plot-data.json');
let existingData = { plots: [], zones: [], project: {} };

if (fs.existsSync(existingDataPath)) {
    const raw = fs.readFileSync(existingDataPath, 'utf8');
    existingData = JSON.parse(raw);
}

// Calculate the center of the entire project
let projectCenter = [0, 0];
if (plots.length > 0) {
  const allFeatures = turf.featureCollection(plots.map(p => turf.polygon([p.points])));
  const centerPoint = turf.center(allFeatures);
  projectCenter = centerPoint.geometry.coordinates;
}

// Preserve project data, replace plots, update center
const newData = {
    project: {
      ...existingData.project,
      center: projectCenter
    },
    plots: plots,
    zones: existingData.zones || []
};

fs.writeFileSync(existingDataPath, JSON.stringify(newData, null, 2));

console.log(`\nSuccess! Wrote ${plots.length} plots to public/data/plot-data.json`);
console.log("To push these changes to your live site, run:");
console.log("git add public/data/plot-data.json");
console.log("git commit -m \"Update plot data from KML\"");
console.log("git push");
