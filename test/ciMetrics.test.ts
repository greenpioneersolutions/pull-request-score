import { calculateCiMetrics } from "../src/calculators/ciMetrics";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateCiMetrics", () => {
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

  it("computes success rate and average duration", () => {
    const pr = {
      ...base,
      checkSuites: [
        {
          id: "1",
          status: "COMPLETED",
          conclusion: "SUCCESS",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:10Z",
        },
        {
          id: "2",
          status: "COMPLETED",
          conclusion: "FAILURE",
          createdAt: "2024-01-01T01:00:00Z",
          updatedAt: "2024-01-01T01:00:20Z",
        },
      ],
    };
    const m = calculateCiMetrics(pr);
    expect(m.successRate).toBeCloseTo(0.5);
    expect(m.averageDuration).toBeCloseTo(15);
  });

  it("handles absence of check suites", () => {
    const m = calculateCiMetrics(base);
    expect(m.successRate).toBe(0);
    expect(m.averageDuration).toBe(0);
  });
});
