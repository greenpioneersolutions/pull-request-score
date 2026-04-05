import fs from 'fs';
import os from 'os';
import path from 'path';
import { Writable } from 'stream';
import { writeOutput, flattenToRows } from '../src/output/writers';

describe('writeOutput', () => {
  const metrics = {
    cycleTime: { median: 1, p95: 2 },
    pickupTime: { median: 3, p95: 4 },
  };

  it('writes JSON to provided stream', () => {
    const chunks: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(String(chunk));
        cb();
      },
    });
    writeOutput(metrics, { destination: stream });
    expect(chunks.join('')).toBe(JSON.stringify(metrics, null, 2) + '\n');
  });

  it('writes CSV to file', () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'out-')), 'metrics.csv');
    writeOutput(metrics, { format: 'csv', destination: tmp });
    const data = fs.readFileSync(tmp, 'utf8');
    expect(data).toBe(
      'metric,value\ncycleTime.median,1\ncycleTime.p95,2\npickupTime.median,3\npickupTime.p95,4\n'
    );
    fs.unlinkSync(tmp);
  });

  it('resolves relative file paths', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'out-'));
    const relPath = path.relative(process.cwd(), path.join(tmp, 'metrics.json'));
    writeOutput(metrics, { destination: relPath });
    const resolved = path.resolve(relPath);
    expect(fs.existsSync(resolved)).toBe(true);
    fs.unlinkSync(resolved);
    fs.rmdirSync(tmp);
  });

  it('throws when writing to root path', () => {
    expect(() => writeOutput(metrics, { destination: '/' })).toThrow(
      'Refusing to write to root path',
    );
  });

  it('flattens nested objects to CSV rows', () => {
    const data = {
      mergeRate: 0.8,
      cycleTime: { median: 5, p95: 10 },
      outsizedPrs: [1, 2, 3],
      empty: null,
    };
    const rows = flattenToRows(data);
    expect(rows).toEqual([
      ['metric', 'value'],
      ['mergeRate', '0.8'],
      ['cycleTime.median', '5'],
      ['cycleTime.p95', '10'],
      ['outsizedPrs', '1;2;3'],
      ['empty', ''],
    ]);
  });

  it('writes to stderr when requested', () => {
    const spy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    writeOutput(metrics, { destination: 'stderr' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
