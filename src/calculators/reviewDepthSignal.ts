import type { FileCategory, ScopeSpread } from "../models/files.js";

/**
 * Determine review depth needed: simple, complex, or critical.
 *
 * - "simple": docs/config only, low risk, narrow scope
 * - "critical": high risk score OR touches auth/migration/infra
 * - "complex": everything else
 */
export function calculateReviewDepthSignal(
  riskScore: number,
  scopeSpread: ScopeSpread,
  categories: Record<string, FileCategory>,
): "simple" | "complex" | "critical" {
  const cats = new Set(Object.values(categories));

  // Critical: high risk or touches sensitive categories
  if (riskScore >= 60) return "critical";
  if (cats.has("migration")) return "critical";
  if (
    Object.keys(categories).some(
      (f) => /\/(auth|security)\//i.test(f) || /\/middleware\/auth/i.test(f),
    )
  ) {
    return "critical";
  }

  // Simple: only docs/config, narrow scope
  const nonTrivial = [...cats].filter(
    (c) => c !== "docs" && c !== "config" && c !== "generated",
  );
  if (nonTrivial.length === 0 && scopeSpread.directoryCount <= 2) {
    return "simple";
  }

  return "complex";
}
