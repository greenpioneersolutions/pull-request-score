import type { PrFile, DiffComplexity } from "../models/files.js";

const FUNCTION_RE =
  /\b(function\s+\w|const\s+\w+\s*=\s*(?:async\s*)?\(|=>\s*\{|def\s+\w|func\s+\w|fn\s+\w|\w+\s*\([^)]*\)\s*\{)/;
const REGEX_RE = /\/[^/\n]+\/[gimsuy]*|new\s+RegExp\(/;

function getAddedLines(patch: string): string[] {
  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
}

/**
 * Analyze diff patches for code complexity signals.
 * Returns null when no patches are available.
 */
export function calculateDiffComplexity(
  files: PrFile[],
): DiffComplexity | null {
  const patches = files.filter((f) => f.patch);
  if (patches.length === 0) return null;

  let maxNesting = 0;
  let functionCount = 0;
  let regexCount = 0;

  for (const file of patches) {
    const lines = getAddedLines(file.patch!);
    let depth = 0;
    let maxFileDepth = 0;

    for (const line of lines) {
      const opens = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;
      depth += opens - closes;
      if (depth > maxFileDepth) maxFileDepth = depth;

      if (FUNCTION_RE.test(line)) functionCount++;
      if (REGEX_RE.test(line)) regexCount++;
    }

    if (maxFileDepth > maxNesting) maxNesting = maxFileDepth;
  }

  let bucket: DiffComplexity["bucket"] = "low";
  if (functionCount > 15 || maxNesting > 6) {
    bucket = "high";
  } else if (functionCount > 5 || maxNesting > 3) {
    bucket = "medium";
  }

  return {
    maxNestingDepthIncrease: maxNesting,
    newFunctionCount: functionCount,
    regexLineCount: regexCount,
    bucket,
  };
}
