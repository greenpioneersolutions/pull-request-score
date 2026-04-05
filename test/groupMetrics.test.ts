import {
  groupByAuthor,
  calculateAuthorMetrics,
  calculateTeamMetrics,
} from "../src/calculators/groupMetrics";
import type { RawPullRequest } from "../src/collectors/pullRequests";

const makePr = (overrides: Partial<RawPullRequest> = {}): RawPullRequest => ({
  id: "1",
  number: 1,
  title: "test",
  state: "MERGED",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T04:00:00Z",
  mergedAt: "2024-01-01T04:00:00Z",
  closedAt: null,
  additions: 20,
  deletions: 5,
  changedFiles: 2,
  labels: [],
  author: { login: "alice" },
  reviews: [
    {
      id: "r1",
      state: "APPROVED",
      submittedAt: "2024-01-01T01:00:00Z",
      author: { login: "bob" },
    },
  ],
  comments: [],
  commits: [
    {
      oid: "a1",
      messageHeadline: "feat",
      committedDate: "2024-01-01T00:30:00Z",
      checkSuites: [{ conclusion: "SUCCESS" }],
    },
  ],
  checkSuites: [
    {
      id: "cs1",
      status: "COMPLETED",
      conclusion: "SUCCESS",
      startedAt: "2024-01-01T00:00:00Z",
      completedAt: "2024-01-01T00:05:00Z",
    },
  ],
  timelineItems: [],
  ...overrides,
});

describe("groupByAuthor", () => {
  it("groups PRs by author login", () => {
    const prs = [
      makePr({ author: { login: "alice" } }),
      makePr({ author: { login: "bob" } }),
      makePr({ author: { login: "alice" } }),
    ];
    const groups = groupByAuthor(prs);
    expect(groups.get("alice")).toHaveLength(2);
    expect(groups.get("bob")).toHaveLength(1);
  });

  it("groups null authors as unknown", () => {
    const prs = [makePr({ author: null })];
    const groups = groupByAuthor(prs);
    expect(groups.get("unknown")).toHaveLength(1);
  });
});

describe("calculateAuthorMetrics", () => {
  it("returns per-author metrics sorted by PR count", () => {
    const prs = [
      makePr({ number: 1, author: { login: "alice" } }),
      makePr({ number: 2, author: { login: "bob" } }),
      makePr({ number: 3, author: { login: "alice" } }),
    ];
    const result = calculateAuthorMetrics(prs);
    expect(result).toHaveLength(2);
    expect(result[0]!.author).toBe("alice");
    expect(result[0]!.prCount).toBe(2);
    expect(result[1]!.author).toBe("bob");
    expect(result[1]!.prCount).toBe(1);
    expect(result[0]!.cycleTime.median).toBeDefined();
    expect(typeof result[0]!.averageScore).toBe("number");
  });
});

describe("calculateTeamMetrics", () => {
  it("groups authors into teams", () => {
    const prs = [
      makePr({ number: 1, author: { login: "alice" } }),
      makePr({ number: 2, author: { login: "bob" } }),
      makePr({ number: 3, author: { login: "carol" } }),
    ];
    const mapping = { alice: "frontend", bob: "frontend", carol: "backend" };
    const result = calculateTeamMetrics(prs, mapping);
    expect(result).toHaveLength(2);
    const frontend = result.find((t) => t.team === "frontend");
    expect(frontend).toBeDefined();
    expect(frontend!.prCount).toBe(2);
    expect(frontend!.members).toContain("alice");
    expect(frontend!.members).toContain("bob");
  });

  it("assigns unmapped authors to unassigned team", () => {
    const prs = [makePr({ author: { login: "unknown-dev" } })];
    const result = calculateTeamMetrics(prs, {});
    expect(result[0]!.team).toBe("unassigned");
  });
});
