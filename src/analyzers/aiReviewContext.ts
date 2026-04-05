import type { PullRequest } from "../models/index.js";
import type { PrFile, FileAnalysis, AiReviewContext } from "../models/files.js";

/**
 * Build a structured context object containing everything an AI model
 * would need to review a pull request. This is pure data structuring —
 * no AI calls are made.
 */
export function buildAiReviewContext(
  pr: PullRequest,
  files: PrFile[],
  analysis: FileAnalysis,
  metrics?: Record<string, unknown> | null,
): AiReviewContext {
  return {
    pr: {
      number: pr.number,
      title: pr.title,
      author: pr.author?.login ?? null,
      state: pr.state,
      linesChanged: pr.additions + pr.deletions,
      filesChanged: pr.changedFiles,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
    },
    analysis,
    files,
    metrics: metrics ?? null,
  };
}
