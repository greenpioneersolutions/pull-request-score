import "./plugins/autoRegister.js";
export { collectPullRequests } from "./collectors/pullRequests.js";
export { calculateCycleTime } from "./calculators/cycleTime.js";
export { calculateReviewMetrics } from "./calculators/reviewMetrics.js";
export { calculateMetrics } from "./calculators/metrics.js";
export { calculateCiMetrics } from "./calculators/ciMetrics.js";
export { runCli } from "./cli.js";
export { register as registerMetric } from "./plugins/registry.js";
export { parseTicket, hasTicket } from "./utils/parseTicket.js";
export { scoreMetrics } from "./scoring.js";
export type { ScoreRule } from "./scoring.js";
export { createRangeNormalizer } from "./normalize.js";
export type { RangeRule } from "./normalize.js";
export { stats } from "./stats.js";
export type { StatsResult } from "./stats.js";
export { scorePr, computePrSnapshot } from "./scoring/prScoring.js";
export type {
  PrScoreResult,
  PrMetricsSnapshot,
  PrScoreBreakdownEntry,
} from "./scoring/prScoring.js";
export { defaultScorecard } from "./scoring/defaultScorecard.js";
export {
  calculateAuthorMetrics,
  calculateTeamMetrics,
  groupByAuthor,
  loadTeamMapping,
} from "./calculators/groupMetrics.js";
export type {
  AuthorMetrics,
  TeamMetrics,
  TeamMapping,
} from "./calculators/groupMetrics.js";
export { fetchOrgRepos } from "./collectors/orgRepos.js";
export { parsePeriods } from "./comparison/periodParser.js";
export type { PeriodRange, ParsedPeriods } from "./comparison/periodParser.js";
export { computeDeltas } from "./comparison/trendComparison.js";
export type {
  MetricDelta,
  TrendComparison,
} from "./comparison/trendComparison.js";
export {
  collectPrFiles,
  collectFilesForPrs,
} from "./collectors/prFiles.js";
export type {
  PrFile,
  FileCategory,
  FileAnalysis,
  AiReviewContext,
  RiskFactor,
  TestHygiene,
  ScopeSpread,
  DiffComplexity,
  SecurityPattern,
  AiGeneratedSignal,
  CodePattern,
} from "./models/files.js";
export { analyzePrFiles } from "./analyzers/fileAnalyzer.js";
export { buildAiReviewContext } from "./analyzers/aiReviewContext.js";
export { classifyFiles } from "./calculators/fileCategories.js";
export { calculateRiskScore } from "./calculators/riskScore.js";
export { calculateTestHygiene } from "./calculators/testHygiene.js";
export { calculateScopeSpread } from "./calculators/scopeSpread.js";
export { calculateReviewDepthSignal } from "./calculators/reviewDepthSignal.js";
export { calculateDiffComplexity } from "./calculators/diffComplexity.js";
export { detectSecurityPatterns } from "./calculators/securityPatterns.js";
export { detectAiGeneratedSignals } from "./calculators/aiGeneratedSignals.js";
export { detectCodePatterns } from "./calculators/codePatterns.js";
