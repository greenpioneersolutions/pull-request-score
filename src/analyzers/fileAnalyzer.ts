import type { PrFile, FileAnalysis } from "../models/files.js";
import { classifyFiles } from "../calculators/fileCategories.js";
import { calculateRiskScore } from "../calculators/riskScore.js";
import { calculateTestHygiene } from "../calculators/testHygiene.js";
import { calculateScopeSpread } from "../calculators/scopeSpread.js";
import { calculateReviewDepthSignal } from "../calculators/reviewDepthSignal.js";
import { calculateDiffComplexity } from "../calculators/diffComplexity.js";
import { detectSecurityPatterns } from "../calculators/securityPatterns.js";
import { detectAiGeneratedSignals } from "../calculators/aiGeneratedSignals.js";
import { detectCodePatterns } from "../calculators/codePatterns.js";

/**
 * Run all deterministic file-level analysis on a set of PR files.
 * Returns a complete FileAnalysis object.
 */
export function analyzePrFiles(files: PrFile[]): FileAnalysis {
  const categories = classifyFiles(files);
  const { score: riskScore, factors: riskFactors } = calculateRiskScore(
    files,
    categories,
  );
  const testHygiene = calculateTestHygiene(files, categories);
  const scopeSpread = calculateScopeSpread(files);
  const reviewDepthSignal = calculateReviewDepthSignal(
    riskScore,
    scopeSpread,
    categories,
  );
  const diffComplexity = calculateDiffComplexity(files);
  const securityPatterns = detectSecurityPatterns(files);
  const aiGeneratedSignals = detectAiGeneratedSignals(files);
  const codePatterns = detectCodePatterns(files);

  return {
    categories,
    riskScore,
    riskFactors,
    testHygiene,
    scopeSpread,
    reviewDepthSignal,
    diffComplexity,
    securityPatterns,
    aiGeneratedSignals,
    codePatterns,
  };
}
