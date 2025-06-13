import { calculateMetrics } from "../src/calculators/metrics";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateMetrics", () => {
  const base: RawPullRequest = {
    id: "1",
    number: 1,
    title: "t",
    state: "OPEN",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: new Date().toISOString(),
    mergedAt: null,
    closedAt: null,
    author: { login: "a" },
    reviews: [],
    comments: [],
    commits: [],
    checkSuites: [],
    additions: 5,
    deletions: 0,
    changedFiles: 1,
    labels: [],
  };

  it("computes basic rates", () => {
    const prs = [
      { ...base, mergedAt: "2024-01-02T00:00:00Z" },
      { ...base, number: 2, closedAt: "2024-01-03T00:00:00Z" },
    ];

    const m = calculateMetrics(prs);
    expect(m.mergeRate).toBeCloseTo(0.5);
    expect(m.closedWithoutMergeRate).toBeCloseTo(0.5);
    expect(m.prCountPerDeveloper["a"]).toBe(2);
  });

  it("counts stale and hotfix PRs", () => {
    const stale = { ...base, number: 3, updatedAt: "2024-01-01T00:00:00Z" };
    stale.labels = [{ name: "hotfix" }];
    const m = calculateMetrics([stale], { staleDays: 1 });
    expect(m.stalePrCount).toBe(1);
    expect(m.hotfixFrequency).toBe(1);
  });
});
