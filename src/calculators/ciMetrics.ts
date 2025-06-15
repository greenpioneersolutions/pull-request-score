import type { RawPullRequest } from "../collectors/pullRequests.js";

export interface CiMetrics {
  /** Portion of check suites that completed successfully */
  successRate: number;
  /** Average duration of a check suite in seconds */
  averageDuration: number;
}

/**
 * Calculate CI related metrics for a pull request.
 *
 * @param pr - pull request record
 * @returns CI metrics
 */
export function calculateCiMetrics(pr: RawPullRequest): CiMetrics {
  let total = 0;
  let success = 0;
  let durationTotal = 0;

  for (const suite of pr.checkSuites) {
    total += 1;
    if (suite.conclusion === "SUCCESS") success += 1;
    const start = Date.parse(suite.startedAt);
    const end = Date.parse(suite.completedAt);
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      durationTotal += end - start;
    }
  }

  return {
    successRate: total ? success / total : 0,
    averageDuration: total ? durationTotal / total / 1000 : 0,
  };
}

import { register } from "../plugins/registry.js";
register({
  slug: "ci_metrics",
  description: "Success rate and duration of CI runs",
  calculate: calculateCiMetrics,
});

export default calculateCiMetrics;
