import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Count unique reviewers on a pull request.
 *
 * @param pr - pull request record
 * @returns number of distinct reviewers
 * @throws if review data is missing
 */
export function calculateReviewerCount(pr: RawPullRequest): number {
  if (!pr.reviews) {
    throw new Error("Missing review data");
  }
  const reviewers = new Set<string>();
  for (const review of pr.reviews) {
    if (review.author?.login) {
      reviewers.add(review.author.login);
    }
  }
  return reviewers.size;
}

import { register } from "../plugins/registry.js";
// Stryker disable all
register({
  slug: "reviewer_count",
  description: "Number of unique reviewers",
  calculate: calculateReviewerCount,
});
// Stryker restore all

export default calculateReviewerCount;
