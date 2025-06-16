import { calculateOutsizedFlag } from "../src/calculators/outsizedFlag";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateOutsizedFlag", () => {
  const base: RawPullRequest = {
    id: "1",
    number: 1,
    title: "t",
    state: "OPEN",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    mergedAt: null,
    closedAt: null,
    author: { login: "a" },
    reviews: [],
    comments: [],
    commits: [],
    checkSuites: [],
    timelineItems: [],
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    labels: [],
  };

  it("flags outsized PRs", () => {
    const pr = { ...base, additions: 600, deletions: 250 };
    expect(calculateOutsizedFlag(pr)).toBe(true);
  });

  it("ignores small PRs", () => {
    const pr = { ...base, additions: 100, deletions: 50 };
    expect(calculateOutsizedFlag(pr)).toBe(false);
  });

  it("supports custom threshold", () => {
    const pr = { ...base, additions: 100, deletions: 50 };
    expect(calculateOutsizedFlag(pr, 120)).toBe(true);
  });
});
