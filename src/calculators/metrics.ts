export interface MetricsOptions {
  outsizedThreshold?: number;
  staleDays?: number;
}

import type { RawPullRequest } from "../collectors/pullRequests.js";

export interface CalculatedMetrics {
  prCountPerDeveloper: Record<string, number>;
  mergeRate: number;
  closedWithoutMergeRate: number;
  averageCommitsPerPr: number;
  outsizedPrs: number[];
  outsizedPrRatio: number;
  reviewCoverage: number;
  reviewCounts: Record<number, number>;
  buildSuccessRate: number;
  averageCiDuration: number;
  stalePrCount: number;
  hotfixFrequency: number;
  prBacklog: number;
}

export function calculateMetrics(
  prs: RawPullRequest[],
  opts: MetricsOptions = {},
): CalculatedMetrics {
  const outsizedThreshold = opts.outsizedThreshold ?? 1000;
  const staleDays = opts.staleDays ?? 30;

  const prCountPerDeveloper: Record<string, number> = {};
  let merged = 0;
  let closedWithoutMerge = 0;
  let commitCount = 0;
  const outsizedPrs: number[] = [];
  let outsizedCount = 0;
  let reviewedPrs = 0;
  let buildSuccess = 0;
  let checkSuiteCount = 0;
  let totalCiDuration = 0;
  let stalePrCount = 0;
  let hotfixCount = 0;
  let prBacklog = 0;
  const reviewCounts: Record<number, number> = {};

  for (const pr of prs) {
    if (pr.author?.login) {
      prCountPerDeveloper[pr.author.login] =
        (prCountPerDeveloper[pr.author.login] ?? 0) + 1;
    }
    if (pr.mergedAt) merged += 1;
    if (!pr.mergedAt && pr.closedAt) closedWithoutMerge += 1;
    commitCount += pr.commits.length;
    const lines = pr.additions + pr.deletions;
    if (lines > outsizedThreshold) {
      outsizedPrs.push(pr.number);
      outsizedCount += 1;
    }

    if (pr.reviews.length > 0) {
      reviewedPrs += 1;
      reviewCounts[pr.number] = pr.reviews.length;
    }

    for (const cs of pr.checkSuites) {
      checkSuiteCount += 1;
      if (cs.conclusion === "SUCCESS") buildSuccess += 1;
      const start = Date.parse(cs.startedAt);
      const end = Date.parse(cs.completedAt);
      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        totalCiDuration += end - start;
      }
    }

    if (pr.state === "OPEN") {
      prBacklog += 1;
      const updated = Date.parse(pr.updatedAt);
      if (Date.now() - updated > staleDays * 86_400_000) {
        stalePrCount += 1;
      }
    }

    if (pr.labels.some((l) => /hotfix/i.test(l.name))) {
      hotfixCount += 1;
    }
  }

  return {
    prCountPerDeveloper,
    mergeRate: prs.length ? merged / prs.length : 0,
    closedWithoutMergeRate: prs.length ? closedWithoutMerge / prs.length : 0,
    averageCommitsPerPr: prs.length ? commitCount / prs.length : 0,
    outsizedPrs,
    outsizedPrRatio: prs.length ? outsizedCount / prs.length : 0,
    reviewCoverage: prs.length ? reviewedPrs / prs.length : 0,
    reviewCounts,
    buildSuccessRate: checkSuiteCount ? buildSuccess / checkSuiteCount : 0,
    averageCiDuration: checkSuiteCount
      ? totalCiDuration / checkSuiteCount / 1000
      : 0,
    stalePrCount,
    hotfixFrequency: prs.length ? hotfixCount / prs.length : 0,
    prBacklog,
  };
}

export default calculateMetrics;
