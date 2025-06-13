import { calculateCycleTime } from '../src/calculators/cycleTime';
import { RawPullRequest } from '../src/collectors/pullRequests';

describe('calculateCycleTime', () => {
  const base: RawPullRequest = {
    id: '1',
    number: 1,
    title: 't',
    state: 'MERGED',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    mergedAt: '2024-01-01T00:00:00Z',
    closedAt: '2024-01-01T00:00:00Z',
    author: { login: 'a' },
    reviews: [],
    comments: [],
    commits: [],
    checkSuites: [],
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    labels: [],
  };

  it('handles same-day merge', () => {
    const pr = { ...base, mergedAt: '2024-01-01T12:00:00Z' };
    expect(calculateCycleTime(pr)).toBe(12);
  });

  it('handles DST jump', () => {
    const pr = {
      ...base,
      createdAt: '2024-03-09T12:00:00Z',
      mergedAt: '2024-03-10T12:00:00Z',
    };
    expect(calculateCycleTime(pr)).toBe(24);
  });

  it('throws when mergedAt missing', () => {
    const pr = { ...base, mergedAt: null as any };
    expect(() => calculateCycleTime(pr)).toThrow();
  });
});
