import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Calculate pickup time in hours between PR creation and first review.
 *
 * @param pr - pull request record
 * @returns hours from creation to first review rounded to one decimal
 * @throws if `createdAt` or review timestamps are missing
 */
export function calculateReviewMetrics(pr: RawPullRequest): number {
  if (!pr.createdAt) {
    throw new Error("Missing createdAt timestamp");
  }
  const created = Date.parse(pr.createdAt);
  if (Number.isNaN(created)) {
    throw new Error("Invalid createdAt timestamp");
  }
  const submittedTimes = pr.reviews
    .map((r) => Date.parse(r.submittedAt))
    .filter((t) => !Number.isNaN(t));
  if (submittedTimes.length === 0) {
    throw new Error("No valid review submittedAt timestamps");
  }
  const firstReview = Math.min(...submittedTimes);
  const hours = (firstReview - created) / 3_600_000;
  return Math.round(hours * 10) / 10;
}

import { register } from "../plugins/registry.js";
// Stryker disable all
register({
  slug: "pickup_time",
  description: "Hours until first review",
  calculate: calculateReviewMetrics,
});
// Stryker restore all

export default calculateReviewMetrics;
