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

  afterEach(() => {
    process.argv = origArgv;
    log.mockClear();
    error.mockClear();
    jest.clearAllMocks();
  });

  it("prints JSON metrics", async () => {
    process.argv = ["node", "cli", "foo/bar", "--token", "t"];
    await runCli();
    expect(log).toHaveBeenCalledTimes(1);
    const firstCall = log.mock.calls[0]?.[0] as string;
    const output = JSON.parse(firstCall);
    expect(output.cycleTime.median).toBe(10);
    expect(output.pickupTime.p95).toBe(20);
  });
});
