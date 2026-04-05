import { computePrSnapshot, scorePr } from "../src/scoring/prScoring";
import type { RawPullRequest } from "../src/collectors/pullRequests";

const basePr: RawPullRequest = {
  id: "1",
  number: 42,
  title: "feat: add scoring",
  state: "MERGED",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
  mergedAt: "2024-01-01T02:00:00Z",
  closedAt: null,
  additions: 30,
  deletions: 10,
  changedFiles: 3,
  labels: [],
  author: { login: "alice" },
  reviews: [
    { id: "r1", state: "APPROVED", submittedAt: "2024-01-01T01:00:00Z", author: { login: "bob" } },
    { id: "r2", state: "CHANGES_REQUESTED", submittedAt: "2024-01-01T01:30:00Z", author: { login: "carol" } },
  ],
  comments: [
    { id: "c1", body: "looks good", createdAt: "2024-01-01T01:00:00Z", author: { login: "bob" } },
  ],
  commits: [
    {
      oid: "abc",
      messageHeadline: "feat: add scoring",
      committedDate: "2024-01-01T00:30:00Z",
      checkSuites: [{ conclusion: "SUCCESS" }],
    },
  ],
  checkSuites: [
    { id: "cs1", status: "COMPLETED", conclusion: "SUCCESS", startedAt: "2024-01-01T00:00:00Z", completedAt: "2024-01-01T00:05:00Z" },
  ],
  timelineItems: [],
};

describe("computePrSnapshot", () => {
  it("computes all metrics for a well-formed PR", () => {
    const snap = computePrSnapshot(basePr);
    expect(snap.cycleTimeHours).toBeCloseTo(2, 0);
    expect(snap.pickupTimeHours).toBeCloseTo(1, 0);
    expect(snap.reviewerCount).toBe(2);
    expect(snap.changeRequestRatio).toBeCloseTo(0.5);
    expect(snap.revertRate).toBe(0);
    expect(snap.commentDensity).toBeCloseTo(1 / 40);
    expect(snap.ciPassRate).toBe(1);
    expect(snap.linesChanged).toBe(40);
    expect(snap.outsized).toBe(false);
    expect(snap.sizeBucket).toBe("S");
  });

  it("returns nulls for missing data", () => {
    const pr: RawPullRequest = {
      ...basePr,
      mergedAt: null,
      reviews: [],
      commits: [],
      checkSuites: [],
    };
    const snap = computePrSnapshot(pr);
    expect(snap.cycleTimeHours).toBeNull();
    expect(snap.pickupTimeHours).toBeNull();
    expect(snap.reviewerCount).toBe(0);
    expect(snap.revertRate).toBeNull();
    expect(snap.linesChanged).toBe(40);
  });
});

describe("scorePr", () => {
  it("returns a score result with breakdown", () => {
    const result = scorePr(basePr);
    expect(result.prNumber).toBe(42);
    expect(result.title).toBe("feat: add scoring");
    expect(result.author).toBe("alice");
    expect(typeof result.score).toBe("number");
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Object.keys(result.breakdown).length).toBeGreaterThan(0);
  });

  it("uses custom rules when provided", () => {
    const result = scorePr(basePr, [
      { metric: "linesChanged", weight: 1 },
    ]);
    expect(result.score).toBe(40);
    expect(result.breakdown["linesChanged"]).toBeDefined();
  });

  it("handles PR with no author", () => {
    const pr = { ...basePr, author: null };
    const result = scorePr(pr);
    expect(result.author).toBeNull();
  });
});
