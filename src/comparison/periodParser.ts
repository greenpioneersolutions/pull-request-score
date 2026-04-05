import ms from "ms";

export interface PeriodRange {
  since: string;
  until: string;
}

export interface ParsedPeriods {
  current: PeriodRange;
  previous: PeriodRange;
}

/**
 * Compute two non-overlapping time periods for comparison.
 *
 * @param sinceDuration - the look-back duration string (e.g. "30d")
 * @param compareDuration - optional different duration for the previous period
 * @param now - reference timestamp (defaults to Date.now())
 */
export function parsePeriods(
  sinceDuration: string,
  compareDuration?: string,
  now = Date.now(),
): ParsedPeriods {
  const currentMs = ms(sinceDuration);
  if (currentMs === undefined) {
    throw new Error(`Invalid duration: ${sinceDuration}`);
  }
  const previousMs = compareDuration ? ms(compareDuration) : currentMs;
  if (previousMs === undefined) {
    throw new Error(`Invalid compare duration: ${compareDuration}`);
  }

  const currentEnd = now;
  const currentStart = now - currentMs;
  const previousEnd = currentStart;
  const previousStart = previousEnd - previousMs;

  return {
    current: {
      since: new Date(currentStart).toISOString(),
      until: new Date(currentEnd).toISOString(),
    },
    previous: {
      since: new Date(previousStart).toISOString(),
      until: new Date(previousEnd).toISOString(),
    },
  };
}
