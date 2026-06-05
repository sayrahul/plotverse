import fs from 'fs';
import shp from 'shpjs';
import path from 'path';

async function extract() {
  try {
    const zipPath = path.resolve('data/mygeodata.zip');
    const zipBuffer = fs.readFileSync(zipPath);
    
    // Parse shapefile buffer
    const geojson = await shp(zipBuffer);
    
    // shpjs might return a FeatureCollection or an array of FeatureCollections
    const finalGeojson = Array.isArray(geojson) ? geojson[0] : geojson;
    
    fs.writeFileSync('data/mygeodata.geojson', JSON.stringify(finalGeojson, null, 2));
    console.log(`Successfully extracted ${finalGeojson.features?.length || 0} features to data/mygeodata.geojson`);
  } catch (error) {
    console.error("Error parsing shapefile:", error);
  }
}

extract();
