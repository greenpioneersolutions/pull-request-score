import fs from "fs";
import type { RawPullRequest } from "../collectors/pullRequests.js";
import type { StatsResult } from "../stats.js";
import { stats } from "../stats.js";
import { calculateCycleTime } from "./cycleTime.js";
import { calculateReviewMetrics } from "./reviewMetrics.js";
import { calculateMetrics } from "./metrics.js";
import { scorePr } from "../scoring/prScoring.js";

export interface AuthorMetrics {
  author: string;
  prCount: number;
  cycleTime: StatsResult;
  pickupTime: StatsResult;
  mergeRate: number;
  outsizedPrRatio: number;
  reviewCoverage: number;
  buildSuccessRate: number;
  averageScore: number | null;
}

export type TeamMapping = Record<string, string>;

export interface TeamMetrics extends AuthorMetrics {
  team: string;
  members: string[];
}

export function groupByAuthor(
  prs: RawPullRequest[],
): Map<string, RawPullRequest[]> {
  const groups = new Map<string, RawPullRequest[]>();
  for (const pr of prs) {
    const login = pr.author?.login ?? "unknown";
    const list = groups.get(login) ?? [];
    list.push(pr);
    groups.set(login, list);
  }
  return groups;
}

function computeAuthorStats(
  author: string,
  prs: RawPullRequest[],
): AuthorMetrics {
  const cycleTimes: number[] = [];
  const pickupTimes: number[] = [];
  for (const pr of prs) {
    try {
      cycleTimes.push(calculateCycleTime(pr));
    } catch {
      /* skip */
    }
    try {
      pickupTimes.push(calculateReviewMetrics(pr));
    } catch {
      /* skip */
    }
  }

  const agg = calculateMetrics(prs);
  const scores = prs.map((pr) => scorePr(pr));
  const avgScore =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      : null;

  return {
    author,
    prCount: prs.length,
    cycleTime: stats(cycleTimes),
    pickupTime: stats(pickupTimes),
    mergeRate: agg.mergeRate,
    outsizedPrRatio: agg.outsizedPrRatio,
    reviewCoverage: agg.reviewCoverage,
    buildSuccessRate: agg.buildSuccessRate,
    averageScore: avgScore !== null ? Math.round(avgScore * 100) / 100 : null,
  };
}

export function calculateAuthorMetrics(
  prs: RawPullRequest[],
): AuthorMetrics[] {
  const groups = groupByAuthor(prs);
  const results: AuthorMetrics[] = [];
  for (const [author, authorPrs] of groups) {
    results.push(computeAuthorStats(author, authorPrs));
  }
  return results.sort((a, b) => b.prCount - a.prCount);
}

export function loadTeamMapping(filePath: string): TeamMapping {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as TeamMapping;
}

export function calculateTeamMetrics(
  prs: RawPullRequest[],
  mapping: TeamMapping,
): TeamMetrics[] {
  const teamPrs = new Map<string, RawPullRequest[]>();
  const teamMembers = new Map<string, Set<string>>();

  for (const pr of prs) {
    const login = pr.author?.login ?? "unknown";
    const team = mapping[login] ?? "unassigned";
    const list = teamPrs.get(team) ?? [];
    list.push(pr);
    teamPrs.set(team, list);

    const members = teamMembers.get(team) ?? new Set<string>();
    members.add(login);
    teamMembers.set(team, members);
  }

  const results: TeamMetrics[] = [];
  for (const [team, tPrs] of teamPrs) {
    const base = computeAuthorStats(team, tPrs);
    results.push({
      ...base,
      team,
      members: [...(teamMembers.get(team) ?? [])],
    });
  }
  return results.sort((a, b) => b.prCount - a.prCount);
}
