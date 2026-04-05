import { ScoreRule } from "../scoring.js";
import { createRangeNormalizer } from "../normalize.js";
import type { PrMetricsSnapshot } from "./prScoring.js";

const cycleTimeNorm = createRangeNormalizer(
  [
    { max: 4, score: 100 },
    { max: 24, score: 80 },
    { max: 72, score: 60 },
    { max: 168, score: 40 },
  ],
  20,
);

const pickupTimeNorm = createRangeNormalizer(
  [
    { max: 2, score: 100 },
    { max: 6, score: 80 },
    { max: 12, score: 60 },
    { max: 24, score: 40 },
  ],
  20,
);

const idleTimeNorm = createRangeNormalizer(
  [
    { max: 4, score: 100 },
    { max: 24, score: 80 },
    { max: 48, score: 60 },
  ],
  20,
);

const sizeNorm = createRangeNormalizer(
  [
    { max: 50, score: 100 },
    { max: 200, score: 80 },
    { max: 500, score: 60 },
  ],
  30,
);

export const defaultScorecard: ScoreRule<PrMetricsSnapshot>[] = [
  {
    metric: "cycleTimeHours",
    weight: 0.2,
    normalize: (v) => cycleTimeNorm(v),
  },
  {
    metric: "pickupTimeHours",
    weight: 0.15,
    normalize: (v) => pickupTimeNorm(v),
  },
  {
    fn: (m) => Math.min(m.reviewerCount ?? 0, 3) / 3,
    weight: 0.1,
    normalize: (v) => v * 100,
  },
  {
    metric: "ciPassRate",
    weight: 0.15,
    normalize: (v) => v * 100,
  },
  {
    metric: "changeRequestRatio",
    weight: 0.1,
    normalize: (v) => (1 - v) * 100,
  },
  {
    metric: "idleTimeHours",
    weight: 0.1,
    normalize: (v) => idleTimeNorm(v),
  },
  {
    fn: (m) => m.linesChanged,
    weight: 0.1,
    normalize: (v) => sizeNorm(v),
  },
  {
    metric: "revertRate",
    weight: 0.1,
    normalize: (v) => (1 - v) * 100,
  },
  // File-level rules — contribute 0 when file data is absent
  {
    fn: (m) => (m.fileRiskScore !== undefined ? m.fileRiskScore : NaN),
    weight: 0.05,
    normalize: (v) => 100 - v,
  },
  {
    fn: (m) =>
      m.testHygieneRatio !== undefined && m.testHygieneRatio !== null
        ? m.testHygieneRatio
        : NaN,
    weight: 0.03,
    normalize: (v) => Math.min(v, 1) * 100,
  },
  {
    fn: (m) =>
      m.securityPatternCount !== undefined ? m.securityPatternCount : NaN,
    weight: 0.02,
    normalize: (v) => (v === 0 ? 100 : Math.max(0, 100 - v * 25)),
  },
];
