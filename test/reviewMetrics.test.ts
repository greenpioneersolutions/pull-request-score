import { calculateReviewMetrics } from '../src/calculators/reviewMetrics';
import { RawPullRequest } from '../src/collectors/pullRequests';

describe('calculateReviewMetrics', () => {
  const base: RawPullRequest = {
    id: '1',
    number: 1,
    title: 't',
    state: 'OPEN',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    mergedAt: null,
    closedAt: null,
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

  it('computes pickup time same day', () => {
    const pr = {
      ...base,
      reviews: [
        {
          id: 'r1',
          state: 'APPROVED',
          submittedAt: '2024-01-01T02:00:00Z',
          author: { login: 'a' },
        },
      ],
    };
    expect(calculateReviewMetrics(pr)).toBe(2);
  });

  it('handles DST jump', () => {
    const pr = {
      ...base,
      createdAt: '2024-03-09T12:00:00Z',
      reviews: [
        {
          id: 'r1',
          state: 'APPROVED',
          submittedAt: '2024-03-10T12:00:00Z',
          author: { login: 'a' },
        },
      ],
    };
    expect(calculateReviewMetrics(pr)).toBe(24);
  });

  it('throws for draft PR without reviews', () => {
    expect(() => calculateReviewMetrics(base)).toThrow();
  });
});
