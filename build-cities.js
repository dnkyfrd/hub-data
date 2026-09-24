// build-cities.js
//
// Keeps hub-data/hubs-cities.json in sync with the `cities` config in fetch-json.js.
//
// The website reads this file as-is, so this script is deliberately ADDITIVE:
// existing entries are never renamed, reordered, re-numbered or removed. It only
// appends cities that are configured in fetch-json.js but not yet listed, using
// the next free `id` in the existing 1000+ sequence.
import fs from "fs";
import fetch from "node-fetch";
import { cities } from "./fetch-json.js";

const CITIES_FILE = "hub-data/hubs-cities.json";
const CITIES_API = "https://stables.donkey.bike/api/public/cities/";
const HEADERS = { Accept: "application/com.donkeyrepublic.v8" };

// A handful of city IDs serve hubs but are not published in the public cities
// index, so their name/country can't be looked up. Coordinates are still derived
// from live hub data rather than hardcoded.
const UNLISTED = {
  283: { name: "Helsinki", country_code: "FI" },
  515: { name: "Gorinchem", country_code: "NL" },
  584: { name: "Düsseldorf", country_code: "DE" },
};

// City IDs intentionally left out of hubs-cities.json, with the reason why.
const SKIP = {
  53: "Lausanne EPFL — campus hubs, already covered by the 'Lausanne' entry",
  723: "Hannover surroundings — already covered by the 'Hannover' entry",
};

// The file predates the public API and uses its own spellings. Map API names onto
// the existing entries so we don't append a duplicate pin.
const ALIASES = {
  copenhagen: "København",
  oegstgeest: "Oestgeest",
  zwijndrechtnl: "Zwijndrecht",
};

const normalize = (name) =>
  name.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");

// Existing entries store coordinates as 4-decimal strings.
const coord = (value) => Number(value).toFixed(4);

/** Average the hub coordinates of a city to get a usable centroid. */
async function centroidFromHubs(cityId) {
  const res = await fetch(`${CITIES_API}${cityId}/hubs/`, { headers: HEADERS });
  if (!res.ok) throw new Error(`hubs for ${cityId}: ${res.status} ${res.statusText}`);

  const hubs = await res.json();
  if (!Array.isArray(hubs) || hubs.length === 0) {
    throw new Error(`hubs for ${cityId}: no hubs returned`);
  }

  const mean = (key) =>
    hubs.reduce((sum, hub) => sum + Number(hub[key]), 0) / hubs.length;

  return { latitude: coord(mean("latitude")), longitude: coord(mean("longitude")) };
}

/** Every unique Stables city ID referenced by the `cities` config. */
function configuredCityIds() {
  const ids = new Set();
  for (const city of cities) {
    for (const url of city.endpoints) {
      const match = url.match(/cities\/(\d+)\/hubs/);
      if (match) ids.add(Number(match[1]));
    }
  }
  return [...ids];
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(CITIES_FILE, "utf8"));
  const listed = new Set(existing.map((city) => normalize(city.name)));

  const res = await fetch(CITIES_API, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch cities index: ${res.status} ${res.statusText}`);
  }
  const index = new Map((await res.json()).map((city) => [city.id, city]));

  let nextId = Math.max(...existing.map((city) => city.id)) + 1;
  const added = [];

  for (const cityId of configuredCityIds()) {
    if (SKIP[cityId]) continue;

    const known = index.get(cityId);
    const unlisted = UNLISTED[cityId];

    if (!known && !unlisted) {
      console.warn(
        `⚠️  City ${cityId} is not in the public cities index and has no UNLISTED entry — skipped.`
      );
      continue;
    }

    const name = known ? known.name : unlisted.name;
    const alias = ALIASES[normalize(name)];
    if (listed.has(normalize(alias ?? name))) continue;

    let latitude;
    let longitude;
    if (known) {
      latitude = coord(known.latitude);
      longitude = coord(known.longitude);
    } else {
      try {
        ({ latitude, longitude } = await centroidFromHubs(cityId));
      } catch (err) {
        console.warn(`⚠️  Could not place ${name} (${cityId}): ${err.message} — skipped.`);
        continue;
      }
    }

    const entry = {
      id: nextId++,
      name,
      latitude,
      longitude,
      country_code: known ? known.country_code : unlisted.country_code,
    };

    existing.push(entry);
    listed.add(normalize(name));
    added.push(entry);
  }

  if (added.length === 0) {
    console.log("✅ hubs-cities.json already up to date.");
    return;
  }

  fs.writeFileSync(CITIES_FILE, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(`✅ Added ${added.length} cities to hubs-cities.json:`);
  for (const city of added) {
    console.log(`   ${city.id}  ${city.name} (${city.country_code})`);
  }
}

main();
