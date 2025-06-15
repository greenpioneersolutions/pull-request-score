import fs from 'fs';
import os from 'os';
import path from 'path';
import { sqliteStore } from '../src/cache/sqliteStore';

describe('sqliteStore', () => {
  let tmpDir: string;
  const origHome = process.env['HOME'];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-'));
    process.env['HOME'] = tmpDir;
  });

  afterEach(() => {
    process.env['HOME'] = origHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('stores and retrieves values', () => {
    const store = sqliteStore();
    store.set('a', { v: 1 }, 10);
    expect(store.get('a')).toEqual({ v: 1 });
  });

  it('expires values', async () => {
    const store = sqliteStore();
    store.set('b', 2, 0.5);
    expect(store.get('b')).toBe(2);
    await new Promise((r) => setTimeout(r, 600));
    expect(store.get('b')).toBeUndefined();
  });
});
