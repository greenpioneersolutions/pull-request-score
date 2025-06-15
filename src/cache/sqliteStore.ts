import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import type { CacheStore } from './CacheStore.js';

const DB_DIR = path.join(os.homedir(), '.gh-pr-metrics');
const DB_PATH = path.join(DB_DIR, 'cache.db');

export function sqliteStore(): CacheStore {
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
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
