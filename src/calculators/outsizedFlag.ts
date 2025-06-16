import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Flag pull requests that change an unusually large number of lines.
 *
 * @param pr - pull request record
 * @param limit - maximum lines changed before flagging
 * @returns true if (additions + deletions) exceeds the limit
 */
export function calculateOutsizedFlag(
  pr: RawPullRequest,
  limit = 800,
): boolean {
  const linesChanged = pr.additions + pr.deletions;
  return linesChanged > limit;
}

import { register } from "../plugins/registry.js";
// Stryker disable all
register({
  slug: "outsized_flag",
  description: "Flags PRs that exceed the outsized threshold",
  calculate: calculateOutsizedFlag,
});
// Stryker restore all

export default calculateOutsizedFlag;
