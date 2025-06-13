import type { RawPullRequest } from '../collectors/pullRequests.js';

/**
 * Calculate the cycle time in hours between PR creation and merge.
 *
 * @param pr - pull request record
 * @returns hours from creation to merge rounded to one decimal
 * @throws if `createdAt` or `mergedAt` is missing
 */
export function calculateCycleTime(pr: RawPullRequest): number {
  if (!pr.createdAt || !pr.mergedAt) {
    throw new Error('Missing createdAt or mergedAt timestamp');
  }
  const created = Date.parse(pr.createdAt);
  const merged = Date.parse(pr.mergedAt);
  if (Number.isNaN(created) || Number.isNaN(merged)) {
    throw new Error('Invalid timestamp');
  }
  const hours = (merged - created) / 3_600_000;
  return Math.round(hours * 10) / 10;
}

export default calculateCycleTime;
