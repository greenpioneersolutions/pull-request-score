export interface MetricDelta {
  current: number | null;
  previous: number | null;
  absoluteDelta: number | null;
  percentageChange: number | null;
}

export interface TrendComparison {
  current: Record<string, unknown>;
  previous: Record<string, unknown>;
  deltas: Record<string, MetricDelta>;
}

/**
 * Walk a metrics object and extract all numeric leaf values with dotted keys.
 */
function flattenNumeric(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "number" && !Number.isNaN(value)) {
      result[path] = value;
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenNumeric(value as Record<string, unknown>, path));
    }
  }
  return result;
}

/**
 * Compute deltas between two sets of numeric metrics.
 */
export function computeDeltas(
  current: Record<string, unknown>,
  previous: Record<string, unknown>,
): Record<string, MetricDelta> {
  const flatCurrent = flattenNumeric(current);
  const flatPrevious = flattenNumeric(previous);

  const allKeys = new Set([
    ...Object.keys(flatCurrent),
    ...Object.keys(flatPrevious),
  ]);

  const deltas: Record<string, MetricDelta> = {};
  for (const key of allKeys) {
    const cur = flatCurrent[key] ?? null;
    const prev = flatPrevious[key] ?? null;

    let absoluteDelta: number | null = null;
    let percentageChange: number | null = null;

    if (cur !== null && prev !== null) {
      absoluteDelta = cur - prev;
      percentageChange = prev !== 0
        ? Math.round(((cur - prev) / Math.abs(prev)) * 10000) / 100
        : null;
    }

    deltas[key] = { current: cur, previous: prev, absoluteDelta, percentageChange };
  }

  return deltas;
}
