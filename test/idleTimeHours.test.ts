import { calculateIdleTimeHours } from "../src/calculators/idleTimeHours";
import { RawPullRequest } from "../src/collectors/pullRequests";

describe("calculateIdleTimeHours", () => {
  const base: RawPullRequest = {
    id: "1",
    number: 1,
    title: "t",
    state: "MERGED",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-04T00:00:00Z",
    mergedAt: "2024-01-03T10:00:00Z",
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

  it("sums idle gaps beyond 24h", () => {
    const pr = {
      ...base,
      commits: [
        { oid: "c1", messageHeadline: "a", committedDate: "2024-01-02T01:00:00Z", checkSuites: [] },
        { oid: "c2", messageHeadline: "b", committedDate: "2024-01-03T01:00:00Z", checkSuites: [] },
      ],
      reviews: [
        { id: "r1", state: "APPROVED", submittedAt: "2024-01-03T02:00:00Z", author: { login: "b" } },
      ],
    };
    expect(calculateIdleTimeHours(pr)).toBeCloseTo(1);
  });

  it("throws when end timestamp missing", () => {
    const pr = { ...base, mergedAt: null, closedAt: null, updatedAt: undefined as any };
    expect(() => calculateIdleTimeHours(pr as any)).toThrow();
  });
});
