import type { PrFile, AiGeneratedSignal } from "../models/files.js";

const JSDOC_RE = /^\s*\/\*\*|^\s*\*\s*@param|^\s*\*\s*@returns/;
const DOCSTRING_RE = /^\s*"""|^\s*'''|^\s*#\s+Args:|^\s*#\s+Returns:/;
const FUNCTION_RE =
  /\b(function\s+\w|const\s+\w+\s*=\s*(?:async\s*)?\(|=>\s*\{|def\s+\w|func\s+\w)/;

function getAddedLines(patch: string): string[] {
  return patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
}

/**
 * Detect heuristic signals that code may be AI-generated.
 * These are pattern-based guesses, not definitive answers.
 */
export function detectAiGeneratedSignals(
  files: PrFile[],
): AiGeneratedSignal[] {
  const signals: AiGeneratedSignal[] = [];

  let totalFunctions = 0;
  let documentedFunctions = 0;
  let docBlockCount = 0;
  const commentStructures: string[] = [];

  for (const file of files) {
    if (!file.patch) continue;
    const lines = getAddedLines(file.patch);
    let inDocBlock = false;

    for (const line of lines) {
      if (JSDOC_RE.test(line) || DOCSTRING_RE.test(line)) {
        if (!inDocBlock) {
          docBlockCount++;
          inDocBlock = true;
          const structure = line.trim().replace(/\w+/g, "W");
          commentStructures.push(structure);
        }
      } else {
        inDocBlock = false;
      }

      if (FUNCTION_RE.test(line)) {
        totalFunctions++;
      }
    }
  }

  // Count functions that are preceded by doc comments
  for (const file of files) {
    if (!file.patch) continue;
    const lines = getAddedLines(file.patch);
    let prevWasDoc = false;
    for (const line of lines) {
      if (JSDOC_RE.test(line) || DOCSTRING_RE.test(line) || /^\s*\*/.test(line)) {
        prevWasDoc = true;
      } else {
        if (prevWasDoc && FUNCTION_RE.test(line)) {
          documentedFunctions++;
        }
        prevWasDoc = false;
      }
    }
  }

  // Signal: every function has a doc comment
  if (totalFunctions >= 3 && documentedFunctions === totalFunctions) {
    signals.push({
      signal: "uniform-documentation",
      confidence: "medium",
      evidence: `All ${totalFunctions} new functions have documentation comments`,
    });
  }

  // Signal: identical comment structures across files
  if (commentStructures.length >= 4) {
    const unique = new Set(commentStructures);
    if (unique.size <= 2) {
      signals.push({
        signal: "repetitive-comment-structure",
        confidence: "medium",
        evidence: `${commentStructures.length} doc blocks share only ${unique.size} structural pattern(s)`,
      });
    }
  }

  // Signal: high documentation density relative to code
  if (totalFunctions > 0 && docBlockCount > totalFunctions * 1.5) {
    signals.push({
      signal: "thorough-documentation",
      confidence: "low",
      evidence: `${docBlockCount} doc blocks for ${totalFunctions} functions`,
    });
  }

  return signals;
}
