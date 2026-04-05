import { RawPullRequest } from "../collectors/pullRequests.js";
import { scoreMetrics, ScoreRule } from "../scoring.js";
import { calculateCycleTime } from "../calculators/cycleTime.js";
import { calculateReviewMetrics } from "../calculators/reviewMetrics.js";
import { calculateReviewerCount } from "../calculators/reviewerCount.js";
import { calculateChangeRequestRatio } from "../calculators/changeRequestRatio.js";
import { calculateRevertRate } from "../calculators/revertRate.js";
import { calculateCommentDensity } from "../calculators/commentDensity.js";
import { calculateCiPassRate } from "../calculators/ciPassRate.js";
import { calculateIdleTimeHours } from "../calculators/idleTimeHours.js";
import { calculateSizeBucket } from "../calculators/sizeBucket.js";
import { calculateOutsizedFlag } from "../calculators/outsizedFlag.js";
import { defaultScorecard } from "./defaultScorecard.js";
import type { FileAnalysis } from "../models/files.js";

export interface PrMetricsSnapshot {
  cycleTimeHours: number | null;
  pickupTimeHours: number | null;
  reviewerCount: number | null;
  changeRequestRatio: number | null;
  revertRate: number | null;
  commentDensity: number | null;
  ciPassRate: number | null;
  idleTimeHours: number | null;
  sizeBucket: string | null;
  linesChanged: number;
  outsized: boolean;
  /** File-level metrics (only populated when file analysis is available) */
  fileRiskScore?: number;
  testHygieneRatio?: number | null;
  scopeSpreadCount?: number;
  reviewDepthSignal?: "simple" | "complex" | "critical";
  diffComplexityBucket?: "low" | "medium" | "high";
  securityPatternCount?: number;
}

export interface PrScoreBreakdownEntry {
  raw: number;
  normalized: number;
  weighted: number;
}

export interface PrScoreResult {
  prNumber: number;
  title: string;
  author: string | null;
  score: number;
  breakdown: Record<string, PrScoreBreakdownEntry>;
}

function tryCalc<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

export function computePrSnapshot(
  pr: RawPullRequest,
  fileAnalysis?: FileAnalysis,
): PrMetricsSnapshot {
  const snapshot: PrMetricsSnapshot = {
    cycleTimeHours: tryCalc(() => calculateCycleTime(pr)),
    pickupTimeHours: tryCalc(() => calculateReviewMetrics(pr)),
    reviewerCount: tryCalc(() => calculateReviewerCount(pr)),
    changeRequestRatio: tryCalc(() => calculateChangeRequestRatio(pr)),
    revertRate: tryCalc(() => calculateRevertRate(pr)),
    commentDensity: tryCalc(() => calculateCommentDensity(pr)),
    ciPassRate: tryCalc(() => calculateCiPassRate(pr)),
    idleTimeHours: tryCalc(() => calculateIdleTimeHours(pr)),
    sizeBucket: tryCalc(() => calculateSizeBucket(pr)),
    linesChanged: pr.additions + pr.deletions,
    outsized: calculateOutsizedFlag(pr),
  };

  if (fileAnalysis) {
    snapshot.fileRiskScore = fileAnalysis.riskScore;
    snapshot.testHygieneRatio = fileAnalysis.testHygiene.ratio;
    snapshot.scopeSpreadCount = fileAnalysis.scopeSpread.directoryCount;
    snapshot.reviewDepthSignal = fileAnalysis.reviewDepthSignal;
    snapshot.diffComplexityBucket = fileAnalysis.diffComplexity?.bucket;
    snapshot.securityPatternCount = fileAnalysis.securityPatterns.length;
  }

  return snapshot;
}

export function scorePr(
  pr: RawPullRequest,
  rules?: ScoreRule<PrMetricsSnapshot>[],
  fileAnalysis?: FileAnalysis,
): PrScoreResult {
  const snapshot = computePrSnapshot(pr, fileAnalysis);
  const activeRules = rules ?? defaultScorecard;
  const score = scoreMetrics(snapshot, activeRules);

  const breakdown: Record<string, PrScoreBreakdownEntry> = {};
  for (const rule of activeRules) {
    const key =
      typeof rule.metric === "string"
        ? rule.metric
        : `rule_${activeRules.indexOf(rule)}`;
    const raw =
      typeof rule.fn === "function"
        ? rule.fn(snapshot)
        : (snapshot as any)[rule.metric as string];
    if (typeof raw !== "number" || Number.isNaN(raw)) continue;
    const normalized =
      typeof rule.normalize === "function"
        ? rule.normalize(raw, snapshot)
        : raw;
    breakdown[key] = {
      raw,
      normalized,
      weighted: normalized * rule.weight,
    };
  }

  return {
    prNumber: pr.number,
    title: pr.title,
    author: pr.author?.login ?? null,
    score: Math.round(score * 100) / 100,
    breakdown,
  };
}
