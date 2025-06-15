import { calculateReviewerCount } from "../src/calculators/reviewerCount";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateReviewerCount", () => {
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

  it("counts unique reviewers", () => {
    const pr = {
      ...base,
      reviews: [
        { id: "r1", state: "APPROVED", submittedAt: base.createdAt, author: { login: "a" } },
        { id: "r2", state: "APPROVED", submittedAt: base.createdAt, author: { login: "b" } },
        { id: "r3", state: "APPROVED", submittedAt: base.createdAt, author: { login: "a" } },
        { id: "r4", state: "APPROVED", submittedAt: base.createdAt, author: null },
      ],
    };
    expect(calculateReviewerCount(pr)).toBe(2);
  });

  it("returns zero for no reviews", () => {
    expect(calculateReviewerCount(base)).toBe(0);
  });

  it("throws when reviews missing", () => {
    expect(() => calculateReviewerCount({ ...(base as any), reviews: undefined as any })).toThrow();
  });
});
