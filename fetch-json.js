// fetch-json.js
import fs from "fs";
import fetch from "node-fetch";

// All your hub cities + endpoints
const cities = [
  {
    name: 'antwerp',
    endpoints: [
      'https://stables.donkey.bike/api/public/nearby?filter_type=account&account_id=803'
    ]
  },
  { name: 'de-panne', endpoints: ['https://stables.donkey.bike/api/public/cities/561/hubs/'] },
  { name: 'ghent', endpoints: ['https://stables.donkey.bike/api/public/cities/223/hubs/'] },
  { name: 'koksijde', endpoints: ['https://stables.donkey.bike/api/public/cities/8/hubs/'] },
  { name: 'veurne', endpoints: ['https://stables.donkey.bike/api/public/cities/475/hubs/'] },
  { name: 'aarhus', endpoints: ['https://stables.donkey.bike/api/public/cities/205/hubs/'] },
  { name: 'copenhagen', endpoints: ['https://stables.donkey.bike/api/public/cities/1/hubs/'] },
  { name: 'randers', endpoints: ['https://stables.donkey.bike/api/public/cities/308/hubs/'] },
  { name: 'roskilde', endpoints: ['https://stables.donkey.bike/api/public/cities/19/hubs/'] },
  { name: 'kouvola', endpoints: ['https://stables.donkey.bike/api/public/cities/208/hubs/'] },
  { name: 'turku', endpoints: ['https://stables.donkey.bike/api/public/cities/345/hubs/'] },
  {
    name: 'hanover', endpoints: [
      'https://stables.donkey.bike/api/public/cities/592/hubs/',
      'https://stables.donkey.bike/api/public/cities/723/hubs/'
    ]
  },
  {
    name: 'kiel-region', endpoints: [
      'https://stables.donkey.bike/api/public/nearby?filter_type=account&account_id=866'
    ]
  },
  { name: 'ochtrup', endpoints: ['https://stables.donkey.bike/api/public/cities/350/hubs/'] },
  {
    name: 'schlei-region', endpoints: [
      'https://stables.donkey.bike/api/public/nearby?filter_type=account&account_id=866',
      'https://stables.donkey.bike/api/public/cities/516/hubs/'
    ]
  },
  { name: 'straubing', endpoints: ['https://stables.donkey.bike/api/public/cities/336/hubs/'] },
  { name: 'amsterdam', endpoints: ['https://stables.donkey.bike/api/public/cities/5/hubs/'] },
  { name: 'dordrecht', endpoints: ['https://stables.donkey.bike/api/public/cities/355/hubs/'] },
  {
    name: 'katwijk', endpoints: [
      'https://stables.donkey.bike/api/public/cities/645/hubs/',
      'https://stables.donkey.bike/api/public/cities/644/hubs/',
      'https://stables.donkey.bike/api/public/cities/643/hubs/'
    ]
  },
  {
    name: 'leiden', endpoints: [
      'https://stables.donkey.bike/api/public/cities/645/hubs/',
      'https://stables.donkey.bike/api/public/cities/644/hubs/',
      'https://stables.donkey.bike/api/public/cities/643/hubs/'
    ]
  },
  {
    name: 'oegstgeest', endpoints: [
      'https://stables.donkey.bike/api/public/cities/645/hubs/',
      'https://stables.donkey.bike/api/public/cities/644/hubs/',
      'https://stables.donkey.bike/api/public/cities/643/hubs/'
    ]
  },
  { name: 'rotterdam', endpoints: ['https://stables.donkey.bike/api/public/cities/21/hubs/'] },
  { name: 'the-hague', endpoints: ['https://stables.donkey.bike/api/public/cities/306/hubs/'] },
  { name: 'barcelona', endpoints: ['https://stables.donkey.bike/api/public/cities/1/hubs/'] },
  { name: 'varberg', endpoints: ['https://stables.donkey.bike/api/public/cities/315/hubs/'] },
  { name: 'geneva', endpoints: ['https://stables.donkey.bike/api/public/cities/217/hubs/'] },
  { name: 'kreuzlingen', endpoints: ['https://stables.donkey.bike/api/public/cities/304/hubs/'] },
  { name: 'lausanne-epfl', endpoints: ['https://stables.donkey.bike/api/public/cities/53/hubs/'] },
  { name: 'neuchatel', endpoints: ['https://stables.donkey.bike/api/public/cities/142/hubs/'] },
  { name: 'thun', endpoints: ['https://stables.donkey.bike/api/public/cities/242/hubs/'] },
  { name: 'yverdon-les-bains', endpoints: ['https://stables.donkey.bike/api/public/cities/240/hubs/'] }
];

/**
 * Returns the necessary headers for the API request based on the URL.
 * @param {string} url - The URL being fetched.
 * @returns {object} - The headers object.
 */
function getHeaders(url) {
  // Handle /cities endpoints, which require a specific 'Accept' header.
  if (url.includes("/api/public/cities/")) {
    return { "Accept": "application/com.donkeyrepublic.v8" };
  }

  // Handle /nearby endpoints, which require filter_type and account_id as headers.
  if (url.includes("/api/public/nearby")) {
    // Extract account_id from the URL query parameters to use in the header.
    const match = url.match(/account_id=(\d+)/);
    const accountId = match ? match[1] : "";
    return {
      "filter_type": "account",
      "account_id": accountId
    };
  }

  // Fallback for any other URLs.
  return {};
}

/**
 * Fetches all hub data for a given city from its API endpoints.
 * @param {object} city - The city object with name and endpoints.
 */
async function fetchCityData(city) {
  console.log(`\nFetching ${city.name}...`);
  let allData = [];

  for (const url of city.endpoints) {
    try {
      const headers = getHeaders(url);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.error(`❌ Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        continue;
      }
      const data = await res.json();
      
      // Normalize the data structure.
      // The '/nearby' endpoint returns an object with a 'stations' key.
      // The '/hubs' endpoint returns the array of hubs directly.
      const hubs = Array.isArray(data) ? data : data.stations || [];
      
      allData = allData.concat(hubs);
    } catch (err) {
      console.error(`❌ Error fetching ${url}:`, err);
    }
  }

  if (allData.length > 0) {
    // Save files to the 'hub-data' directory to match the workflow output.
    const filePath = `hub-data/hubs-${city.name}.json`;
    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
    console.log(`✅ Saved ${city.name} (${allData.length} hubs)`);
  } else {
    console.warn(`⚠️ No data for ${city.name}`);
  }
}

// Ensure the 'hub-data' directory exists before writing files.
if (!fs.existsSync("hub-data")) {
  fs.mkdirSync("hub-data");
}

/**
 * Main function to iterate over all cities and fetch their data.
 */
async function main() {
  for (const city of cities) {
    await fetchCityData(city);
  }
  console.log("\n🚀 All cities processed!");
}

main();
