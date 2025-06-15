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

export default calculateCommentDensity;
