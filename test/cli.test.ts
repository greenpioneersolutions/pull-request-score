jest.mock("../src/collectors/pullRequests", () => ({
  collectPullRequests: jest.fn(async () => [
    {
      id: "1",
      number: 1,
      title: "t",
      state: "OPEN",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
      mergedAt: "2024-01-02T00:00:00Z",
      closedAt: null,
      additions: 1,
      deletions: 1,
      changedFiles: 1,
      labels: [],
      author: null,
      reviews: [
        {
          id: "r1",
          state: "APPROVED",
          submittedAt: "2024-01-01T12:00:00Z",
          author: null,
        },
      ],
      comments: [],
      commits: [],
      checkSuites: [],
    },
  ]),
  PartialResultsError: class PartialResultsError extends Error {
    public partial: any[];
    constructor(message: string, partial: any[]) {
      super(message);
      this.partial = partial;
    }
  },
}));

jest.mock("../src/logger.js", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
  },
}));

jest.mock("../src/calculators/cycleTime", () => ({
  calculateCycleTime: jest.fn(() => 10),
}));
jest.mock("../src/calculators/reviewMetrics", () => ({
  calculateReviewMetrics: jest.fn(() => 20),
}));
jest.mock("../src/calculators/metrics", () => ({
  calculateMetrics: jest.fn(() => ({ mergeRate: 1, reviewCoverage: 0.5 })),
}));
jest.mock("../src/collectors/orgRepos", () => ({
  fetchOrgRepos: jest.fn(async () => ["myorg/repo1", "myorg/repo2"]),
}));
jest.mock("../src/comparison/periodParser", () => ({
  parsePeriods: jest.fn(() => ({
    current: { since: "2024-01-01T00:00:00Z", until: "2024-02-01T00:00:00Z" },
    previous: { since: "2023-12-01T00:00:00Z", until: "2024-01-01T00:00:00Z" },
  })),
}));
jest.mock("../src/comparison/trendComparison", () => ({
  computeDeltas: jest.fn(() => ({ "mergeRate": { current: 0.8, previous: 0.6, absoluteDelta: 0.2, percentageChange: 33.33 } })),
}));
jest.mock("../src/calculators/groupMetrics", () => ({
  calculateAuthorMetrics: jest.fn(() => [
    { author: "alice", prCount: 2, mergeRate: 1 },
  ]),
  calculateTeamMetrics: jest.fn(() => [
    { team: "frontend", prCount: 3, members: ["alice", "bob"] },
  ]),
  loadTeamMapping: jest.fn(() => ({ alice: "frontend", bob: "frontend" })),
}));
jest.mock("../src/collectors/prFiles", () => ({
  collectFilesForPrs: jest.fn(async (prs: any[]) => {
    const map = new Map();
    for (const pr of prs) {
      map.set(pr.number, [{ sha: "a", filename: "src/index.ts", status: "modified", additions: 5, deletions: 2, changes: 7, patch: "@@ -1 +1 @@\n+new" }]);
    }
    return map;
  }),
}));
jest.mock("../src/analyzers/fileAnalyzer", () => ({
  analyzePrFiles: jest.fn(() => ({
    categories: { "src/index.ts": "source" },
    riskScore: 10,
    riskFactors: [],
    testHygiene: { ratio: 0, testFileChanges: 0, sourceFileChanges: 7, testFilesAdded: [], sourceFilesWithoutTests: ["src/index.ts"] },
    scopeSpread: { directories: ["src"], directoryCount: 1, topLevelModules: ["src"], topLevelModuleCount: 1 },
    reviewDepthSignal: "simple",
    diffComplexity: { bucket: "low", maxNestingDepthIncrease: 0, newFunctionCount: 0, regexLineCount: 0 },
    securityPatterns: [],
    aiGeneratedSignals: [],
    codePatterns: [],
  })),
}));
jest.mock("../src/analyzers/aiReviewContext", () => ({
  buildAiReviewContext: jest.fn(() => ({
    pr: { number: 1, title: "t" },
    analysis: {},
    files: [],
    metrics: null,
  })),
}));
jest.mock("../src/scoring/prScoring", () => ({
  scorePr: jest.fn((pr: any) => ({
    prNumber: pr.number,
    title: pr.title,
    author: pr.author?.login ?? null,
    score: 85,
    breakdown: {},
  })),
}));
jest.mock("../src/cache/fileStore", () => ({
  fileStore: jest.fn(() => ({})),
}));

import fs from "fs";
import os from "os";
import path from "path";
import logger from "../src/logger.js";

describe("cli", () => {
  const origArgv = process.argv;
  const stdout = jest
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);

  afterEach(() => {
    process.argv = origArgv;
    (logger.info as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    stdout.mockClear();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("prints JSON metrics", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    process.argv = ["node", "cli", "foo/bar", "--token", "t"];
    await runCli();
    expect(stdout).toHaveBeenCalledTimes(1);
    const firstCall = stdout.mock.calls[0]?.[0] as string;
    const output = JSON.parse(firstCall);
    expect(output.cycleTime.median).toBe(10);
    expect(output.pickupTime.p95).toBe(20);
    expect(output.aggregateMetrics).toBeDefined();
    expect(output.prScores).toBeDefined();
    expect(output.prScores.length).toBe(1);
    expect(output.prScores[0].score).toBe(85);
  });

  it("supports dry run", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--dry-run"];
    await runCli();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Would fetch metrics"),
    );
    expect(
      (require("../src/collectors/pullRequests") as any).collectPullRequests,
    ).not.toHaveBeenCalled();
  });

  it("prints progress information", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    const mod = require("../src/collectors/pullRequests");
    mod.collectPullRequests.mockImplementation(async (opts: any) => {
      opts.onProgress(1);
      opts.onProgress(2);
      return [];
    });
    const stderr = jest
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--progress"];
    await runCli();
    expect(stderr).toHaveBeenCalled();
    stderr.mockRestore();
  });

  it("writes metrics to stderr", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    const errSpy = jest
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    process.argv = [
      "node",
      "cli",
      "foo/bar",
      "--token",
      "t",
      "--output",
      "stderr",
    ];
    await runCli();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("passes label filters", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    const mod = require("../src/collectors/pullRequests");
    process.argv = [
      "node",
      "cli",
      "foo/bar",
      "--token",
      "t",
      "--include-labels",
      "team-a,team-b",
      "--exclude-labels",
      "wip",
    ];
    await runCli();
    expect(mod.collectPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        includeLabels: ["team-a", "team-b"],
        excludeLabels: ["wip"],
      }),
    );
  });

  it("uses cache when enabled", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    const mod = require("../src/collectors/pullRequests");
    const cacheMod = require("../src/cache/fileStore");
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--use-cache"];
    await runCli();
    expect(cacheMod.fileStore).toHaveBeenCalled();
    expect(mod.collectPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({ cache: expect.any(Object) })
    );
  });

  it("passes --resume to collector", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    const mod = require("../src/collectors/pullRequests");
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--resume"];
    await runCli();
    expect(mod.collectPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({ resume: true })
    );
  });

  it("parses --since values", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2024-05-20T00:00:00Z"));
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    const mod = require("../src/collectors/pullRequests");
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--since", "2d"];
    await runCli();
    jest.useRealTimers();
    expect(mod.collectPullRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        since: new Date("2024-05-18T00:00:00.000Z").toISOString(),
      }),
    );
  });

  it("logs debug when cycleTime calculation throws", async () => {
    const cycleMod = require("../src/calculators/cycleTime");
    cycleMod.calculateCycleTime.mockImplementation(() => {
      throw new Error("missing mergedAt");
    });
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    process.argv = ["node", "cli", "foo/bar", "--token", "t"];
    await runCli();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ pr: 1, err: "missing mergedAt" }),
      "Skipping cycle time calculation",
    );
  });

  it("logs debug when reviewMetrics calculation throws", async () => {
    const reviewMod = require("../src/calculators/reviewMetrics");
    reviewMod.calculateReviewMetrics.mockImplementation(() => {
      throw new Error("no reviews");
    });
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    process.argv = ["node", "cli", "foo/bar", "--token", "t"];
    await runCli();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ pr: 1, err: "no reviews" }),
      "Skipping pickup time calculation",
    );
  });

  it("respects --top flag for PR scores", async () => {
    const { runCli } = require("../src/cli");
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--top", "1"];
    await runCli();
    const firstCall = stdout.mock.calls[0]?.[0] as string;
    const output = JSON.parse(firstCall);
    expect(output.prScores).toHaveLength(1);
  });

  it("respects --bottom flag for PR scores", async () => {
    const { runCli } = require("../src/cli");
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--bottom", "1"];
    await runCli();
    const firstCall = stdout.mock.calls[0]?.[0] as string;
    const output = JSON.parse(firstCall);
    expect(output.prScores).toHaveLength(1);
  });

  it("includes author metrics with --group-by author", async () => {
    const { runCli } = require("../src/cli");
    process.argv = [
      "node", "cli", "foo/bar", "--token", "t", "--group-by", "author",
    ];
    await runCli();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    expect(output.authorMetrics).toBeDefined();
    expect(output.authorMetrics[0].author).toBe("alice");
  });

  it("includes team metrics with --group-by team", async () => {
    const { runCli } = require("../src/cli");
    process.argv = [
      "node", "cli", "foo/bar", "--token", "t",
      "--group-by", "team", "--team-config", "teams.json",
    ];
    await runCli();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    expect(output.teamMetrics).toBeDefined();
    expect(output.teamMetrics[0].team).toBe("frontend");
  });

  it("supports comma-separated repos", async () => {
    const { runCli } = require("../src/cli");
    process.argv = [
      "node", "cli", "foo/bar,foo/baz", "--token", "t",
    ];
    await runCli();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    expect(output.perRepo).toBeDefined();
    expect(output.perRepo["foo/bar"]).toBeDefined();
    expect(output.perRepo["foo/baz"]).toBeDefined();
  });

  it("supports --org flag", async () => {
    const { runCli } = require("../src/cli");
    process.argv = ["node", "cli", "--org", "myorg", "--token", "t"];
    await runCli();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    expect(output.perRepo).toBeDefined();
    expect(output.perRepo["myorg/repo1"]).toBeDefined();
  });

  it("includes comparison data with --compare", async () => {
    const { runCli } = require("../src/cli");
    process.argv = [
      "node", "cli", "foo/bar", "--token", "t", "--compare",
    ];
    await runCli();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    expect(output.comparison).toBeDefined();
    expect(output.comparison.deltas).toBeDefined();
  });

  it("errors when --group-by team without --team-config", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    process.argv = [
      "node", "cli", "foo/bar", "--token", "t", "--group-by", "team",
    ];
    await runCli();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("--team-config is required"),
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it("includes perRepo in comparison for multi-repo", async () => {
    const { runCli } = require("../src/cli");
    process.argv = [
      "node", "cli", "foo/bar,foo/baz", "--token", "t", "--compare",
    ];
    await runCli();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    expect(output.comparison).toBeDefined();
    expect(output.comparison.previous).toBeDefined();
    expect(output.comparison.previous.perRepo).toBeDefined();
    expect(output.comparison.previous.perRepo["foo/bar"]).toBeDefined();
    expect(output.comparison.previous.perRepo["foo/baz"]).toBeDefined();
  });

  it("includes file analysis with --code-analysis", async () => {
    const { runCli } = require("../src/cli");
    process.argv = [
      "node", "cli", "foo/bar", "--token", "t", "--code-analysis",
    ];
    await runCli();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    expect(output.prScores[0].fileAnalysis).toBeDefined();
    expect(output.prScores[0].fileAnalysis.riskScore).toBe(10);
  });

  it("includes AI context with --ai-context", async () => {
    const { runCli } = require("../src/cli");
    process.argv = [
      "node", "cli", "foo/bar", "--token", "t", "--ai-context",
    ];
    await runCli();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    expect(output.prScores[0].aiContext).toBeDefined();
    expect(output.prScores[0].fileAnalysis).toBeDefined();
  });

  it("fetches files with --include-files without analysis", async () => {
    const { runCli } = require("../src/cli");
    const filesMod = require("../src/collectors/prFiles");
    process.argv = [
      "node", "cli", "foo/bar", "--token", "t", "--include-files",
    ];
    await runCli();
    expect(filesMod.collectFilesForPrs).toHaveBeenCalled();
    const output = JSON.parse(stdout.mock.calls[0]?.[0] as string);
    // --include-files alone doesn't add fileAnalysis to output
    expect(output.prScores[0].fileAnalysis).toBeUndefined();
  });

  it("rejects owner/repo with invalid characters", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    process.argv = ["node", "cli", "foo/bar;rm", "--token", "t"];
    await runCli();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Invalid owner or repo name"),
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it("accepts valid owner/repo with hyphens and dots", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    process.argv = ["node", "cli", "my-org/my.repo", "--token", "t"];
    await runCli();
    expect(logger.error).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalled();
  });

  it("errors on invalid --since", async () => {
    const { runCli } = require("../src/cli");
    const logger = require("../src/logger.js").default;
    const mod = require("../src/collectors/pullRequests");
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--since", "bad"];
    await runCli();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Invalid duration"),
    );
    expect(mod.collectPullRequests).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });
});
