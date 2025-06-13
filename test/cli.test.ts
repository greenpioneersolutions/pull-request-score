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
}));

jest.mock("../src/calculators/cycleTime", () => ({
  calculateCycleTime: jest.fn(() => 10),
}));
jest.mock("../src/calculators/reviewMetrics", () => ({
  calculateReviewMetrics: jest.fn(() => 20),
}));

import { runCli } from "../src/cli";

describe("cli", () => {
  const origArgv = process.argv;
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const stdout = jest
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);

  afterEach(() => {
    process.argv = origArgv;
    log.mockClear();
    error.mockClear();
    stdout.mockClear();
    jest.clearAllMocks();
  });

  it("prints JSON metrics", async () => {
    process.argv = ["node", "cli", "foo/bar", "--token", "t"];
    await runCli();
    expect(stdout).toHaveBeenCalledTimes(1);
    const firstCall = stdout.mock.calls[0]?.[0] as string;
    const output = JSON.parse(firstCall);
    expect(output.cycleTime.median).toBe(10);
    expect(output.pickupTime.p95).toBe(20);
  });

  it("supports dry run", async () => {
    process.argv = ["node", "cli", "foo/bar", "--token", "t", "--dry-run"];
    await runCli();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("Would fetch metrics"),
    );
    expect(
      (require("../src/collectors/pullRequests") as any).collectPullRequests,
    ).not.toHaveBeenCalled();
  });

  it("prints progress information", async () => {
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
});
