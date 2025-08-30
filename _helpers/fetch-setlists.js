// _helpers/fetch-setlists.js
// Fetch and cache Setlist.fm attended setlists with robust error handling and incremental updates.
// Requires environment variables:
// - SETLISTFM_API_KEY: Your Setlist.fm API key
// - SETLISTFM_USERNAME: Your Setlist.fm username
// - SETLISTFM_LOCALE: (optional) Preferred language for responses, default "en"
// - SETLISTFM_FULL_RESCAN: (optional) Set to "1" to force a full rescan
// - SETLISTFM_REFRESH_PAGES: (optional) Number of newest pages to always refresh, default 3    

// _helpers/fetch-setlists.mjs
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import 'dotenv/config'; // Ensure dotenv is configured to load your env vars

const API_BASE = "https://api.setlist.fm/rest/1.0";
const API_KEY = process.env.SETLISTFM_API_KEY;
const USERNAME = process.env.SETLISTFM_USERNAME;
const ACCEPT_LANGUAGE = process.env.SETLISTFM_LOCALE || "en";
const SCHEMA_VERSION = 1;

const FULL_RESCAN = process.env.SETLISTFM_FULL_RESCAN === "1";
const ALWAYS_REFRESH_PAGES = Number(process.env.SETLISTFM_REFRESH_PAGES || "3");

if (!API_KEY) throw new Error("SETLISTFM_API_KEY not set");
if (!USERNAME) throw new Error("SETLISTFM_USERNAME not set");

const OUT_DIR = "./_data";
const INDEX_FILE = path.join(OUT_DIR, "setlists.attended.index.json");
const ROLLUP_FILE = path.join(OUT_DIR, "setlists.attended.json");
const DETAIL_DIR = path.join(OUT_DIR, "setlists.attended.detail");
const VIEWS_FILE = path.join(OUT_DIR, "setlists.views.json"); // <— new

const HEADERS = {
  "x-api-key": API_KEY,
  "Accept": "application/json",
  "Accept-Language": ACCEPT_LANGUAGE,
};

async function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function fetchWithBackoff(url, attempt=1){
  const res = await fetch(url,{headers:HEADERS});
  if(res.status===429){
    const ra = parseInt(res.headers.get("retry-after")||"0",10);
    const wait = ra ? ra*1000 : Math.min(30000, 500*(2**attempt));
    await sleep(wait); return fetchWithBackoff(url, attempt+1);
  }
  if(!res.ok){ const t = await res.text(); throw new Error(`HTTP ${res.status} for ${url}\n${t}`); }
  return res.json();
}

function normalizeSetlist(sl){
  const festival = sl?.event?.festival ? {id: sl.event.festival.id, name: sl.event.festival.name} : null;
  return {
    id: sl.id,
    eventDate: sl.eventDate,            // DD-MM-YYYY
    lastUpdated: sl.lastUpdated ?? null,
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

function toIndexEntry(n){
  return {
    id: n.id,
    eventDate: n.eventDate,
    artist: n.artist?.name ?? null,
    venue: n.venue?.name ?? null,
    city: n.venue?.city ?? null,
    country: n.venue?.country ?? null,
    countryCode: n.venue?.countryCode ?? null,
    festival: n.festival?.name ?? null,
    tour: n.tour,
    url: n.url,
    lastUpdated: n.lastUpdated,
  };
}

async function readJsonSafe(file){
  try{ return JSON.parse(await fs.readFile(file,"utf8")); } catch { return null; }
}
function sha256(obj){ return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex"); }
async function ensureDirs(){ await fs.mkdir(OUT_DIR,{recursive:true}); await fs.mkdir(DETAIL_DIR,{recursive:true}); }

function isAfter(aISO,bISO){ if(!aISO||!bISO) return false; return new Date(aISO).getTime() > new Date(bISO).getTime(); }

async function fetchUserAttendedPage(username,page){
  // Request festival information for each setlist page
  const usp = new URLSearchParams({ p: String(page), inc: "festival" });
  const url = `${API_BASE}/user/${encodeURIComponent(username)}/attended?${usp}`;
  const data = await fetchWithBackoff(url);
  const items = Array.isArray(data.setlist) ? data.setlist : (data.setlist ? [data.setlist] : []);
  return items.map(normalizeSetlist);
}

async function paginateUserAttendedDelta(username, knownIds, alwaysRefreshPages, lastHarvestISO){
  const all = []; let page = 1;
  while(true){
    const pageNorm = await fetchUserAttendedPage(username, page);
    if(!pageNorm.length) break;
    all.push(...pageNorm);

    const pageAllKnown = pageNorm.every(sl => knownIds.has(sl.id));
    const pageAllOlder = lastHarvestISO ? pageNorm.every(sl => !isAfter(sl.lastUpdated, lastHarvestISO)) : false;
    const sz = pageNorm.length;

    if(page > alwaysRefreshPages && pageAllKnown && (pageAllOlder || sz < 20)) break;
    if(sz < 20) break;
    page++;
  }
  return all;
}

// ---------- Views precompute ----------
function parseYMD(ddmmyyyy){
  // dd-mm-yyyy -> [yyyy, mm, dd] strings padded
  if(!ddmmyyyy) return ["0000","00","00"];
  const [d,m,y] = ddmmyyyy.split("-").map(s=>s.padStart(2,"0"));
  return [y||"0000", m||"00", d||"00"];
}
function sortNewestFirst(items){
  return items.slice().sort((a,b)=>{
    const [ya,ma,da] = parseYMD(a.eventDate);
    const [yb,mb,db] = parseYMD(b.eventDate);
    const ka = `${ya}-${ma}-${da}`, kb = `${yb}-${mb}-${db}`;
    return ka < kb ? 1 : ka > kb ? -1 : (a.artist||"").localeCompare(b.artist||"");
  });
}
function groupIds(items, keyFn){
  const map = new Map();
  for(const it of items){
    const k = keyFn(it);
    if(!k) continue;
    if(!map.has(k)) map.set(k, []);
    map.get(k).push(it.id);
  }
  // stable order: newest-first within each bucket
  const idxById = new Map(items.map((it,i)=>[it.id,i]));
  // items are already sorted newest-first; rely on that order
  for(const [k,arr] of map.entries()){
    map.set(k, arr.sort((a,b)=> idxById.get(a) - idxById.get(b)));
  }
  return Object.fromEntries(map);
}

function buildViews(items){
  const sorted = sortNewestFirst(items);
  const labels = { country: {} };

  const byYear = groupIds(sorted, it => (it.eventDate||"").split("-")[2] || null);
  const byArtist = groupIds(sorted, it => it.artist || null);

  const byVenue = groupIds(sorted, it => {
    const parts = [it.venue, it.city, it.countryCode].filter(Boolean);
    return parts.length ? parts.join(", ") : null; // "Venue, City, US"
  });

  const byFestival = groupIds(sorted, it => it.festival || null);

  const byCountry = groupIds(sorted, it => {
    const code = it.countryCode || it.country || null;
    if(code && it.country) labels.country[code] = it.country;
    return code;
  });

  // O(1) lookup
  const byId = Object.fromEntries(sorted.map(it => [it.id, it]));

  return {
    schemaVersion: SCHEMA_VERSION,
    byYear, byArtist, byVenue, byFestival, byCountry,
    labels,
    byId,
  };
}
// ---------- /views precompute ----------

async function run(){
  await ensureDirs();

  const previousIndex = await readJsonSafe(INDEX_FILE);
  const prevIds = new Set((previousIndex?.items ?? []).map(i => i.id));
  const lastHarvestISO = previousIndex?.harvestedAt || null;

  // fetch delta or full
  let harvested;
  if(FULL_RESCAN){
    harvested = [];
    for(let p=1;;p++){
      const pageNorm = await fetchUserAttendedPage(USERNAME,p);
      if(!pageNorm.length) break;
      harvested.push(...pageNorm);
      if(pageNorm.length < 20) break;
    }
  } else {
    harvested = await paginateUserAttendedDelta(USERNAME, prevIds, ALWAYS_REFRESH_PAGES, lastHarvestISO);
  }

  // merge into index
  const indexMap = new Map();
  if(previousIndex?.items?.length) for(const idx of previousIndex.items) indexMap.set(idx.id, idx);

  const detailWrites = new Set();
  for(const sl of harvested){
    const idx = toIndexEntry(sl);
    const was = indexMap.get(sl.id);
    const changed = JSON.stringify(was) !== JSON.stringify(idx);
    indexMap.set(sl.id, idx);
    if(!was || isAfter(sl.lastUpdated, lastHarvestISO) || changed) detailWrites.add(sl.id);
  }

  // sort index newest-first
  const items = Array.from(indexMap.values());
  items.sort((a,b)=>{
    const [ya,ma,da] = parseYMD(a.eventDate);
    const [yb,mb,db] = parseYMD(b.eventDate);
    const ka = `${ya}-${ma}-${da}`, kb = `${yb}-${mb}-${db}`;
    return ka < kb ? 1 : ka > kb ? -1 : (a.artist||"").localeCompare(b.artist||"");
  });

  // write detail files
  const toWriteIds = FULL_RESCAN ? items.map(i=>i.id) : Array.from(detailWrites);
  const harvestedAt = new Date().toISOString();

  for(const id of toWriteIds){
    const sl = harvested.find(s=>s.id===id) || null;
    if(!sl){
      const oldDetail = await readJsonSafe(path.join(DETAIL_DIR,`${id}.json`));
      if(oldDetail?.setlist){
        await fs.writeFile(path.join(DETAIL_DIR,`${id}.json`), JSON.stringify({
          ...oldDetail, schemaVersion: SCHEMA_VERSION, harvestedAt
        }, null, 2));
      } else {
        console.warn(`⚠️ Skipped detail for ${id} (not in current pages, no old detail).`);
      }
      continue;
    }
    await fs.writeFile(path.join(DETAIL_DIR,`${id}.json`), JSON.stringify({
      schemaVersion: SCHEMA_VERSION, harvestedAt, username: USERNAME, setlist: sl
    }, null, 2));
  }

  // index doc + integrity check
  const indexDoc = { schemaVersion: SCHEMA_VERSION, harvestedAt, username: USERNAME, count: items.length, items };
  const previousHash = previousIndex?.__integrityHash || null;
  const nextHash = sha256({ schemaVersion: SCHEMA_VERSION, items });
  if(previousHash !== nextHash){
    await fs.writeFile(INDEX_FILE, JSON.stringify({ ...indexDoc, __integrityHash: nextHash }, null, 2));
    console.log(`✅ Wrote index (${items.length} items). Details written: ${toWriteIds.length}`);
  } else {
    console.log("ℹ️ No index changes. Detail writes:", toWriteIds.length);
  }

  // rollup (quick analytics)
  const rollup = {
    schemaVersion: SCHEMA_VERSION,
    harvestedAt,
    username: USERNAME,
    summary: {
      total: items.length,
      festivals: items.filter(i=>i.festival).length,
      uniqueArtists: new Set(items.map(i=>i.artist).filter(Boolean)).size,
      byCountry: Object.fromEntries(
        [...items.reduce((m,i)=>{const k=i.countryCode||"??";m.set(k,(m.get(k)||0)+1);return m;}, new Map())].sort((a,b)=>b[1]-a[1])
      )
    }
  };
  await fs.writeFile(ROLLUP_FILE, JSON.stringify(rollup, null, 2));

  // NEW: write views (+ integrity guard)
  const viewsPrev = await readJsonSafe(VIEWS_FILE);
  const views = buildViews(items);
  const viewsHashPrev = viewsPrev?.__integrityHash || null;
  const viewsHashNext = sha256(views);
  if(viewsHashPrev !== viewsHashNext){
    await fs.writeFile(VIEWS_FILE, JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      harvestedAt,
      ...views,
      __integrityHash: viewsHashNext
    }, null, 2));
    console.log("✅ Wrote views:", VIEWS_FILE);
  } else {
    console.log("ℹ️ No changes in views.");
  }
}

run().catch(err=>{ console.error("❌ Harvest failed:", err); process.exit(1); });
