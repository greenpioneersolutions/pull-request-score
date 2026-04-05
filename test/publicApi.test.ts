jest.mock("@octokit/request", () => ({
  request: jest.fn(),
}));
jest.mock("@octokit/graphql", () => ({
  graphql: Object.assign(jest.fn(), {
    defaults: jest.fn(() => jest.fn()),
    endpoint: jest.fn(),
  }),
}));
jest.mock("@octokit/core", () => ({
  Octokit: class {
    static plugin() { return this; }
  },
}));
jest.mock("@octokit/plugin-throttling", () => ({ throttling: {} }));
jest.mock("bottleneck", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(function (this: any) {
    this.schedule = jest.fn(async (fn: any) => fn());
  }),
}));
jest.mock("better-sqlite3", () => {
  throw new Error("not available");
});

import {
  collectPullRequests,
  calculateCycleTime,
  calculateReviewMetrics,
  calculateMetrics,
  calculateCiMetrics,
  runCli,
  registerMetric,
  parseTicket,
  hasTicket,
  scoreMetrics,
  createRangeNormalizer,
  stats,
  scorePr,
  computePrSnapshot,
  defaultScorecard,
  calculateAuthorMetrics,
  calculateTeamMetrics,
  groupByAuthor,
  loadTeamMapping,
  parsePeriods,
  computeDeltas,
  fetchOrgRepos,
  collectPrFiles,
  collectFilesForPrs,
  analyzePrFiles,
  buildAiReviewContext,
  classifyFiles,
  calculateRiskScore,
  calculateTestHygiene,
  calculateScopeSpread,
  calculateReviewDepthSignal,
  calculateDiffComplexity,
  detectSecurityPatterns,
  detectAiGeneratedSignals,
  detectCodePatterns,
} from "../src/index";

describe("public API", () => {
  it("exports all expected functions", () => {
    expect(typeof collectPullRequests).toBe("function");
    expect(typeof calculateCycleTime).toBe("function");
    expect(typeof calculateReviewMetrics).toBe("function");
    expect(typeof calculateMetrics).toBe("function");
    expect(typeof calculateCiMetrics).toBe("function");
    expect(typeof runCli).toBe("function");
    expect(typeof registerMetric).toBe("function");
    expect(typeof parseTicket).toBe("function");
    expect(typeof hasTicket).toBe("function");
    expect(typeof scoreMetrics).toBe("function");
    expect(typeof createRangeNormalizer).toBe("function");
    expect(typeof stats).toBe("function");
    expect(typeof scorePr).toBe("function");
    expect(typeof computePrSnapshot).toBe("function");
    expect(Array.isArray(defaultScorecard)).toBe(true);
    expect(typeof calculateAuthorMetrics).toBe("function");
    expect(typeof calculateTeamMetrics).toBe("function");
    expect(typeof groupByAuthor).toBe("function");
    expect(typeof loadTeamMapping).toBe("function");
    expect(typeof parsePeriods).toBe("function");
    expect(typeof computeDeltas).toBe("function");
    expect(typeof fetchOrgRepos).toBe("function");
    expect(typeof collectPrFiles).toBe("function");
    expect(typeof collectFilesForPrs).toBe("function");
    expect(typeof analyzePrFiles).toBe("function");
    expect(typeof buildAiReviewContext).toBe("function");
    expect(typeof classifyFiles).toBe("function");
    expect(typeof calculateRiskScore).toBe("function");
    expect(typeof calculateTestHygiene).toBe("function");
    expect(typeof calculateScopeSpread).toBe("function");
    expect(typeof calculateReviewDepthSignal).toBe("function");
    expect(typeof calculateDiffComplexity).toBe("function");
    expect(typeof detectSecurityPatterns).toBe("function");
    expect(typeof detectAiGeneratedSignals).toBe("function");
    expect(typeof detectCodePatterns).toBe("function");
  });
});
