import { detectAiGeneratedSignals } from "../src/calculators/aiGeneratedSignals";
import { makeFile } from "./fixtures/prFiles";

describe("detectAiGeneratedSignals", () => {
  it("detects uniform documentation on all functions", () => {
    const patch = [
      "@@ -0,0 +1,15 @@",
      "+/**",
      "+ * Adds two numbers.",
      "+ * @param a first number",
      "+ * @param b second number",
      "+ * @returns the sum",
      "+ */",
      "+function add(a, b) { return a + b; }",
      "+/**",
      "+ * Subtracts two numbers.",
      "+ * @param a first number",
      "+ * @param b second number",
      "+ * @returns the difference",
      "+ */",
      "+function sub(a, b) { return a - b; }",
      "+/**",
      "+ * Multiplies two numbers.",
      "+ * @param a first number",
      "+ * @param b second number",
      "+ * @returns the product",
      "+ */",
      "+function mul(a, b) { return a * b; }",
    ].join("\n");
    const result = detectAiGeneratedSignals([makeFile({ patch })]);
    expect(result.some((s) => s.signal === "uniform-documentation")).toBe(true);
  });

  it("detects repetitive comment structures", () => {
    const lines: string[] = ["@@ -0,0 +1,20 @@"];
    for (let i = 0; i < 6; i++) {
      lines.push("+/**", `+ * @param x${i}`, "+ */", `+function f${i}() {}`);
    }
    const patch = lines.join("\n");
    const result = detectAiGeneratedSignals([makeFile({ patch })]);
    expect(
      result.some((s) => s.signal === "repetitive-comment-structure"),
    ).toBe(true);
  });

  it("returns empty for undocumented code", () => {
    const patch = [
      "@@ -0,0 +1,3 @@",
      "+function foo() { return 1; }",
      "+function bar() { return 2; }",
    ].join("\n");
    const result = detectAiGeneratedSignals([makeFile({ patch })]);
    expect(result).toHaveLength(0);
  });

  it("returns empty when no patches", () => {
    const result = detectAiGeneratedSignals([makeFile({ patch: undefined })]);
    expect(result).toHaveLength(0);
  });
});
