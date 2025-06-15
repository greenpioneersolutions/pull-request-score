import { calculateChangeRequestRatio } from "../src/calculators/changeRequestRatio";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateChangeRequestRatio", () => {
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

  it("calculates ratio", () => {
    const pr = {
      ...base,
      reviews: [
        { id: "r1", state: "CHANGES_REQUESTED", submittedAt: base.createdAt, author: { login: "a" } },
        { id: "r2", state: "APPROVED", submittedAt: base.createdAt, author: { login: "b" } },
      ],
    };
    expect(calculateChangeRequestRatio(pr)).toBeCloseTo(0.5);
  });

  it("throws without reviews", () => {
    expect(() => calculateChangeRequestRatio(base)).toThrow();
  });
});
