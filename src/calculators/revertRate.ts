import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Determine the proportion of commits that are revert commits.
 *
 * @param pr - pull request record
 * @returns ratio of revert commits
 * @throws if commit data is missing
 */
export function calculateRevertRate(pr: RawPullRequest): number {
  if (!pr.commits || pr.commits.length === 0) {
    throw new Error("No commits to evaluate revert rate");
  }
  let total = 0;
  let reverts = 0;
  for (const commit of pr.commits) {
    total += 1;
    if (/\brevert\b/i.test(commit.messageHeadline)) reverts += 1;
  }
  return reverts / total;
}

export default calculateRevertRate;
