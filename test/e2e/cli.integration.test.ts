import { spawnSync } from 'child_process';
import { join } from 'path';
import { execSync } from 'child_process';

beforeAll(() => {
  execSync('pnpm build', { stdio: 'inherit' });
});

describe('CLI integration', () => {
  it('prints JSON metrics from fixture', () => {
    const runPath = join(__dirname, 'run.mjs');
    const loader = join(__dirname, 'test-loader.mjs');
    const result = spawnSync(process.execPath, ['--loader', loader, runPath, 'foo/bar', '--token', 't'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(Object.keys(output)).toEqual(expect.arrayContaining(['cycleTime', 'pickupTime']));
  });
});
