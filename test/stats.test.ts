import { stats } from "../src/stats";

describe("stats", () => {
  it("returns nulls for empty array", () => {
    expect(stats([])).toEqual({ median: null, p95: null });
  });

  it("returns the element for single-value array", () => {
    expect(stats([42])).toEqual({ median: 42, p95: 42 });
  });

  it("computes median for odd-length array", () => {
    expect(stats([3, 1, 2])).toEqual({ median: 2, p95: 3 });
  });

  it("computes median for even-length array", () => {
    expect(stats([1, 2, 3, 4])).toEqual({ median: 2.5, p95: 4 });
  });

  it("handles unsorted input", () => {
    expect(stats([5, 1, 3, 2, 4])).toEqual({ median: 3, p95: 5 });
  });

  it("computes p95 on a 20-element array", () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);
    const result = stats(values);
    expect(result.median).toBe(10.5);
    // p95 index = ceil(20 * 0.95) - 1 = 19 - 1 = 18 => value 19
    expect(result.p95).toBe(19);
  });
});
