export interface RangeRule {
  /** Exclusive upper bound for this range */
  max: number;
  /** Score returned when the value falls below `max` */
  score: number;
}

/**
 * Build a function that maps numeric values to scores based on ranges.
 *
 * Ranges are checked in order until `value < max` is met. If no range
 * matches, `defaultScore` is returned.
 */
export function createRangeNormalizer(
  ranges: RangeRule[],
  defaultScore: number,
): (value: number) => number {
  const ordered = [...ranges].sort((a, b) => a.max - b.max);
  return (value: number): number => {
    for (const { max, score } of ordered) {
      if (value < max) {
        return score;
      }
    }
    return defaultScore;
  };
}

export default createRangeNormalizer;
