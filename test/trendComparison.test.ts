import { computeDeltas } from "../src/comparison/trendComparison";

describe("computeDeltas", () => {
  it("computes absolute and percentage deltas", () => {
    const current = { mergeRate: 0.8, cycleTime: { median: 5 } };
    const previous = { mergeRate: 0.6, cycleTime: { median: 10 } };
    const deltas = computeDeltas(current, previous);

    expect(deltas["mergeRate"]!.current).toBe(0.8);
    expect(deltas["mergeRate"]!.previous).toBe(0.6);
    expect(deltas["mergeRate"]!.absoluteDelta).toBeCloseTo(0.2);
    expect(deltas["mergeRate"]!.percentageChange).toBeCloseTo(33.33);

    expect(deltas["cycleTime.median"]!.absoluteDelta).toBe(-5);
    expect(deltas["cycleTime.median"]!.percentageChange).toBe(-50);
  });

  it("handles keys only in one period", () => {
    const current = { newMetric: 42 };
    const previous = { oldMetric: 10 };
    const deltas = computeDeltas(current, previous);

    expect(deltas["newMetric"]!.current).toBe(42);
    expect(deltas["newMetric"]!.previous).toBeNull();
    expect(deltas["newMetric"]!.absoluteDelta).toBeNull();

    expect(deltas["oldMetric"]!.current).toBeNull();
    expect(deltas["oldMetric"]!.previous).toBe(10);
  });

  it("handles zero previous value", () => {
    const current = { rate: 0.5 };
    const previous = { rate: 0 };
    const deltas = computeDeltas(current, previous);
    expect(deltas["rate"]!.absoluteDelta).toBe(0.5);
    expect(deltas["rate"]!.percentageChange).toBeNull();
  });

  it("handles empty objects", () => {
    const deltas = computeDeltas({}, {});
    expect(Object.keys(deltas)).toHaveLength(0);
  });
});
