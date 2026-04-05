#!/usr/bin/env node
import { Command } from "commander";
import ms from "ms";
import fs from "fs";
import {
  collectPullRequests,
  PartialResultsError,
  RawPullRequest,
  CollectPullRequestsParams,
} from "./collectors/pullRequests.js";
import { fetchOrgRepos } from "./collectors/orgRepos.js";
import { sqliteStore } from "./cache/sqliteStore.js";
import { calculateCycleTime } from "./calculators/cycleTime.js";
import { calculateReviewMetrics } from "./calculators/reviewMetrics.js";
import { calculateMetrics } from "./calculators/metrics.js";
import {
  calculateAuthorMetrics,
  calculateTeamMetrics,
  loadTeamMapping,
} from "./calculators/groupMetrics.js";
import { scorePr } from "./scoring/prScoring.js";
import { collectFilesForPrs } from "./collectors/prFiles.js";
import { analyzePrFiles } from "./analyzers/fileAnalyzer.js";
import { buildAiReviewContext } from "./analyzers/aiReviewContext.js";
import type { FileAnalysis } from "./models/files.js";
import { parsePeriods } from "./comparison/periodParser.js";
import { computeDeltas } from "./comparison/trendComparison.js";
import { writeOutput } from "./output/writers.js";
import { stats } from "./stats.js";
import logger from "./logger.js";

interface CliOptions {
  since: string;
  format: string;
  token?: string;
  baseUrl?: string;
  dryRun?: boolean;
  progress?: boolean;
  output?: string;
  includeLabels?: string;
  excludeLabels?: string;
  useCache?: boolean;
  resume?: boolean;
  appId?: string;
  appPrivateKey?: string;
  logLevel?: string;
  top?: string;
  bottom?: string;
  groupBy?: string;
  teamConfig?: string;
  compare?: string;
  org?: string;
  includeFiles?: boolean;
  codeAnalysis?: boolean;
  aiContext?: boolean;
  skipPatches?: boolean;
}

const GITHUB_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

interface BaseCollectOpts {
  since: string;
  auth: string;
  baseUrl?: string;
  onProgress?: (count: number) => void;
  includeLabels?: string[];
  excludeLabels?: string[];
  cache?: any;
  resume?: boolean;
}

function computeRepoResult(
  prs: RawPullRequest[],
  opts: CliOptions,
  fileAnalyses?: Map<number, FileAnalysis>,
): Record<string, unknown> {
  const cycleTimes: number[] = [];
  const pickupTimes: number[] = [];
  for (const pr of prs) {
    try {
      cycleTimes.push(calculateCycleTime(pr));
    } catch (err: any) {
      logger.debug(
        { pr: pr.number, err: err?.message },
        "Skipping cycle time calculation",
      );
    }
    try {
      pickupTimes.push(calculateReviewMetrics(pr));
    } catch (err: any) {
      logger.debug(
        { pr: pr.number, err: err?.message },
        "Skipping pickup time calculation",
      );
    }
  }

  const aggregateMetrics = calculateMetrics(prs);
  const prScores = prs.map((pr) => {
    const fa = fileAnalyses?.get(pr.number);
    const scoreResult = scorePr(pr, undefined, fa);
    const entry: Record<string, unknown> = { ...scoreResult };
    if (fa && (opts.codeAnalysis || opts.aiContext)) {
      entry["fileAnalysis"] = fa;
    }
    if (fa && opts.aiContext && pr.files) {
      entry["aiContext"] = buildAiReviewContext(pr, pr.files, fa);
    }
    return entry;
  });
  prScores.sort((a, b) => (b["score"] as number) - (a["score"] as number));

  let topScores;
  let bottomScores;
  if (opts.top) {
    topScores = prScores.slice(0, parseInt(opts.top, 10));
  }
  if (opts.bottom) {
    bottomScores = prScores.slice(-parseInt(opts.bottom, 10));
  }

  let scoresOutput: unknown = topScores ?? bottomScores ?? prScores;
  if (topScores && bottomScores) {
    scoresOutput = { top: topScores, bottom: bottomScores };
  }

  const result: Record<string, unknown> = {
    cycleTime: stats(cycleTimes),
    pickupTime: stats(pickupTimes),
    aggregateMetrics,
    prScores: scoresOutput,
  };

  if (opts.groupBy === "author") {
    result["authorMetrics"] = calculateAuthorMetrics(prs);
  } else if (opts.groupBy === "team") {
    if (opts.teamConfig) {
      const mapping = loadTeamMapping(opts.teamConfig);
      result["teamMetrics"] = calculateTeamMetrics(prs, mapping);
    }
  }

  return result;
}

async function collectForRepo(
  owner: string,
  repo: string,
  baseOpts: BaseCollectOpts,
): Promise<RawPullRequest[]> {
  const collectOpts: CollectPullRequestsParams = {
    owner,
    repo,
    ...baseOpts,
  };

  try {
    return await collectPullRequests(collectOpts);
  } catch (err: any) {
    if (err instanceof PartialResultsError) {
      logger.error(
        `Encountered error after ${err.partial.length} PRs for ${owner}/${repo}: ${err.message}`,
      );
      return err.partial;
    }
    logger.error(`Failed to fetch ${owner}/${repo}: ${err.message}`);
    return [];
  }
}

export async function runCli(argv = process.argv): Promise<void> {
  const program = new Command();
  program
    .name("gh-pr-metrics")
    .description("Calculate GitHub pull request metrics")
    .argument("[repo]", "owner/repo (comma-separated for multiple)")
    .option("--org <orgname>", "fetch all repos from a GitHub organization")
    .option("--since <duration>", "look back period", "90d")
    .option("--format <format>", "json or csv", "json")
    .option("--token <token>", "GitHub token")
    .option("--base-url <url>", "GitHub API base URL")
    .option("--dry-run", "print options and exit")
    .option("--progress", "show progress during fetch")
    .option("--use-cache", "use local SQLite cache")
    .option("--resume", "resume previous run if possible")
    .option("--app-id <id>", "GitHub App ID")
    .option(
      "--app-private-key <path>",
      "path to GitHub App private key file",
    )
    .option(
      "--include-labels <labels>",
      "only include PRs with these labels (comma separated)",
    )
    .option(
      "--exclude-labels <labels>",
      "exclude PRs with these labels (comma separated)",
    )
    .option(
      "--output <path|stdout|stderr>",
      "write metrics to file or stdout/stderr",
      "stdout",
    )
    .option(
      "--log-level <level>",
      "logger level",
      process.env["LOG_LEVEL"] ?? "info",
    )
    .option("--top <n>", "show top N PRs by score")
    .option("--bottom <n>", "show bottom N PRs by score")
    .option(
      "--group-by <type>",
      "group metrics by author or team",
    )
    .option(
      "--team-config <path>",
      "path to JSON file mapping authors to teams",
    )
    .option(
      "--compare [duration]",
      "compare with previous period (defaults to same as --since)",
    )
    .option("--include-files", "fetch per-file data via REST API")
    .option("--code-analysis", "run deterministic code analysis (implies --include-files)")
    .option("--ai-context", "include AI review context in output (implies --code-analysis)")
    .option("--skip-patches", "omit diff text from file data")
    .allowExcessArguments(false);

  program.parse(argv);
  const opts = program.opts<CliOptions>();
  if (opts.logLevel) {
    process.env["LOG_LEVEL"] = opts.logLevel;
    logger.level = opts.logLevel;
  }
  if (opts.appId) process.env["GH_APP_ID"] = opts.appId;
  if (opts.appPrivateKey)
    process.env["GH_APP_PK"] = fs.readFileSync(opts.appPrivateKey, "utf8");

  const token = opts.token ?? process.env["GH_TOKEN"];
  if (!token) {
    logger.error("GitHub token required via --token or GH_TOKEN env");
    program.help({ error: true });
  }

  // Determine list of repos
  let repoList: string[] = [];
  const repoArg = program.args[0] || "";
  if (opts.org) {
    if (opts.dryRun) {
      logger.info(`Would fetch repos for org ${opts.org} since ${opts.since}`);
      return;
    }
    repoList = await fetchOrgRepos({
      org: opts.org,
      auth: token as string,
      baseUrl: opts.baseUrl,
    });
    if (repoList.length === 0) {
      logger.error(`No repositories found for org: ${opts.org}`);
      process.exitCode = 1;
      return;
    }
  } else if (repoArg) {
    repoList = repoArg.split(",").map((r) => r.trim()).filter(Boolean);
  } else {
    logger.error("Provide a repo argument or --org flag");
    program.help({ error: true });
  }

  // Validate repo names
  for (const repoEntry of repoList) {
    const [owner, repo] = repoEntry.split("/");
    if (!owner || !repo) {
      logger.error(`Repository must be in <owner>/<repo> format: ${repoEntry}`);
      process.exitCode = 1;
      return;
    }
    if (!GITHUB_NAME_RE.test(owner) || !GITHUB_NAME_RE.test(repo)) {
      logger.error(
        `Invalid owner or repo name: ${repoEntry}. Only alphanumeric characters, hyphens, underscores, and dots are allowed.`,
      );
      process.exitCode = 1;
      return;
    }
  }

  const sinceMs = ms(opts.since);
  if (sinceMs === undefined) {
    logger.error(`Invalid duration for --since: ${opts.since}`);
    process.exitCode = 1;
    return;
  }
  const since = new Date(Date.now() - sinceMs).toISOString();

  const includeLabels = opts.includeLabels
    ? opts.includeLabels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
    : undefined;
  const excludeLabels = opts.excludeLabels
    ? opts.excludeLabels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
    : undefined;

  if (opts.dryRun) {
    logger.info(
      `Would fetch metrics for ${repoList.join(", ")} since ${opts.since}`,
    );
    return;
  }

  if (opts.groupBy === "team" && !opts.teamConfig) {
    logger.error("--team-config is required when using --group-by team");
    process.exitCode = 1;
    return;
  }

  const onProgress = opts.progress
    ? (count: number) => {
        process.stderr.write(`Fetched ${count} PRs\r`);
      }
    : undefined;

  const cache = opts.useCache ? sqliteStore() : undefined;

  const baseOpts: BaseCollectOpts = {
    since,
    auth: token as string,
    baseUrl: opts.baseUrl,
    onProgress,
    includeLabels,
    excludeLabels,
    cache,
    resume: opts.resume,
  };

  // Resolve implied flags
  const shouldFetchFiles = opts.includeFiles || opts.codeAnalysis || opts.aiContext;
  const shouldAnalyze = opts.codeAnalysis || opts.aiContext;

  // Collect PRs from all repos
  const isMultiRepo = repoList.length > 1;
  const allPrs: RawPullRequest[] = [];
  const perRepo: Record<string, Record<string, unknown>> = {};
  const allFileAnalyses = new Map<number, FileAnalysis>();

  for (const repoEntry of repoList) {
    const [owner, repo] = repoEntry.split("/") as [string, string];
    const prs = await collectForRepo(owner, repo, baseOpts);
    if (onProgress) process.stderr.write("\n");

    // Fetch files if requested
    if (shouldFetchFiles) {
      const filesMap = await collectFilesForPrs(prs, {
        owner,
        repo,
        auth: token as string,
        baseUrl: opts.baseUrl,
        cache,
        skipPatches: opts.skipPatches,
      });
      for (const pr of prs) {
        const files = filesMap.get(pr.number);
        if (files) {
          pr.files = files;
          if (shouldAnalyze) {
            allFileAnalyses.set(pr.number, analyzePrFiles(files));
          }
        }
      }
    }

    allPrs.push(...prs);

    if (isMultiRepo) {
      const repoAnalyses = shouldAnalyze
        ? new Map(prs.filter((p) => allFileAnalyses.has(p.number)).map((p) => [p.number, allFileAnalyses.get(p.number)!]))
        : undefined;
      perRepo[repoEntry] = computeRepoResult(prs, opts, repoAnalyses);
    }
  }

  const result = computeRepoResult(
    allPrs,
    opts,
    shouldAnalyze ? allFileAnalyses : undefined,
  );

  if (isMultiRepo) {
    result["perRepo"] = perRepo;
  }

  // Comparison
  if (opts.compare !== undefined) {
    const compareDuration =
      typeof opts.compare === "string" && opts.compare !== "true"
        ? opts.compare
        : undefined;
    const periods = parsePeriods(opts.since, compareDuration);
    const previousPrs: RawPullRequest[] = [];
    for (const repoEntry of repoList) {
      const [owner, repo] = repoEntry.split("/") as [string, string];
      const prs = await collectForRepo(owner, repo, {
        ...baseOpts,
        since: periods.previous.since,
        until: periods.previous.until,
      } as BaseCollectOpts & { until: string });
      previousPrs.push(...prs);
    }

    const prevCycleTimes: number[] = [];
    const prevPickupTimes: number[] = [];
    for (const pr of previousPrs) {
      try {
        prevCycleTimes.push(calculateCycleTime(pr));
      } catch {
        /* skip */
      }
      try {
        prevPickupTimes.push(calculateReviewMetrics(pr));
      } catch {
        /* skip */
      }
    }

    const previousMetrics = calculateMetrics(previousPrs);
    const previousResult: Record<string, unknown> = {
      cycleTime: stats(prevCycleTimes),
      pickupTime: stats(prevPickupTimes),
      aggregateMetrics: previousMetrics,
    };

    result["comparison"] = {
      current: { ...result },
      previous: previousResult,
      deltas: computeDeltas(
        result as Record<string, unknown>,
        previousResult,
      ),
    };
  }

  writeOutput(result, {
    format: opts.format as "json" | "csv",
    destination: opts.output,
  });
}

export default runCli;
