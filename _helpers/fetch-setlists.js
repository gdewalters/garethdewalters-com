// _helpers/fetch-setlists.mjs
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import 'dotenv/config';

const API_BASE = "https://api.setlist.fm/rest/1.0";
const API_KEY = process.env.SETLISTFM_API_KEY;
const USERNAME = process.env.SETLISTFM_USERNAME;         // e.g. 'my_setlist_username'
const ACCEPT_LANGUAGE = process.env.SETLISTFM_LOCALE || "en";
const SCHEMA_VERSION = 1;

// Behavior toggles
const FULL_RESCAN = process.env.SETLISTFM_FULL_RESCAN === "1";  // force full run
const ALWAYS_REFRESH_PAGES = Number(process.env.SETLISTFM_REFRESH_PAGES || "3");
// How many newest pages to always recheck for edits (20 items/page). Default 3.

if (!API_KEY) throw new Error("SETLISTFM_API_KEY not set");
if (!USERNAME) throw new Error("SETLISTFM_USERNAME not set");

const OUT_DIR = "./_data";
const INDEX_FILE = path.join(OUT_DIR, "setlists.attended.index.json");
const ROLLUP_FILE = path.join(OUT_DIR, "setlists.attended.json");
const DETAIL_DIR = path.join(OUT_DIR, "setlists.attended.detail");

const HEADERS = {
  "x-api-key": API_KEY,
  "Accept": "application/json",
  "Accept-Language": ACCEPT_LANGUAGE,
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithBackoff(url, attempt = 1) {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
    const wait = retryAfter ? retryAfter * 1000 : Math.min(30000, 500 * (2 ** attempt));
    await sleep(wait);
    return fetchWithBackoff(url, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} for ${url}\n${text}`);
  }
  return res.json();
}

function normalizeSetlist(sl) {
  const festival = sl?.event?.festival
    ? { id: sl.event.festival.id, name: sl.event.festival.name }
    : null;

  return {
    id: sl.id,
    eventDate: sl.eventDate,            // DD-MM-YYYY
    lastUpdated: sl.lastUpdated ?? null, // often ISO 8601
    artist: {
      name: sl.artist?.name ?? null,
      mbid: sl.artist?.mbid ?? null,
      tmid: sl.artist?.tmid ?? null,
      disambiguation: sl.artist?.disambiguation ?? null,
    },
    venue: {
      name: sl.venue?.name ?? null,
      city: sl.venue?.city?.name ?? null,
      state: sl.venue?.city?.state ?? null,
      stateCode: sl.venue?.city?.stateCode ?? null,
      country: sl.venue?.city?.country?.name ?? null,
      countryCode: sl.venue?.city?.country?.code ?? null,
      coords: sl.venue?.city?.coords ?? null,
    },
    tour: sl.tour?.name ?? null,
    festival,
    url: sl.url ?? null,
    sets: sl.sets?.set ?? [],
  };
}

function toIndexEntry(n) {
  return {
    id: n.id,
    eventDate: n.eventDate,
    artist: n.artist?.name ?? null,
    venue: n.venue?.name ?? null,
    city: n.venue?.city ?? null,
    country: n.venue?.country ?? null,
    countryCode: n.venue?.countryCode ?? null,
    festival: n.festival ? n.festival.name : null,
    tour: n.tour,
    url: n.url,
    lastUpdated: n.lastUpdated,
  };
}

async function readJsonSafe(file) {
  try {
    const buf = await fs.readFile(file, "utf8");
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

function sha256(obj) {
  const json = JSON.stringify(obj);
  return crypto.createHash("sha256").update(json).digest("hex");
}

async function ensureDirs() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(DETAIL_DIR, { recursive: true });
}

function toISODate(d) {
  try { return new Date(d).toISOString(); } catch { return null; }
}

function isAfter(aISO, bISO) {
  if (!aISO || !bISO) return false;
  return new Date(aISO).getTime() > new Date(bISO).getTime();
}

async function fetchUserAttendedPage(username, page) {
  const usp = new URLSearchParams({ p: String(page) });
  const url = `${API_BASE}/user/${encodeURIComponent(username)}/attended?${usp}`;
  const data = await fetchWithBackoff(url);
  const items = Array.isArray(data.setlist) ? data.setlist : (data.setlist ? [data.setlist] : []);
  return items.map(normalizeSetlist);
}

async function paginateUserAttendedDelta(username, knownIds, alwaysRefreshPages, lastHarvestISO) {
  // Strategy:
  // 1) Always refetch first N pages to catch edits.
  // 2) Continue paging until we hit a page that is entirely known AND older than last harvest.
  const all = [];
  let page = 1;
  let hitOldAndKnown = false;

  while (true) {
    const pageNorm = await fetchUserAttendedPage(username, page);
    if (!pageNorm.length) break;

    all.push(...pageNorm);

    const pageAllKnown = pageNorm.every(sl => knownIds.has(sl.id));
    const pageAllOlder =
      lastHarvestISO
        ? pageNorm.every(sl => !isAfter(sl.lastUpdated, lastHarvestISO))
        : false;

    const pageSize = pageNorm.length;

    if (page > alwaysRefreshPages && pageAllKnown && (pageAllOlder || pageSize < 20)) {
      hitOldAndKnown = true;
    }

    if (pageSize < 20 || hitOldAndKnown) break;
    page++;
  }
  return all;
}

async function run() {
  await ensureDirs();

  const previousIndex = await readJsonSafe(INDEX_FILE);
  const prevIds = new Set((previousIndex?.items ?? []).map(i => i.id));
  const lastHarvestISO = previousIndex?.harvestedAt || null;

  let harvested;
  if (FULL_RESCAN) {
    // brute force until empty page
    harvested = [];
    for (let p = 1; ; p++) {
      const pageNorm = await fetchUserAttendedPage(USERNAME, p);
      if (!pageNorm.length) break;
      harvested.push(...pageNorm);
      if (pageNorm.length < 20) break;
    }
  } else {
    harvested = await paginateUserAttendedDelta(
      USERNAME,
      prevIds,
      ALWAYS_REFRESH_PAGES,
      lastHarvestISO
    );
  }

  // Merge into existing index
  const indexMap = new Map();
  if (previousIndex?.items?.length) {
    for (const idx of previousIndex.items) indexMap.set(idx.id, idx);
  }

  // Track which details to (re)write
  const detailWrites = new Set();

  for (const sl of harvested) {
    const idx = toIndexEntry(sl);
    const was = indexMap.get(sl.id);
    const changed = JSON.stringify(was) !== JSON.stringify(idx);
    indexMap.set(sl.id, idx);

    // Rewrite detail if:
    // - it's new, or
    // - lastUpdated is newer than last harvest, or
    // - the summary changed (conservative)
    if (!was || isAfter(sl.lastUpdated, lastHarvestISO) || changed) {
      detailWrites.add(sl.id);
    }
  }

  // Sort index newest first by event date
  const items = Array.from(indexMap.values()).sort((a, b) => {
    const [da, ma, ya] = (a.eventDate || "").split("-").map(Number);
    const [db, mb, yb] = (b.eventDate || "").split("-").map(Number);
    const ka = `${ya ?? 0}-${String(ma ?? 0).padStart(2, "0")}-${String(da ?? 0).padStart(2, "0")}`;
    const kb = `${yb ?? 0}-${String(mb ?? 0).padStart(2, "0")}-${String(db ?? 0).padStart(2, "0")}`;
    if (ka < kb) return 1;
    if (ka > kb) return -1;
    return (a.artist || "").localeCompare(b.artist || "");
  });

  // Write detail files only for IDs in detailWrites (or all, on full rescan)
  const toWriteIds = FULL_RESCAN ? items.map(i => i.id) : Array.from(detailWrites);
  const harvestedAt = new Date().toISOString();

  for (const id of toWriteIds) {
    // Find normalized object: if we saw it this run, use that; otherwise fetch a single page containing it
    const existing = harvested.find(s => s.id === id);
    const sl = existing || null;

    if (!sl) {
      // Safety net: pull detail from old file if present
      const oldDetail = await readJsonSafe(path.join(DETAIL_DIR, `${id}.json`));
      if (oldDetail?.setlist) {
        await fs.writeFile(path.join(DETAIL_DIR, `${id}.json`), JSON.stringify({
          ...oldDetail,
          schemaVersion: SCHEMA_VERSION,
          harvestedAt,
        }, null, 2));
        continue;
      }
      // As a last resort, skip (we only harvest via list endpoints here)
      console.warn(`⚠️ Skipped detail for ${id} (not found in current pages, no old detail).`);
      continue;
    }

    await fs.writeFile(path.join(DETAIL_DIR, `${id}.json`), JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      harvestedAt,
      username: USERNAME,
      setlist: sl,
    }, null, 2));
  }

  // Build index doc
  const indexDoc = {
    schemaVersion: SCHEMA_VERSION,
    harvestedAt,
    username: USERNAME,
    count: items.length,
    items
  };

  // Integrity check to avoid churny commits
  const previousHash = previousIndex?.__integrityHash || null;
  const nextHash = sha256({ schemaVersion: SCHEMA_VERSION, items });
  if (previousHash !== nextHash) {
    await fs.writeFile(INDEX_FILE, JSON.stringify({ ...indexDoc, __integrityHash: nextHash }, null, 2));
    console.log(`✅ Wrote index (${items.length} items). Details written: ${toWriteIds.length}`);
  } else {
    console.log("ℹ️ No index changes. Detail writes:", toWriteIds.length);
  }

  // Optional rollup (quick analytics)
  const rollup = {
    schemaVersion: SCHEMA_VERSION,
    harvestedAt,
    username: USERNAME,
    summary: {
      total: items.length,
      festivals: items.filter(i => i.festival).length,
      uniqueArtists: new Set(items.map(i => i.artist).filter(Boolean)).size,
      byCountry: Object.fromEntries(
        [...items.reduce((m, i) => {
          const k = i.countryCode || "??";
          m.set(k, (m.get(k) || 0) + 1);
          return m;
        }, new Map())].sort((a, b) => b[1] - a[1])
      )
    }
  };
  await fs.writeFile(ROLLUP_FILE, JSON.stringify(rollup, null, 2));
}

run().catch(err => {
  console.error("❌ Harvest failed:", err);
  process.exit(1);
});
