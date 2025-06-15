import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Calculate the portion of check suites that completed successfully.
 *
 * @param pr - pull request record
 * @returns success rate of CI check suites
 */
export function calculateCiPassRate(pr: RawPullRequest): number {
  if (!pr.checkSuites) {
    throw new Error("Missing check suite data");
  }
  let total = 0;
  let passed = 0;
  for (const suite of pr.checkSuites) {
    total += 1;
    if (suite.conclusion === "SUCCESS") passed += 1;
  }
  return total ? passed / total : 0;
}

import { register } from "../plugins/registry.js";
register({
  slug: "ci_pass_rate",
  description: "Portion of CI runs that pass",
  calculate: calculateCiPassRate,
});

export default calculateCiPassRate;
