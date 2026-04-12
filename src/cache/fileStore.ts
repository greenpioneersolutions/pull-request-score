import fs from "fs";
import path from "path";
import os from "os";
import { createHash } from "crypto";
import type { CacheStore } from "./CacheStore.js";

const CACHE_DIR = path.join(os.homedir(), ".gh-pr-metrics", "cache");

function keyToFile(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex");
  return path.join(CACHE_DIR, `${hash}.json`);
}

interface CacheEntry {
  value: unknown;
  expires: number;
}

/**
 * Create a persistent file-system-based cache store.
 * Each entry is stored as a JSON file in ~/.gh-pr-metrics/cache/.
 *
 * Falls back to an in-memory Map if the cache directory cannot be created
 * (e.g. read-only filesystem, restricted container).
 */
export function fileStore(): CacheStore {
  let useFs = true;
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {
    useFs = false;
  }

  if (!useFs) {
    const map = new Map<string, CacheEntry>();
    return {
      get(key) {
        const entry = map.get(key);
        if (!entry) return undefined;
        if (entry.expires && entry.expires < Date.now()) {
          map.delete(key);
          return undefined;
        }
        return entry.value as any;
      },
      set(key, value, ttlSec = 24 * 3600) {
        map.set(key, { value, expires: Date.now() + ttlSec * 1000 });
      },
    };
  }

  return {
    get(key) {
      const file = keyToFile(key);
      try {
        const raw = fs.readFileSync(file, "utf8");
        const entry: CacheEntry = JSON.parse(raw);
        if (entry.expires && entry.expires < Date.now()) {
          try {
            fs.unlinkSync(file);
          } catch {
            /* ignore cleanup failure */
          }
          return undefined;
        }
        return entry.value as any;
      } catch {
        return undefined;
      }
    },
    set(key, value, ttlSec = 24 * 3600) {
      const file = keyToFile(key);
      const entry: CacheEntry = {
        value,
        expires: Date.now() + ttlSec * 1000,
      };
      try {
        fs.writeFileSync(file, JSON.stringify(entry));
      } catch {
        /* ignore write failure — cache is best-effort */
      }
    },
  };
}

export default fileStore;
