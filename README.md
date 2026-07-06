# hub-data

Fetches public hub data from the Donkey Republic Stables API for each configured city and saves it as JSON in the `hub-data/` directory. A GitHub Action runs weekly (Sundays at 00:00 UTC) and can also be triggered manually.

## GitHub automation

The [`Fetch Hub Data`](./.github/workflows/fetch-data.yml) workflow runs automatically **every Sunday at 00:00 UTC**. It executes `fetch-json.js`, writes any changes to `hub-data/*.json`, and commits them back to `main` as a `🤖 Auto-update hub data` commit.

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
3. **Commit and push** to `main`. The next scheduled run (or a manual `Fetch Hub Data` workflow run) will produce `hub-data/hubs-<name>.json`.
4. **Wire it up in Webflow**:
   - Open the city page in Webflow and scroll down to the map section.
   - Click into the `map-wrapp` component (don't ask why there are two p's).
   - Open the **Settings** menu on the right side and edit the `data-city-slug` Custom Attribute.
   - Change its value to the exact `name` you used in `fetch-json.js`.
   - **Save** and **Publish**.

## Running locally

```bash
npm ci
npm start
```

Output JSON files are written to `hub-data/`.
