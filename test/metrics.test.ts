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
    timelineItems: [],
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

  it("detects outsized PRs", () => {
    const big = { ...base, number: 4, additions: 60, deletions: 60 };
    const m = calculateMetrics([big], { outsizedThreshold: 100 });
    expect(m.outsizedPrs).toEqual([4]);
    expect(m.outsizedPrRatio).toBeCloseTo(1);
  });

  it("computes review coverage", () => {
    const reviewed = {
      ...base,
      number: 5,
      reviews: [
        {
          id: "r1",
          state: "APPROVED",
          submittedAt: base.createdAt,
          author: { login: "b" },
        },
      ],
    };
    const m = calculateMetrics([base, reviewed]);
    expect(m.reviewCoverage).toBeCloseTo(0.5);
    expect(m.reviewCounts[5]).toBe(1);
  });

  it("calculates build success rate", () => {
    const pr = {
      ...base,
      number: 6,
      checkSuites: [
        {
          id: "1",
          status: "COMPLETED",
          conclusion: "SUCCESS",
          startedAt: base.createdAt,
          completedAt: base.createdAt,
        },
        {
          id: "2",
          status: "COMPLETED",
          conclusion: "FAILURE",
          startedAt: base.createdAt,
          completedAt: base.createdAt,
        },
      ],
    };
    const m = calculateMetrics([pr]);
    expect(m.buildSuccessRate).toBeCloseTo(0.5);
  });

  it("counts PR backlog", () => {
    const closed = {
      ...base,
      number: 7,
      state: "CLOSED",
      closedAt: "2024-01-02T00:00:00Z",
    };
    const m = calculateMetrics([base, closed]);
    expect(m.prBacklog).toBe(1);
  });

  it("handles empty input", () => {
    const m = calculateMetrics([]);
    expect(m.mergeRate).toBe(0);
    expect(m.outsizedPrs.length).toBe(0);
    expect(m.outsizedPrRatio).toBe(0);
    expect(m.prBacklog).toBe(0);
  });

  it("handles missing author field", () => {
    const pr: RawPullRequest = { ...base, number: 8, author: null };
    const m = calculateMetrics([pr]);
    expect(m.prCountPerDeveloper["a"]).toBeUndefined();
  });

  it("counts comments and unique commenters", () => {
    const pr: RawPullRequest = {
      ...base,
      number: 9,
      comments: [
        { id: "c1", body: "", createdAt: base.createdAt, author: { login: "x" } },
        { id: "c2", body: "", createdAt: base.createdAt, author: { login: "y" } },
        { id: "c3", body: "", createdAt: base.createdAt, author: { login: "x" } },
      ],
    };
    const m = calculateMetrics([pr]);
    expect(m.commentCounts[9]).toBe(3);
    expect(m.commenterCounts[9]).toBe(2);
  });

  it("tracks comments for multiple PRs", () => {
    const pr1: RawPullRequest = {
      ...base,
      number: 10,
      comments: [{ id: "a", body: "", createdAt: base.createdAt, author: { login: "x" } }],
    };
    const pr2: RawPullRequest = {
      ...base,
      number: 11,
      comments: [
        { id: "b", body: "", createdAt: base.createdAt, author: { login: "y" } },
        { id: "c", body: "", createdAt: base.createdAt, author: { login: "y" } },
        { id: "d", body: "", createdAt: base.createdAt, author: { login: "z" } },
      ],
    };
    const m = calculateMetrics([pr1, pr2]);
    expect(m.commentCounts[10]).toBe(1);
    expect(m.commenterCounts[10]).toBe(1);
    expect(m.commentCounts[11]).toBe(3);
    expect(m.commenterCounts[11]).toBe(2);
  });

  it("ignores comments without authors for unique counts", () => {
    const pr: RawPullRequest = {
      ...base,
      number: 12,
      comments: [
        { id: "na1", body: "", createdAt: base.createdAt, author: null },
        { id: "na2", body: "", createdAt: base.createdAt, author: { login: "a" } },
        { id: "na3", body: "", createdAt: base.createdAt, author: null },
      ],
    };
    const m = calculateMetrics([pr]);
    expect(m.commentCounts[12]).toBe(3);
    expect(m.commenterCounts[12]).toBe(1);
  });
});
