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
    level: 'info',
  },
}));

jest.mock("../src/calculators/cycleTime", () => ({
  calculateCycleTime: jest.fn(() => 10),
}));
jest.mock("../src/calculators/reviewMetrics", () => ({
  calculateReviewMetrics: jest.fn(() => 20),
}));
jest.mock("../src/cache/sqliteStore", () => ({
  sqliteStore: jest.fn(() => ({})),
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
    const cacheMod = require("../src/cache/sqliteStore");
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--use-cache"];
    await runCli();
    expect(cacheMod.sqliteStore).toHaveBeenCalled();
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
