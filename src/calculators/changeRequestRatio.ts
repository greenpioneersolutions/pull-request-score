import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Calculate the portion of reviews requesting changes.
 *
 * @param pr - pull request record
 * @returns ratio of change requests to total reviews
 * @throws if there are no reviews
 */
export function calculateChangeRequestRatio(pr: RawPullRequest): number {
  if (!pr.reviews || pr.reviews.length === 0) {
    throw new Error("No reviews to evaluate change request ratio");
  }
  let total = 0;
  let requested = 0;
  for (const review of pr.reviews) {
    total += 1;
    if (review.state === "CHANGES_REQUESTED") requested += 1;
  }
  return requested / total;
}

export default calculateChangeRequestRatio;
