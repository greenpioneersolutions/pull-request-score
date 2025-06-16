import { scoreMetrics, ScoreRule } from "../src/scoring";
import { createRangeNormalizer } from "../src/normalize";
import type { CalculatedMetrics } from "../src/calculators/metrics";

describe("scoreMetrics", () => {
  const metrics: CalculatedMetrics = {
    prCountPerDeveloper: {},
    mergeRate: 0.8,
    closedWithoutMergeRate: 0.1,
    averageCommitsPerPr: 2,
    outsizedPrs: [],
    outsizedPrRatio: 0,
    reviewCoverage: 0.9,
    reviewCounts: {},
    buildSuccessRate: 1,
    averageCiDuration: 50,
    stalePrCount: 1,
    hotfixFrequency: 0,
    prBacklog: 3,
  };

  it("calculates weighted sum using metric names", () => {
    const rules: ScoreRule<CalculatedMetrics>[] = [
      { weight: 0.6, metric: "mergeRate" },
      { weight: 0.4, metric: "reviewCoverage" },
    ];
    const score = scoreMetrics(metrics, rules);
    expect(score).toBeCloseTo(0.84);
  });

  it("supports custom functions", () => {
    const rules: ScoreRule<CalculatedMetrics>[] = [
      { weight: 1, metric: "mergeRate" },
      { weight: -0.1, fn: (m) => m.prBacklog },
    ];
    const score = scoreMetrics(metrics, rules);
    expect(score).toBeCloseTo(0.8 - 0.3);
  });

  it("normalizes values before weighting", () => {
    const rules: ScoreRule<CalculatedMetrics>[] = [
      { weight: 0.5, metric: "mergeRate", normalize: (v) => v * 100 },
      { weight: 0.5, metric: "reviewCoverage", normalize: (v) => v * 100 },
    ];
    const score = scoreMetrics(metrics, rules);
    expect(score).toBeCloseTo(85);
  });

  it("maps review time ranges to scores", () => {
    interface ReviewMetrics {
      pickupTime: number;
    }
    const review: ReviewMetrics = { pickupTime: 5 };
    const normalize = createRangeNormalizer(
      [
        { max: 4, score: 100 },
        { max: 6, score: 80 },
        { max: 12, score: 60 },
      ],
      40,
    );
    const rules: ScoreRule<ReviewMetrics>[] = [
      { weight: 1, metric: "pickupTime", normalize },
    ];
    const score = scoreMetrics(review, rules);
    expect(score).toBe(80);
  });
});

describe("createRangeNormalizer", () => {
  it("applies thresholds in order", () => {
    const normalize = createRangeNormalizer(
      [
        { max: 10, score: 50 },
        { max: 20, score: 30 },
      ],
      0,
    );
    expect(normalize(5)).toBe(50);
    expect(normalize(15)).toBe(30);
    expect(normalize(25)).toBe(0);
  });
  it("handles edge cases and decimals", () => {
    const normalize = createRangeNormalizer(
      [
        { max: 4, score: 100 },
        { max: 6, score: 80 },
        { max: 12, score: 60 },
      ],
      40,
    );
    expect(normalize(-1)).toBe(100);
    expect(normalize(0)).toBe(100);
    expect(normalize(4)).toBe(80);
    expect(normalize(6)).toBe(60);
    expect(normalize(12)).toBe(40);
    expect(normalize(5.5)).toBe(80);
  });

  it("supports rounding strategies on percentages", () => {
    const floorNorm = (v: number) => Math.floor(v * 100);
    const ceilNorm = (v: number) => Math.ceil(v * 100);
    expect(floorNorm(0.955)).toBe(95);
    expect(ceilNorm(0.955)).toBe(96);
  });

  it("aggregates multiple normalizers in scoring", () => {
    const metrics = { pickupTime: 4.5, mergeRate: 0.92 };
    const range = createRangeNormalizer(
      [
        { max: 4, score: 100 },
        { max: 6, score: 80 },
        { max: 12, score: 60 },
      ],
      40,
    );
    const percent = (v: number) => Math.round(v * 100);
    const rules: ScoreRule<typeof metrics>[] = [
      { weight: 0.5, metric: "pickupTime", normalize: range },
      { weight: 0.5, metric: "mergeRate", normalize: percent },
    ];
    const score = scoreMetrics(metrics, rules);
    expect(score).toBeCloseTo(86);
  });

  it("combines multiple rules for one metric", () => {
    const metrics = { mergeRate: 0.955 };
    const floor = (v: number) => Math.floor(v * 100);
    const ceil = (v: number) => Math.ceil(v * 100);
    const rules: ScoreRule<typeof metrics>[] = [
      { weight: 0.5, metric: "mergeRate", normalize: floor },
      { weight: 0.5, metric: "mergeRate", normalize: ceil },
    ];
    const score = scoreMetrics(metrics, rules);
    expect(score).toBeCloseTo(95.5);
  });
});
