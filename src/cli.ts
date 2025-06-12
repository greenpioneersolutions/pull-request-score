#!/usr/bin/env node
import { program } from "commander";
import ms from "ms";
import { collectPullRequests } from "./collectors/pullRequests.js";
import { calculateCycleTime } from "./calculators/cycleTime.js";
import { calculateReviewMetrics } from "./calculators/reviewMetrics.js";

interface CliOptions {
  since: string;
  format: string;
  token?: string;
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
  program
    .name("gh-pr-metrics")
    .argument("<repo>", "owner/repo")
    .option("--since <duration>", "look back period", "90d")
    .option("--format <format>", "json or csv", "json")
    .option("--token <token>", "GitHub token")
    .allowExcessArguments(false);

  program.parse(argv);
  const opts = program.opts<CliOptions>();
  const [owner, repo] = (program.args[0] || "").split("/");
  const token = opts.token ?? process.env["GH_TOKEN"];
  if (!owner || !repo) {
    console.error("Repository must be in <owner>/<repo> format");
    program.help({ error: true });
  }
  if (!token) {
    console.error("GitHub token required via --token or GH_TOKEN env");
    program.help({ error: true });
  }
  const sinceMs =
    typeof ms(opts.since) === "number" ? (ms(opts.since) as number) : ms("90d");
  const since = new Date(Date.now() - sinceMs).toISOString();

  try {
    const prs = await collectPullRequests({ owner, repo, since, auth: token });
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

    if (opts.format === "csv") {
      const rows = [
        ["metric", "median", "p95"],
        [
          "cycleTime",
          String(result.cycleTime.median ?? ""),
          String(result.cycleTime.p95 ?? ""),
        ],
        [
          "pickupTime",
          String(result.pickupTime.median ?? ""),
          String(result.pickupTime.p95 ?? ""),
        ],
      ];
      console.log(rows.map((r) => r.join(",")).join("\n"));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err: any) {
    console.error(`Failed to fetch pull requests: ${err.message}`);
    process.exitCode = 1;
  }
}

export default runCli;
