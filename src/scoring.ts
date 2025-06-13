export interface ScoreRule<Metrics> {
  /** weight multiplier applied to the rule result */
  weight: number;
  /**
   * Name of a numeric field on the metrics object. Ignored if `fn` is
   * provided.
   */
  metric?: keyof Metrics;
  /**
   * Custom function returning a numeric value derived from the metrics.
   */
  fn?: (metrics: Metrics) => number;

  /**
   * Optional transform that converts the raw metric value into a score. This
   * can be used to normalize values to a 1-100 range before weighting.
   */
  normalize?: (value: number, metrics: Metrics) => number;
}

/**
 * Calculate a weighted score from a metrics object.
 *
 * Each rule contributes `weight * value` to the final score where the value is
 * either read from the given metric field or returned from `fn`.
 */
export function scoreMetrics<Metrics extends Record<string, any>>(
  metrics: Metrics,
  rules: ScoreRule<Metrics>[],
): number {
  let score = 0;
  for (const rule of rules) {
    let value =
      typeof rule.fn === "function"
        ? rule.fn(metrics)
        : (metrics as any)[rule.metric as string];
    if (typeof value === "number" && !Number.isNaN(value)) {
      if (typeof rule.normalize === "function") {
        value = rule.normalize(value, metrics);
      }
      score += value * rule.weight;
    }
  }
  return score;
}

export default scoreMetrics;
