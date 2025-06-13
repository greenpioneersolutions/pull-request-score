import fs from 'fs';
import os from 'os';
import path from 'path';
import { Writable } from 'stream';
import { writeOutput } from '../src/output/writers';

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
    expect(data).toBe('metric,median,p95\ncycleTime,1,2\npickupTime,3,4\n');
    fs.unlinkSync(tmp);
  });

  it('writes to stderr when requested', () => {
    const spy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    writeOutput(metrics, { destination: 'stderr' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
