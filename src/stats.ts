export interface StatsResult {
  median: number | null;
  p95: number | null;
}

export function stats(values: number[]): StatsResult {
  if (values.length === 0) return { median: null, p95: null };
  const sorted = [...values].sort((a, b) => a - b);
  let median: number;
  if (sorted.length % 2 === 0) {
    const i = sorted.length / 2;
    median = (sorted[i - 1]! + sorted[i]!) / 2;
  } else {
    median = sorted[Math.floor(sorted.length / 2)]!;
  }
  const p95Index = Math.ceil(sorted.length * 0.95) - 1;
  const safeIndex = Math.min(sorted.length - 1, Math.max(0, p95Index));
  const p95 = sorted[safeIndex]!;
  return { median, p95 };
}
