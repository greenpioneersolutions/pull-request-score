import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Calculate comment density relative to lines changed.
 *
 * @param pr - pull request record
 * @returns ratio of comments to total line changes
 * @throws if there are no line changes
 */
export function calculateCommentDensity(pr: RawPullRequest): number {
  const linesChanged = pr.additions + pr.deletions;
  if (linesChanged === 0) {
    throw new Error("No code changes to calculate comment density");
  }
  return pr.comments.length / linesChanged;
}

import { register } from "../plugins/registry.js";
// Stryker disable all
register({
  slug: "comment_density",
  description: "Comments per line changed",
  calculate: calculateCommentDensity,
});
// Stryker restore all

export default calculateCommentDensity;
