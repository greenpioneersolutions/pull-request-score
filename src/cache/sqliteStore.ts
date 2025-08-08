import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CacheStore } from './CacheStore.js';
import { createRequire } from 'module';

// better-sqlite3 requires native bindings which may not be available in all
// environments (such as tests on fresh containers). Attempt to load the
// library, but gracefully fall back to an in-memory store if the bindings are
// missing so that unit tests can still execute.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let BetterSqlite3: typeof import('better-sqlite3') | undefined;
try {
  const req = createRequire(process.cwd() + '/');
  BetterSqlite3 = req('better-sqlite3');
} catch {
  BetterSqlite3 = undefined;
}

const DB_DIR = path.join(os.homedir(), '.gh-pr-metrics');
const DB_PATH = path.join(DB_DIR, 'cache.db');

export function sqliteStore(): CacheStore {
  // If better-sqlite3 failed to load, use a simple in-memory Map as a
  // best-effort cache. This keeps tests operational even when the native
  // module is not compiled for the current platform.
  if (!BetterSqlite3) {
    const map = new Map<string, { value: unknown; expires: number }>();
    return {
      get(key) {
        const row = map.get(key);
        if (!row) return undefined;
        if (row.expires && row.expires < Date.now()) {
          map.delete(key);
          return undefined;
        }
        return row.value as any;
      },
      set(key, value, ttlSec = 24 * 3600) {
        map.set(key, { value, expires: Date.now() + ttlSec * 1000 });
      },
    };
  }

  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new BetterSqlite3(DB_PATH);
  db.exec(
    'CREATE TABLE IF NOT EXISTS KV (key TEXT PRIMARY KEY, value TEXT, expires INTEGER)'
  );

  const getStmt = db.prepare('SELECT value, expires FROM KV WHERE key = ?');
  const setStmt = db.prepare(
    'INSERT OR REPLACE INTO KV(key,value,expires) VALUES(?,?,?)'
  );
  const delStmt = db.prepare('DELETE FROM KV WHERE key = ?');

  return {
    get(key) {
      const row = getStmt.get(key) as { value: string; expires: number } | undefined;
      if (!row) return undefined;
      if (row.expires && row.expires < Date.now()) {
        delStmt.run(key);
        return undefined;
      }
      try {
        return JSON.parse(row.value);
      } catch {
        return undefined;
      }
    },
    set(key, value, ttlSec = 24 * 3600) {
      const expires = Date.now() + ttlSec * 1000;
      setStmt.run(key, JSON.stringify(value), expires);
    },
  };
}

export default sqliteStore;
