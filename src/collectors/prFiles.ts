import { request } from "@octokit/request";
import { createRateLimiter } from "../api/rateLimiter.js";
import type { CacheStore } from "../cache/CacheStore.js";
import type { PrFile } from "../models/files.js";
import type { PullRequest } from "../models/index.js";

export interface CollectPrFilesParams {
  owner: string;
  repo: string;
  prNumber: number;
  auth: string;
  baseUrl?: string;
  cache?: CacheStore;
  /** Omit patch text from results to reduce payload size. */
  skipPatches?: boolean;
}

const MERGED_TTL = 7 * 24 * 60 * 60; // 7 days

/**
 * Fetch files changed in a single pull request via the GitHub REST API.
 * Handles pagination and optional caching.
 */
export async function collectPrFiles(
  params: CollectPrFilesParams,
): Promise<PrFile[]> {
  const cacheKey = `files:${params.owner}/${params.repo}/${params.prNumber}`;

  if (params.cache) {
    const cached = params.cache.get<PrFile[]>(cacheKey);
    if (cached) return params.skipPatches ? stripPatches(cached) : cached;
  }

  const schedule = createRateLimiter();
  const baseUrl = params.baseUrl ?? "https://api.github.com";
  const files: PrFile[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await schedule(() =>
      request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
        owner: params.owner,
        repo: params.repo,
        pull_number: params.prNumber,
        per_page: 100,
        page,
        baseUrl,
        headers: { authorization: `token ${params.auth}` },
      }),
    );

    for (const file of response.data) {
      files.push({
        sha: file.sha,
        filename: file.filename,
        status: file.status as PrFile["status"],
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
        previousFilename: file.previous_filename,
      });
    }

    hasMore = response.data.length === 100;
    page += 1;
  }

  if (params.cache) {
    params.cache.set(cacheKey, files, MERGED_TTL);
  }

  return params.skipPatches ? stripPatches(files) : files;
}

function stripPatches(files: PrFile[]): PrFile[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return files.map(({ patch, ...rest }) => rest);
}

/**
 * Fetch files for multiple PRs. Returns a map of PR number to file list.
 */
export async function collectFilesForPrs(
  prs: PullRequest[],
  params: Omit<CollectPrFilesParams, "prNumber">,
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<number, PrFile[]>> {
  const result = new Map<number, PrFile[]>();
  let completed = 0;

  for (const pr of prs) {
    const files = await collectPrFiles({ ...params, prNumber: pr.number });
    result.set(pr.number, files);
    completed += 1;
    onProgress?.(completed, prs.length);
  }

  return result;
}
