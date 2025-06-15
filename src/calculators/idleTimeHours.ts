import type { RawPullRequest } from "../collectors/pullRequests.js";

/**
 * Sum time exceeding 24h between PR activity events.
 *
 * @param pr - pull request record
 * @returns idle time in hours rounded to one decimal
 * @throws if required timestamps are missing
 */
export function calculateIdleTimeHours(pr: RawPullRequest): number {
  if (!pr.createdAt) {
    throw new Error("Missing createdAt timestamp");
  }
  const end = pr.mergedAt ?? pr.closedAt ?? pr.updatedAt;
  if (!end) {
    throw new Error("Missing end timestamp");
  }
  const startTime = Date.parse(pr.createdAt);
  const endTime = Date.parse(end);
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    throw new Error("Invalid timestamp");
  }
  const eventTimes: number[] = [startTime];
  for (const c of pr.commits) {
    const t = Date.parse(c.committedDate);
    if (!Number.isNaN(t)) eventTimes.push(t);
  }
  for (const r of pr.reviews) {
    const t = Date.parse(r.submittedAt);
    if (!Number.isNaN(t)) eventTimes.push(t);
  }
  eventTimes.sort((a, b) => a - b);
  if (eventTimes[eventTimes.length - 1] !== endTime) {
    eventTimes.push(endTime);
  }
  const dayMs = 86_400_000;
  let idleMs = 0;
  for (let i = 1; i < eventTimes.length; i += 1) {
    const gap = eventTimes[i]! - eventTimes[i - 1]!;
    if (gap > dayMs) {
      idleMs += gap - dayMs;
    }
  }
  const hours = idleMs / 3_600_000;
  return Math.round(hours * 10) / 10;
}

export default calculateIdleTimeHours;
