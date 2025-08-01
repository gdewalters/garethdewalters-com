// _helpers/cache.js
// This module provides a caching mechanism for fetching data.    

import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'flatted';

export default async function cachedFetch(key, fetcher, ttlSeconds = 3600) {
  const cacheDir = path.resolve('.cache');
  const sanitizedKey = encodeURIComponent(key);
  const cacheFile = path.join(cacheDir, `${sanitizedKey}.json`);
  const now = Date.now();

  const skipCache =
    process.env.SKIP_CACHE === 'true' ||
    process.env.NODE_ENV === 'production' ||
    process.env.CONTEXT === 'production';
  const ttl = Number(process.env.CACHE_TTL_SECONDS) || ttlSeconds;

  if (!skipCache && fs.existsSync(cacheFile)) {
    try {
      const { timestamp, payload } = parse(fs.readFileSync(cacheFile, 'utf8'));
      if (now - timestamp < ttl * 1000) {
        return payload;
      }
    } catch {
      // ignore corrupted cache
    }
  }

  const payload = await fetcher();

  if (!skipCache) {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(cacheFile, stringify({ timestamp: now, payload }), 'utf8');
  }

  return payload;
}
