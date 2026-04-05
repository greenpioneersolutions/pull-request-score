import type { PrFile, FileCategory, RiskFactor } from "../models/files.js";

interface RiskRule {
  reason: string;
  weight: number;
  test: (filename: string, category: FileCategory) => boolean;
}

const rules: RiskRule[] = [
  { reason: "environment-file", weight: 25, test: (f) => /^\.env/.test(f.split("/").pop() ?? "") },
  { reason: "auth-path", weight: 20, test: (f) => /\/(auth|security)\//i.test(f) || /\/middleware\/auth/i.test(f) },
  { reason: "migration", weight: 15, test: (_f, c) => c === "migration" },
  { reason: "infrastructure", weight: 15, test: (f) => /^(Dockerfile|docker-compose)/i.test(f.split("/").pop() ?? "") || /\/terraform\//i.test(f) || /\/k8s\//i.test(f) },
  { reason: "ci-config", weight: 10, test: (_f, c) => c === "ci" },
  { reason: "dependency-manifest", weight: 10, test: (f) => /^package\.json$/.test(f.split("/").pop() ?? "") },
  { reason: "lockfile", weight: 5, test: (f) => /(lock|\.lock)/.test(f.split("/").pop() ?? "") },
];

export interface RiskScoreResult {
  score: number;
  factors: RiskFactor[];
}

/**
 * Calculate a 0-100 risk score based on which files a PR touches.
 */
export function calculateRiskScore(
  files: PrFile[],
  categories: Record<string, FileCategory>,
): RiskScoreResult {
  const factors: RiskFactor[] = [];
  const matchedReasons = new Set<string>();

  for (const file of files) {
    const cat = categories[file.filename] ?? "source";
    for (const rule of rules) {
      if (rule.test(file.filename, cat)) {
        factors.push({
          filename: file.filename,
          reason: rule.reason,
          weight: rule.weight,
        });
        matchedReasons.add(rule.reason);
        break;
      }
    }
  }

  let rawScore = factors.reduce((sum, f) => sum + f.weight, 0);

  // Multiplier when multiple high-risk categories appear together
  if (matchedReasons.size >= 3) {
    rawScore = Math.round(rawScore * 1.5);
  }

  return { score: Math.min(100, rawScore), factors };
}
