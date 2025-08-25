// fetch-json.js
// This script fetches parking hub data from various Donkey Republic API endpoints,
// processes it, and saves it as GeoJSON files for use with Mapbox or other mapping tools.
// The script is designed to be run as a scheduled GitHub Action.

const fs = require('fs');
const https = require('https');
const { URL } = require('url');

// Your cities with API endpoints
const cities = [
  {
    name: 'antwerp-mechelen-waasland',
    endpoints: ['https://stables.donkey.bike/api/public/nearby?filter_type=account&account_id=803']
  },
  {
    name: 'de-panne',
    endpoints: ['https://stables.donkey.bike/api/public/cities/561/hubs/']
  },
  {
    name: 'ghent',
    endpoints: ['https://stables.donkey.bike/api/public/cities/223/hubs/']
  },
  {
    name: 'koksijde',
    endpoints: ['https://stables.donkey.bike/api/public/cities/8/hubs/']
  },
  {
    name: 'veurne',
    endpoints: ['https://stables.donkey.bike/api/public/cities/475/hubs/']
  },
  {
    name: 'aarhus',
    endpoints: ['https://stables.donkey.bike/api/public/cities/205/hubs/']
  },
  {
    name: 'copenhagen',
    endpoints: ['https://stables.donkey.bike/api/public/cities/1/hubs/']
  },
  {
    name: 'randers',
    endpoints: ['https://stables.donkey.bike/api/public/cities/308/hubs/']
  },
  {
    name: 'roskilde',
    endpoints: ['https://stables.donkey.bike/api/public/cities/19/hubs/']
  },
  {
    name: 'kouvola',
    endpoints: ['https://stables.donkey.bike/api/public/cities/208/hubs/']
  },
  {
    name: 'turku',
    endpoints: ['https://stables.donkey.bike/api/public/cities/345/hubs/']
  },
  {
    name: 'hanover',
    endpoints: [
      'https://stables.donkey.bike/api/public/cities/592/hubs/',
      'https://stables.donkey.bike/api/public/cities/723/hubs/'
    ]
  },
  {
    name: 'kiel-region',
    endpoints: ['https://stables.donkey.bike/api/public/nearby?filter_type=account&account_id=866']
  },
  {
    name: 'ochtrup',
    endpoints: ['https://stables.donkey.bike/api/public/cities/350/hubs/']
  },
  {
    name: 'schlei-region',
    endpoints: [
      'https://stables.donkey.bike/api/public/nearby?filter_type=account&account_id=866',
      'https://stables.donkey.bike/api/public/cities/516/hubs/'
    ]
  },
  {
    name: 'straubing',
    endpoints: ['https://stables.donkey.bike/api/public/cities/336/hubs/']
  },
  {
    name: 'amsterdam',
    endpoints: ['https://stables.donkey.bike/api/public/cities/5/hubs/']
  },
  {
    name: 'dordrecht',
    endpoints: ['https://stables.donkey.bike/api/public/cities/355/hubs/']
  },
  {
    name: 'katwijk',
    endpoints: [
      'https://stables.donkey.bike/api/public/cities/645/hubs/',
      'https://stables.donkey.bike/api/public/cities/644/hubs/',
      'https://stables.donkey.bike/api/public/cities/643/hubs/'
    ]
  },
  {
    name: 'leiden',
    endpoints: [
      'https://stables.donkey.bike/api/public/cities/645/hubs/',
      'https://stables.donkey.bike/api/public/cities/644/hubs/',
      'https://stables.donkey.bike/api/public/cities/643/hubs/'
    ]
  },
  {
    name: 'oegstgeest',
    endpoints: [
      'https://stables.donkey.bike/api/public/cities/645/hubs/',
      'https://stables.donkey.bike/api/public/cities/644/hubs/',
      'https://stables.donkey.bike/api/public/cities/643/hubs/'
    ]
  },
  {
    name: 'rotterdam',
    endpoints: ['https://stables.donkey.bike/api/public/cities/21/hubs/']
  },
  {
    name: 'the-hague',
    endpoints: ['https://stables.donkey.bike/api/public/cities/306/hubs/']
  },
  {
    name: 'barcelona',
    endpoints: ['https://stables.donkey.bike/api/public/cities/1/hubs/']
  },
  {
    name: 'varberg',
    endpoints: ['https://stables.donkey.bike/api/public/cities/315/hubs/']
  },
  {
    name: 'geneva',
    endpoints: ['https://stables.donkey.bike/api/public/cities/217/hubs/']
  },
  {
    name: 'kreuzlingen',
    endpoints: ['https://stables.donkey.bike/api/public/cities/304/hubs/']
  },
  {
    name: 'lausanne-epfl',
    endpoints: ['https://stables.donkey.bike/api/public/cities/53/hubs/']
  },
  {
    name: 'neuchatel',
    endpoints: ['https://stables.donkey.bike/api/public/cities/142/hubs/']
  },
  {
    name: 'thun',
    endpoints: ['https://stables.donkey.bike/api/public/cities/242/hubs/']
  },
  {
    name: 'yverdon-les-bains',
    endpoints: ['https://stables.donkey.bike/api/public/cities/240/hubs/']
  }
];

/**
 * Determines the correct HTTP headers based on the API endpoint URL.
 * This is crucial for successful requests to Donkey Republic APIs.
 * @param {string} url The API endpoint URL.
 * @returns {object} The headers object to be used in the request.
 */
function getRequestHeaders(url) {
  if (url.includes('/cities/') && url.includes('/hubs/')) {
    // Style 1: Cities endpoint
    return {
      'Accept': 'application/com.donkeyrepublic.v8',
      'User-Agent': 'DonkeyHubProcessor/1.0'
    };
  } else if (url.includes('nearby?filter_type=account&account_id=')) {
    // Style 2: Nearby endpoint with account filter
    const urlObj = new URL(url);
    const accountId = urlObj.searchParams.get('account_id');
    return {
      'Accept': 'application/json',
      'User-Agent': 'DonkeyHubProcessor/1.0',
      'filter_type': 'account',
      'account_id': accountId
    };
  } else {
    // Default fallback headers
    return {
      'Accept': 'application/json',
      'User-Agent': 'DonkeyHubProcessor/1.0'
    };
  }
}

/**
 * Fetches data from a single API endpoint using the https module.
 * @param {string} url The endpoint URL.
 * @returns {Promise<object>} A promise that resolves with the parsed JSON data.
 */
async function fetchHubData(url) {
  return new Promise((resolve, reject) => {
    const headers = getRequestHeaders(url);
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`JSON Parse Error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request Error: ${error.message}`));
    });

    // Set a timeout for the request
    req.setTimeout(15000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Transforms an array of hub data into a standard GeoJSON FeatureCollection format.
 * This makes the data ready to be used by mapping libraries like Mapbox.
 * @param {object[]} hubData An array of hub objects.
 * @returns {object[]} An array of GeoJSON Feature objects.
 */
function transformToGeoJSON(hubData) {
  let hubs = [];
  if (Array.isArray(hubData)) {
    hubs = hubData;
  } else if (hubData.hubs && Array.isArray(hubData.hubs)) {
    hubs = hubData.hubs;
  } else if (hubData.data && Array.isArray(hubData.data)) {
    hubs = hubData.data;
  } else if (hubData.results && Array.isArray(hubData.results)) {
    hubs = hubData.results;
  } else {
    console.warn('Warning: Unexpected data format. Returning empty array.');
    return [];
  }

  const features = hubs.map(hub => {
    const lat = hub.latitude || hub.lat || hub.position?.latitude;
    const lng = hub.longitude || hub.lng || hub.lon || hub.position?.longitude;

    if (!lat || !lng) {
      return null;
    }

    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)] // GeoJSON requires [longitude, latitude]
      },
      properties: {
        id: hub.id || hub.hub_id,
        name: hub.name || hub.title || `Hub ${hub.id}`,
        address: hub.address || hub.street_address || '',
        city: hub.city || '',
        capacity: hub.capacity || hub.bike_capacity || 0,
        available_bikes: hub.available_bikes || hub.bikes_available || 0,
        hub_type: hub.hub_type || 'standard',
        status: hub.status || 'active'
      }
    };
  }).filter(feature => feature !== null); // Filter out any invalid features

  return features;
}

/**
 * Main function to process all cities.
 */
async function processAllCities() {
  console.log('Starting Donkey Republic hub data processing...');

  // Create output directory if it doesn't exist
  if (!fs.existsSync('./hub-data')) {
    fs.mkdirSync('./hub-data');
    console.log('Created ./hub-data directory');
  }

  let totalHubs = 0;

  for (const city of cities) {
    try {
      console.log(`\nProcessing ${city.name}...`);
      let allFeatures = [];

      // Process each endpoint for this city
      for (const endpoint of city.endpoints) {
        try {
          const hubData = await fetchHubData(endpoint);
          const features = transformToGeoJSON(hubData);
          allFeatures = allFeatures.concat(features);
          console.log(`  - Found ${features.length} hubs from ${endpoint}`);
        } catch (error) {
          console.error(`  - Error with ${endpoint}: ${error.message}`);
        }
      }

      // Remove duplicate hubs (same ID)
      const uniqueFeatures = [];
      const seenIds = new Set();
      for (const feature of allFeatures) {
        if (!seenIds.has(feature.properties.id)) {
          seenIds.add(feature.properties.id);
          uniqueFeatures.push(feature);
        }
      }

      // Create final GeoJSON structure
      const geoJsonData = {
        type: "FeatureCollection",
        features: uniqueFeatures,
        metadata: {
          city: city.name,
          total_hubs: uniqueFeatures.length,
          generated_at: new Date().toISOString(),
          endpoints: city.endpoints
        }
      };

      // Save city file
      const fileName = `hubs-${city.name}.json`;
      fs.writeFileSync(`./hub-data/${fileName}`, JSON.stringify(geoJsonData, null, 2));

      totalHubs += uniqueFeatures.length;
      console.log(`  Saved ${uniqueFeatures.length} unique hubs to ${fileName}`);

      // Rate limiting - wait 200ms between cities to be respectful of the API
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ Fatal error processing ${city.name}:`, error.message);
    }
  }

  console.log(`\nProcessing complete!`);
  console.log(`Total hubs processed: ${totalHubs}`);
}

// Start the process
processAllCities().catch(error => {
  console.error('💥 An unexpected error occurred:', error);
  process.exit(1);
});
