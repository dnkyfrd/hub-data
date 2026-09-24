# hub-data

Fetches public hub data from the Donkey Republic Stables API for each configured city and saves it as JSON in the `hub-data/` directory. A GitHub Action runs weekly (Sundays at 00:00 UTC) and can also be triggered manually.

## The two kinds of file in `hub-data/`

| File | Written by | Contents |
| --- | --- | --- |
| `hubs-<name>.json` | `fetch-json.js` | Every hub for that city, one file per `name` in the `cities` array. |
| `hubs-cities.json` | `build-cities.js` | One row per city (`id`, `name`, `latitude`, `longitude`, `country_code`) — the city list the website reads. |

`hubs-cities.json` was hand-maintained until September 2026 and had drifted out of sync, so newer cities (Helsinki, Oulu, Skive, Düsseldorf, Rotterdam, the Ruhrgebiet, …) were missing from it. `build-cities.js` now keeps it current.

## GitHub automation

The [`Fetch Hub Data`](./.github/workflows/fetch-data.yml) workflow runs automatically **every Sunday at 00:00 UTC**. It executes `fetch-json.js` then `build-cities.js`, writes any changes to `hub-data/*.json`, and commits them back to `main` as a `🤖 Auto-update hub data` commit.

### Triggering a run manually

If you've just added a new city and don't want to wait for the next scheduled run, kick it off manually:

1. Go to the [Actions tab](../../actions/workflows/fetch-data.yml) of this repo.
2. Select **Fetch Hub Data** in the left sidebar.
3. Click **Run workflow** → choose the `main` branch → **Run workflow**.

Within a minute or two the workflow will commit the new `hub-data/hubs-<name>.json` file, and the city will be live in Webflow as soon as it's wired up (see below).

## Adding a new city

1. **Find the city ID** in Stables:
   - Go to [https://stables.donkey.bike/superadmins/cities](https://stables.donkey.bike/superadmins/cities).
   - Search for the city you want to add.
   - Grab the numeric **ID** from the row (this is the `city_id`).
2. **Add an entry** to the `cities` array in [`fetch-json.js`](./fetch-json.js) using that ID:
   ```js
   { name: 'my-new-city', endpoints: ['https://stables.donkey.bike/api/public/cities/<CITY_ID>/hubs/'] },
   ```
   - `name` is the slug used for the output filename (`hub-data/hubs-<name>.json`).
   - If the city spans multiple Stables cities, add each endpoint URL to the `endpoints` array — the results are merged into one file.
3. **Commit and push** to `main`. The next scheduled run (or a manual `Fetch Hub Data` workflow run) will produce `hub-data/hubs-<name>.json` and append the city to `hub-data/hubs-cities.json`.
4. **Wire it up in Webflow**:
   - Open the city page in Webflow and scroll down to the map section.
   - Click into the `map-wrapp` component (don't ask why there are two p's).
   - Open the **Settings** menu on the right side and edit the `data-city-slug` Custom Attribute.
   - Change its value to the exact `name` you used in `fetch-json.js`.
   - **Save** and **Publish**.

## Known gaps

- **Thun** was removed from the `cities` array — `cities/242/hubs/` returns zero hubs, and the stale `hubs-thun.json` it left behind contained a single hub in Reykjavík. The Thun area is still represented in `hubs-cities.json` by its `Steffisburg` row. Re-add it if the city is repopulated in Stables.
- **`hubs-kiel-region.json` / `hubs-schlei-region.json`** are *not* generated. They were fed by `/nearby?filter_type=account&account_id=866`, which no longer responds; on 2025-09-12 both slugs were removed from `fetch-json.js` and the two files were frozen by hand. They are byte-identical and will not update. Kiel (`562`) currently serves zero hubs; Schleswig (`605`) serves 18 and city `516` serves 71, so a rebuild from per-city endpoints is possible if those pages need live data again.

## Running locally

```bash
npm ci
npm start          # fetch hubs, then sync the city list
```

Or run the two steps separately:

```bash
npm run fetch          # hubs-<name>.json only
npm run build-cities   # hubs-cities.json only
```

Output JSON files are written to `hub-data/`.

## How `build-cities.js` works

The website reads `hubs-cities.json` as-is, so the script is strictly **additive** — it never renames, reorders, re-numbers or removes an existing row. It reads the `cities` array from `fetch-json.js`, resolves each Stables city ID against the public cities index, and appends anything not already listed using the next free `id` in the existing `1000+` sequence. Running it twice is a no-op.

Three cases need manual help, all declared at the top of the script:

- **`UNLISTED`** — a few city IDs serve hubs but don't appear in the public cities index, so their name and country can't be looked up (currently Helsinki `283`, Gorinchem `515`, Düsseldorf `584`). Their coordinates are still derived live, by averaging their hub positions.
- **`SKIP`** — IDs deliberately left out, each with a reason (e.g. Lausanne EPFL is already covered by the `Lausanne` row).
- **`ALIASES`** — the file predates the public API and uses its own spellings (`København`, `Oestgeest`, `Zwijndrecht`), so API names are mapped onto them to avoid duplicate pins.

If you add a city whose ID isn't in the public index, the script prints a warning and skips it — add it to `UNLISTED` to include it.
