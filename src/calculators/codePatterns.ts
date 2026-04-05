import type { PrFile, CodePattern } from "../models/files.js";

interface PatternRule {
  type: CodePattern["type"];
  regex: RegExp;
}

const rules: PatternRule[] = [
  { type: "todo", regex: /\b(TODO|HACK|XXX)\b/i },
  { type: "fixme", regex: /\bFIXME\b/i },
  { type: "console-log", regex: /\bconsole\.(log|debug|warn|error|info)\s*\(/ },
  { type: "console-log", regex: /\bprint\s*\(|System\.out\.print/ },
  { type: "debug-statement", regex: /\bdebugger\b|binding\.pry|import\s+pdb|pdb\.set_trace/ },
  { type: "commented-code", regex: /^\s*\/\/\s*(if|for|while|return|const|let|var|function|import|export)\b/ },
];

function getAddedLinesWithNumbers(
  patch: string,
): { line: number; text: string }[] {
  const result: { line: number; text: string }[] = [];
  let lineNum = 0;
  for (const rawLine of patch.split("\n")) {
    if (rawLine.startsWith("@@")) {
      const match = rawLine.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
      lineNum = match ? parseInt(match[1]!, 10) - 1 : 0;
      continue;
    }
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      lineNum++;
      result.push({ line: lineNum, text: rawLine.slice(1) });
    } else if (!rawLine.startsWith("-")) {
      lineNum++;
    }
  }
  return result;
}

/**
 * Detect code quality patterns in added lines of diff patches.
 * Finds TODOs, console.logs, debug statements, and commented-out code.
 */
export function detectCodePatterns(files: PrFile[]): CodePattern[] {
  const findings: CodePattern[] = [];

  for (const file of files) {
    if (!file.patch) continue;
    const lines = getAddedLinesWithNumbers(file.patch);
    for (const { line, text } of lines) {
      for (const rule of rules) {
        if (rule.regex.test(text)) {
          findings.push({
            type: rule.type,
            filename: file.filename,
            line,
            snippet: text.trim().slice(0, 120),
            isNew: true,
          });
          break;
        }
      }
    }
  }

  return findings;
}
