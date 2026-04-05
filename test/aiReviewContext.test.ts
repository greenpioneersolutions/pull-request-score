import { buildAiReviewContext } from "../src/analyzers/aiReviewContext";
import { analyzePrFiles } from "../src/analyzers/fileAnalyzer";
import { makeTypicalPrFiles } from "./fixtures/prFiles";
import type { PullRequest } from "../src/models/index";

const pr: PullRequest = {
  id: "1",
  number: 42,
  title: "feat: add new endpoint",
  state: "MERGED",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
  mergedAt: "2024-01-02T00:00:00Z",
  closedAt: null,
  additions: 50,
  deletions: 10,
  changedFiles: 5,
  labels: [],
  author: { login: "alice" },
  reviews: [],
  comments: [],
  commits: [],
  checkSuites: [],
  timelineItems: [],
};

describe("buildAiReviewContext", () => {
  it("builds a complete context object", () => {
    const files = makeTypicalPrFiles();
    const analysis = analyzePrFiles(files);
    const ctx = buildAiReviewContext(pr, files, analysis);

    expect(ctx.pr.number).toBe(42);
    expect(ctx.pr.title).toBe("feat: add new endpoint");
    expect(ctx.pr.author).toBe("alice");
    expect(ctx.pr.linesChanged).toBe(60);
    expect(ctx.pr.filesChanged).toBe(5);
    expect(ctx.analysis).toBe(analysis);
    expect(ctx.files).toBe(files);
    expect(ctx.metrics).toBeNull();
  });

  it("includes metrics when provided", () => {
    const files = makeTypicalPrFiles();
    const analysis = analyzePrFiles(files);
    const metrics = { cycleTimeHours: 4.5, ciPassRate: 1.0 };
    const ctx = buildAiReviewContext(pr, files, analysis, metrics);

    expect(ctx.metrics).toEqual(metrics);
  });

  it("handles null author", () => {
    const noAuthorPr = { ...pr, author: null };
    const files = makeTypicalPrFiles();
    const analysis = analyzePrFiles(files);
    const ctx = buildAiReviewContext(noAuthorPr, files, analysis);

    expect(ctx.pr.author).toBeNull();
  });
});
