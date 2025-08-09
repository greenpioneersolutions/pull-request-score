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
          createdAt: base.createdAt,
          updatedAt: base.createdAt,
        },
        {
          id: "2",
          status: "COMPLETED",
          conclusion: "FAILURE",
          createdAt: base.createdAt,
          updatedAt: base.createdAt,
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

  it("tracks comment metrics", () => {
    const comments = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      body: i % 2 === 0 ? "long comment with several words" : "hi",
      createdAt: base.createdAt,
      author: { login: String.fromCharCode(97 + (i % 3)) },
    }));
    const discussed = { ...base, number: 9, comments };
    const m = calculateMetrics([discussed, base], {
      enableCommentQuality: true,
    });
    expect(m.commentCounts[9]).toBe(10);
    expect(m.commenterCounts[9]).toBe(3);
    expect(m.discussionCoverage).toBeCloseTo(0.5);
    expect(m.commentQuality).toBeGreaterThan(0);
  });

  it("omits comment quality when disabled", () => {
    const pr = {
      ...base,
      number: 10,
      comments: [
        {
          id: "c",
          body: "test",
          createdAt: base.createdAt,
          author: { login: "a" },
        },
      ],
    };
    const m = calculateMetrics([pr]);
    expect(m.commentQuality).toBeUndefined();
  });
});
