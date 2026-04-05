import { scorePr } from "../src/scoring/prScoring";
import type { RawPullRequest } from "../src/collectors/pullRequests";

const perfectPr: RawPullRequest = {
  id: "1",
  number: 1,
  title: "fix: small bug fix",
  state: "MERGED",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T01:00:00Z",
  mergedAt: "2024-01-01T01:00:00Z",
  closedAt: null,
  additions: 10,
  deletions: 5,
  changedFiles: 2,
  labels: [],
  author: { login: "alice" },
  reviews: [
    { id: "r1", state: "APPROVED", submittedAt: "2024-01-01T00:30:00Z", author: { login: "bob" } },
    { id: "r2", state: "APPROVED", submittedAt: "2024-01-01T00:35:00Z", author: { login: "carol" } },
    { id: "r3", state: "APPROVED", submittedAt: "2024-01-01T00:40:00Z", author: { login: "dave" } },
  ],
  comments: [],
  commits: [
    { oid: "a1", messageHeadline: "fix: small bug", committedDate: "2024-01-01T00:15:00Z", checkSuites: [{ conclusion: "SUCCESS" }] },
  ],
  checkSuites: [
    { id: "cs1", status: "COMPLETED", conclusion: "SUCCESS", startedAt: "2024-01-01T00:00:00Z", completedAt: "2024-01-01T00:02:00Z" },
  ],
  timelineItems: [],
};

const badPr: RawPullRequest = {
  id: "2",
  number: 2,
  title: "Revert everything",
  state: "MERGED",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-15T00:00:00Z",
  mergedAt: "2024-01-15T00:00:00Z",
  closedAt: null,
  additions: 2000,
  deletions: 500,
  changedFiles: 50,
  labels: [],
  author: { login: "careless" },
  reviews: [
    { id: "r1", state: "CHANGES_REQUESTED", submittedAt: "2024-01-10T00:00:00Z", author: { login: "bob" } },
  ],
  comments: [],
  commits: [
    { oid: "b1", messageHeadline: "Revert bad change", committedDate: "2024-01-01T00:15:00Z", checkSuites: [{ conclusion: "FAILURE" }] },
  ],
  checkSuites: [
    { id: "cs1", status: "COMPLETED", conclusion: "FAILURE", startedAt: "2024-01-01T00:00:00Z", completedAt: "2024-01-01T00:10:00Z" },
  ],
  timelineItems: [],
};

describe("defaultScorecard", () => {
  it("scores a well-formed small fast PR highly", () => {
    const result = scorePr(perfectPr);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("scores a large slow poorly-reviewed PR low", () => {
    const result = scorePr(badPr);
    expect(result.score).toBeLessThan(40);
  });

  it("produces scores in the 0-100 range", () => {
    const perfect = scorePr(perfectPr);
    const bad = scorePr(badPr);
    expect(perfect.score).toBeGreaterThanOrEqual(0);
    expect(perfect.score).toBeLessThanOrEqual(100);
    expect(bad.score).toBeGreaterThanOrEqual(0);
    expect(bad.score).toBeLessThanOrEqual(100);
  });
});
