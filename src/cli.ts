#!/usr/bin/env node
import { Command } from 'commander';
import ms from 'ms';
import {
  collectPullRequests,
  PartialResultsError,
  RawPullRequest,
  CollectPullRequestsParams,
} from './collectors/pullRequests.js';
import { calculateCycleTime } from './calculators/cycleTime.js';
import { calculateReviewMetrics } from './calculators/reviewMetrics.js';
import { writeOutput } from './output/writers.js';

interface CliOptions {
  since: string;
  format: string;
  token?: string;
  baseUrl?: string;
  dryRun?: boolean;
  progress?: boolean;
  output?: string;
}

function stats(values: number[]): {
  median: number | null;
  p95: number | null;
} {
  if (values.length === 0) return { median: null, p95: null };
  const sorted = [...values].sort((a, b) => a - b);
  let median: number;
  if (sorted.length % 2 === 0) {
    const i = sorted.length / 2;
    median = (sorted[i - 1]! + sorted[i]!) / 2;
  } else {
    median = sorted[Math.floor(sorted.length / 2)]!;
  }
  const p95Index = Math.ceil(sorted.length * 0.95) - 1;
  const safeIndex = Math.min(sorted.length - 1, Math.max(0, p95Index));
  const p95 = sorted[safeIndex]!;
  return { median, p95 };
}

export async function runCli(argv = process.argv): Promise<void> {
  const program = new Command();
  program
    .name('gh-pr-metrics')
    .description('Calculate GitHub pull request metrics')
    .argument('<repo>', 'owner/repo')
    .option('--since <duration>', 'look back period', '90d')
    .option('--format <format>', 'json or csv', 'json')
    .option('--token <token>', 'GitHub token')
    .option('--base-url <url>', 'GitHub API base URL')
    .option('--dry-run', 'print options and exit')
    .option('--progress', 'show progress during fetch')
    .option('--output <path|stdout|stderr>', 'write metrics to file or stdout/stderr', 'stdout')
    .allowExcessArguments(false);

  program.parse(argv);
  const opts = program.opts<CliOptions>();
  const [owner, repo] = (program.args[0] || '').split('/');
  const token = opts.token ?? process.env['GH_TOKEN'];
  if (!owner || !repo) {
    console.error('Repository must be in <owner>/<repo> format');
    program.help({ error: true });
  }
  if (!token) {
    console.error('GitHub token required via --token or GH_TOKEN env');
    program.help({ error: true });
  }
  const sinceMs = typeof ms(opts.since) === 'number' ? (ms(opts.since) as number) : ms('90d');
  const since = new Date(Date.now() - sinceMs).toISOString();

  if (opts.dryRun) {
    console.log(`Would fetch metrics for ${owner}/${repo} since ${opts.since}`);
    return;
  }

  const onProgress = opts.progress
    ? (count: number) => {
        process.stderr.write(`Fetched ${count} PRs\r`);
      }
    : undefined;

  const collectOpts: CollectPullRequestsParams = {
    owner: owner as string,
    repo: repo as string,
    since,
    auth: token as string,
    baseUrl: opts.baseUrl,
    onProgress,
  };

  let prs: RawPullRequest[] = [];
  try {
    prs = await collectPullRequests(collectOpts);
    if (onProgress) process.stderr.write('\n');
  } catch (err: any) {
    if (err instanceof PartialResultsError) {
      console.error(`Encountered error after ${err.partial.length} PRs: ${err.message}`);
      prs = err.partial;
    } else {
      console.error(`Failed to fetch pull requests: ${err.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const cycleTimes: number[] = [];
  const pickupTimes: number[] = [];
  for (const pr of prs) {
    try {
      cycleTimes.push(calculateCycleTime(pr));
    } catch {
      /* ignore */
    }
    try {
      pickupTimes.push(calculateReviewMetrics(pr));
    } catch {
      /* ignore */
    }
  }
  const result = {
    cycleTime: stats(cycleTimes),
    pickupTime: stats(pickupTimes),
  };

  writeOutput(result, {
    format: opts.format as 'json' | 'csv',
    destination: opts.output,
  });
}

export default runCli;
