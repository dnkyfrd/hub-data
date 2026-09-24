// purge-jsdelivr.js
//
// Purges files from the jsDelivr CDN after they change on `main`.
//
// jsDelivr caches branch URLs (`@main`) at the edge for 12 hours, so without this
// the website can serve hub data up to half a day out of date after a run. Reads
// newline-separated, repo-relative paths on stdin:
//
//   git diff --name-only ... | node purge-jsdelivr.js
//
// Purging is best-effort: a failure here only means the CDN catches up on its own
// 12-hour TTL, so it logs and exits 0 rather than failing the workflow.
import fetch from "node-fetch";

const PURGE_API = "https://purge.jsdelivr.net/";
const BATCH_SIZE = 20; // jsDelivr accepts at most 20 paths per request.

const repo = process.env.GITHUB_REPOSITORY || "dnkyfrd/hub-data";
const branch = process.env.GITHUB_REF_NAME || "main";

/** Percent-encode each path segment; some files have non-ASCII names (hubs-düsseldorf.json). */
const toCdnPath = (file) =>
  `/gh/${repo}@${branch}/${file.split("/").map(encodeURIComponent).join("/")}`;

async function readStdin() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enqueue a purge job and wait for it to finish. The POST API is asynchronous:
 * it returns a job id, and per-path results only appear once the job completes.
 */
async function purge(paths) {
  const res = await fetch(PURGE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: paths }),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  let job = await res.json();
  for (let attempt = 0; job.status !== "finished" && attempt < 30; attempt++) {
    await sleep(1000);
    const poll = await fetch(`${PURGE_API}status/${job.id}`);
    if (!poll.ok) throw new Error(`status ${poll.status} ${poll.statusText}`);
    job = await poll.json();
  }

  if (job.status !== "finished") {
    throw new Error(`job ${job.id} still ${job.status} after 30s`);
  }
  return job;
}

async function main() {
  const files = (await readStdin())
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (files.length === 0) {
    console.log("Nothing changed — no cache to purge.");
    return;
  }

  const paths = files.map(toCdnPath);
  let purged = 0;
  let throttled = 0;

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);
    try {
      const result = await purge(batch);
      for (const [path, info] of Object.entries(result.paths ?? {})) {
        if (info.throttled) {
          throttled++;
          console.warn(`⏳ throttled: ${path}`);
        } else {
          purged++;
        }
      }
    } catch (err) {
      console.warn(`⚠️  Purge request failed: ${err.message}`);
    }
  }

  console.log(
    `✅ Purged ${purged}/${files.length} files from jsDelivr` +
      (throttled ? ` (${throttled} throttled — they expire on the 12h TTL)` : "")
  );
}

main();
