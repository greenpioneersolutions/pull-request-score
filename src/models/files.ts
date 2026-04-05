/** Single file changed in a pull request, from GitHub REST API. */
export interface PrFile {
  sha: string;
  filename: string;
  status:
    | "added"
    | "modified"
    | "removed"
    | "renamed"
    | "copied"
    | "changed"
    | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  /** Unified diff text. Absent for binary files or when skipPatches is set. */
  patch?: string;
  /** Present when status is "renamed". */
  previousFilename?: string;
}

export type FileCategory =
  | "source"
  | "test"
  | "config"
  | "docs"
  | "ci"
  | "migration"
  | "dependency"
  | "generated";

export interface RiskFactor {
  filename: string;
  reason: string;
  weight: number;
}

export interface TestHygiene {
  testFileChanges: number;
  sourceFileChanges: number;
  /** Null when there are no source changes. */
  ratio: number | null;
  testFilesAdded: string[];
  sourceFilesWithoutTests: string[];
}

export interface ScopeSpread {
  directories: string[];
  directoryCount: number;
  topLevelModules: string[];
  topLevelModuleCount: number;
}

export interface DiffComplexity {
  maxNestingDepthIncrease: number;
  newFunctionCount: number;
  regexLineCount: number;
  bucket: "low" | "medium" | "high";
}

export interface SecurityPattern {
  filename: string;
  line: number | null;
  pattern: string;
  snippet: string;
  severity: "info" | "warning" | "critical";
}

export interface AiGeneratedSignal {
  signal: string;
  confidence: "low" | "medium" | "high";
  evidence: string;
}

export interface CodePattern {
  type:
    | "todo"
    | "fixme"
    | "console-log"
    | "commented-code"
    | "debug-statement";
  filename: string;
  line: number | null;
  snippet: string;
  isNew: boolean;
}

export interface FileAnalysis {
  categories: Record<string, FileCategory>;
  riskScore: number;
  riskFactors: RiskFactor[];
  testHygiene: TestHygiene;
  scopeSpread: ScopeSpread;
  reviewDepthSignal: "simple" | "complex" | "critical";
  diffComplexity: DiffComplexity | null;
  securityPatterns: SecurityPattern[];
  aiGeneratedSignals: AiGeneratedSignal[];
  codePatterns: CodePattern[];
}

export interface AiReviewContext {
  pr: {
    number: number;
    title: string;
    author: string | null;
    state: string;
    linesChanged: number;
    filesChanged: number;
    createdAt: string;
    mergedAt: string | null;
  };
  analysis: FileAnalysis;
  files: PrFile[];
  metrics: Record<string, unknown> | null;
}
