import { calculateSizeBucket } from "../src/calculators/sizeBucket";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateSizeBucket", () => {
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

  it("returns S for small PRs", () => {
    const pr = { ...base, additions: 10 };
    expect(calculateSizeBucket(pr)).toBe("S");
  });

  it("returns M for medium PRs", () => {
    const pr = { ...base, additions: 100 };
    expect(calculateSizeBucket(pr)).toBe("M");
  });

  it("returns L for large PRs", () => {
    const pr = { ...base, additions: 500 };
    expect(calculateSizeBucket(pr)).toBe("L");
  });
});
