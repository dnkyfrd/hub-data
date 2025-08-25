const fs = require('fs');
const fetch = require('node-fetch');

const cities = [
  { name: 'antwerp-mechelen-waasland', endpoints: ['https://stables.donkey.bike/api/public/nearby?filter_type=account&account_id=803'] },
  { name: 'de-panne', endpoints: ['https://stables.donkey.bike/api/public/cities/561/hubs/'] },
  { name: 'ghent', endpoints: ['https://stables.donkey.bike/api/public/cities/223/hubs/'] },
  { name: 'koksijde', endpoints: ['https://stables.donkey.bike/api/public/cities/8/hubs/'] },
  // ... include all 40 cities here
];

// Helper to set headers based on endpoint type
function getFetchOptions(url) {
  if (url.includes('/nearby?')) {
    return { method: 'GET' }; // query params already in URL
  } else if (url.includes('/cities/')) {
    return { method: 'GET', headers: { 'Accept': 'application/com.donkeyrepublic.v8' } };
  } else {
    return { method: 'GET' };
  }
}

async function fetchCityData(city) {
  let allHubs = [];

  for (const url of city.endpoints) {
    try {
      const options = getFetchOptions(url);
      const res = await fetch(url, options);
      const data = await res.json();
      allHubs = allHubs.concat(data);
    } catch (err) {
      console.error(`Error fetching ${url}:`, err);
    }
  }

  const geojson = {
    type: "FeatureCollection",
    features: allHubs.map(hub => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [hub.longitude, hub.latitude] },
      properties: {
        name: hub.name,
        address: hub.address || '',
        city: city.name
      }
    }))
  };

  fs.writeFileSync(`data/${city.name}.json`, JSON.stringify(geojson, null, 2));
  console.log(`Saved ${city.name}.json (${geojson.features.length} hubs)`);
}

async function main() {
  for (const city of cities) {
    console.log(`Fetching ${city.name}...`);
    await fetchCityData(city);
  }
  console.log('All cities processed.');
}

main();
