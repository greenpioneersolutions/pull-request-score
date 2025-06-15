import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Categorise pull request size by lines changed.
 *
 * @param pr - pull request record
 * @returns "S", "M" or "L" size bucket
 */
export function calculateSizeBucket(pr: RawPullRequest): string {
  const linesChanged = pr.additions + pr.deletions;
  if (linesChanged < 50) return "S";
  if (linesChanged < 400) return "M";
  return "L";
}

export default calculateSizeBucket;
