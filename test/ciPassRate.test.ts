import { calculateCiPassRate } from "../src/calculators/ciPassRate";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateCiPassRate", () => {
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

  it("computes pass rate", () => {
    const pr = {
      ...base,
      checkSuites: [
        { id: "1", status: "COMPLETED", conclusion: "SUCCESS", createdAt: base.createdAt, updatedAt: base.createdAt },
        { id: "2", status: "COMPLETED", conclusion: "FAILURE", createdAt: base.createdAt, updatedAt: base.createdAt },
      ],
    };
    expect(calculateCiPassRate(pr)).toBeCloseTo(0.5);
  });

  it("handles absence of check suites", () => {
    expect(calculateCiPassRate(base)).toBe(0);
  });
});
