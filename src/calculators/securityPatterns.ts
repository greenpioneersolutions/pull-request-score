import type { PrFile, SecurityPattern } from "../models/files.js";

interface PatternRule {
  pattern: string;
  severity: SecurityPattern["severity"];
  regex: RegExp;
}

const rules: PatternRule[] = [
  { pattern: "hardcoded-secret", severity: "critical", regex: /(?:password|secret|api_key|apikey|token|private_key)\s*[:=]\s*["'][^"']{8,}/i },
  { pattern: "eval-usage", severity: "critical", regex: /\beval\s*\(/ },
  { pattern: "function-constructor", severity: "critical", regex: /\bnew\s+Function\s*\(/ },
  { pattern: "dangerous-html", severity: "warning", regex: /dangerouslySetInnerHTML/ },
  { pattern: "sql-concatenation", severity: "warning", regex: /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s.*\$\{|\+\s*['"]?\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i },
  { pattern: "exec-usage", severity: "warning", regex: /\bexec\s*\(|child_process/ },
  { pattern: "disabled-eslint", severity: "info", regex: /eslint-disable(?!-next-line)/ },
  { pattern: "disabled-lint", severity: "info", regex: /\bnoqa\b|@SuppressWarnings/ },
  { pattern: "base64-long-string", severity: "warning", regex: /["'][A-Za-z0-9+/=]{40,}["']/ },
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
 * Scan diff patches for security-related patterns.
 * Only examines added lines.
 */
export function detectSecurityPatterns(
  files: PrFile[],
): SecurityPattern[] {
  const findings: SecurityPattern[] = [];

  for (const file of files) {
    if (!file.patch) continue;
    const lines = getAddedLinesWithNumbers(file.patch);
    for (const { line, text } of lines) {
      for (const rule of rules) {
        if (rule.regex.test(text)) {
          findings.push({
            filename: file.filename,
            line,
            pattern: rule.pattern,
            snippet: text.trim().slice(0, 120),
            severity: rule.severity,
          });
          break;
        }
      }
    }
  }

  return findings;
}
