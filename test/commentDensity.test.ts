import { calculateCommentDensity } from "../src/calculators/commentDensity";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateCommentDensity", () => {
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
    additions: 1,
    deletions: 1,
    changedFiles: 1,
    labels: [],
  };

  it("computes density", () => {
    const pr = {
      ...base,
      comments: [
        { id: "c1", body: "a", createdAt: base.createdAt, author: { login: "a" } },
        { id: "c2", body: "b", createdAt: base.createdAt, author: null },
      ],
    };
    const d = calculateCommentDensity(pr);
    expect(d).toBeCloseTo(1);
  });

  it("returns zero when no comments", () => {
    const pr = { ...base, additions: 5, deletions: 5 };
    expect(calculateCommentDensity(pr)).toBe(0);
  });

  it("throws when no line changes", () => {
    const pr = { ...base, additions: 0, deletions: 0 };
    expect(() => calculateCommentDensity(pr)).toThrow();
  });
});
