import { calculateDiffComplexity } from "../src/calculators/diffComplexity";
import { makeFile } from "./fixtures/prFiles";

describe("calculateDiffComplexity", () => {
  it("returns null when no patches", () => {
    const files = [makeFile({ patch: undefined })];
    expect(calculateDiffComplexity(files)).toBeNull();
  });

  it("counts new functions", () => {
    const patch = [
      "@@ -0,0 +1,6 @@",
      "+function foo() {",
      "+  return 1;",
      "+}",
      "+const bar = async () => {",
      "+  return 2;",
      "+}",
    ].join("\n");
    const result = calculateDiffComplexity([makeFile({ patch })])!;
    expect(result.newFunctionCount).toBe(2);
  });

  it("measures nesting depth", () => {
    const patch = [
      "@@ -0,0 +1,8 @@",
      "+function outer() {",
      "+  if (true) {",
      "+    for (let i = 0; i < 10; i++) {",
      "+      if (i > 5) {",
      "+        doStuff();",
      "+      }",
      "+    }",
      "+  }",
      "+}",
    ].join("\n");
    const result = calculateDiffComplexity([makeFile({ patch })])!;
    expect(result.maxNestingDepthIncrease).toBeGreaterThanOrEqual(4);
  });

  it("counts regex lines", () => {
    const patch = [
      "@@ -0,0 +1,3 @@",
      "+const re = /^[a-z]+$/gi;",
      "+const re2 = new RegExp('test');",
      "+const plain = 'hello';",
    ].join("\n");
    const result = calculateDiffComplexity([makeFile({ patch })])!;
    expect(result.regexLineCount).toBe(2);
  });

  it("buckets as low for simple changes", () => {
    const patch = "@@ -1 +1 @@\n+const x = 1;";
    const result = calculateDiffComplexity([makeFile({ patch })])!;
    expect(result.bucket).toBe("low");
  });

  it("buckets as high for many functions", () => {
    const lines = Array.from({ length: 20 }, (_, i) =>
      `+function fn${i}() { return ${i}; }`,
    );
    const patch = "@@ -0,0 +1,20 @@\n" + lines.join("\n");
    const result = calculateDiffComplexity([makeFile({ patch })])!;
    expect(result.bucket).toBe("high");
  });
});
