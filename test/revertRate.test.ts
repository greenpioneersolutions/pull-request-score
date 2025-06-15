import { calculateRevertRate } from "../src/calculators/revertRate";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateRevertRate", () => {
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

  it("computes revert ratio", () => {
    const pr = {
      ...base,
      commits: [
        { oid: "c1", messageHeadline: "revert: fix bug", committedDate: base.createdAt, checkSuites: [] },
        { oid: "c2", messageHeadline: "add feature", committedDate: base.createdAt, checkSuites: [] },
      ],
    };
    expect(calculateRevertRate(pr)).toBeCloseTo(0.5);
  });

  it("throws with no commits", () => {
    expect(() => calculateRevertRate(base)).toThrow();
  });
});
