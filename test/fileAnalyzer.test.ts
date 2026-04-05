import { analyzePrFiles } from "../src/analyzers/fileAnalyzer";
import { makeTypicalPrFiles, makeHighRiskPrFiles } from "./fixtures/prFiles";

describe("analyzePrFiles", () => {
  it("returns a complete FileAnalysis for typical files", () => {
    const files = makeTypicalPrFiles();
    const analysis = analyzePrFiles(files);

    expect(analysis.categories).toBeDefined();
    expect(Object.keys(analysis.categories).length).toBe(files.length);
    expect(typeof analysis.riskScore).toBe("number");
    expect(Array.isArray(analysis.riskFactors)).toBe(true);
    expect(analysis.testHygiene).toBeDefined();
    expect(analysis.scopeSpread).toBeDefined();
    expect(["simple", "complex", "critical"]).toContain(
      analysis.reviewDepthSignal,
    );
    expect(analysis.diffComplexity).not.toBeNull();
    expect(Array.isArray(analysis.securityPatterns)).toBe(true);
    expect(Array.isArray(analysis.aiGeneratedSignals)).toBe(true);
    expect(Array.isArray(analysis.codePatterns)).toBe(true);
  });

  it("flags high-risk PRs correctly", () => {
    const files = makeHighRiskPrFiles();
    const analysis = analyzePrFiles(files);

    expect(analysis.riskScore).toBeGreaterThanOrEqual(40);
    expect(analysis.reviewDepthSignal).toBe("critical");
    expect(analysis.riskFactors.length).toBeGreaterThan(0);
  });

  it("identifies test hygiene in typical PRs", () => {
    const files = makeTypicalPrFiles();
    const analysis = analyzePrFiles(files);

    expect(analysis.testHygiene.testFileChanges).toBeGreaterThan(0);
    expect(analysis.testHygiene.sourceFileChanges).toBeGreaterThan(0);
    expect(analysis.testHygiene.ratio).toBeGreaterThan(0);
  });
});
