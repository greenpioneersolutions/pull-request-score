import { makeGraphQLClient, graphqlWithRetry } from "../api/githubGraphql.js";
import { getAuthStrategy } from "../auth/getAuthStrategy.js";
import { createHash } from "crypto";
import { EventEmitter } from "events";
import type { CacheStore } from "../cache/CacheStore.js";
import type {
  PullRequest,
  Author,
  Review,
  Comment,
  Commit,
  CheckSuite,
} from "../models/index.js";
import type {
  GraphqlPullRequest,
  PullRequestsQuery,
} from "./pullRequests.types.js";

export type RawAuthor = Author;
export type RawReview = Review;
export type RawComment = Comment;
export type RawCommit = Commit;
export type RawCheckSuite = CheckSuite;
export type RawPullRequest = PullRequest;

export class PartialResultsError extends Error {
  public partial: RawPullRequest[];
  constructor(message: string, partial: RawPullRequest[]) {
    super(message);
    this.partial = partial;
  }
}

export interface CollectPullRequestsParams {
  owner: string;
  repo: string;
  since: string;
  auth: string;
  baseUrl?: string;
  onProgress?: (count: number) => void;
  includeLabels?: string[];
  excludeLabels?: string[];
  cache?: CacheStore;
  /** Resume from last saved cursor if available */
  resume?: boolean;
  /** Event emitter to receive progress events */
  events?: EventEmitter;
}

function mapPR(pr: GraphqlPullRequest): RawPullRequest {
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    state: pr.state,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    mergedAt: pr.mergedAt,
    closedAt: pr.closedAt,
    author: pr.author ? { login: pr.author.login } : null,
    reviews: pr.reviews.nodes.map((r) => ({
      id: r.id,
      state: r.state,
      submittedAt: r.submittedAt,
      author: r.author ? { login: r.author.login } : null,
    })),
    comments: pr.comments.nodes.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: c.author ? { login: c.author.login } : null,
    })),
    commits: pr.commits.nodes.map((c) => ({
      oid: c.commit.oid,
      messageHeadline: c.commit.messageHeadline,
      committedDate: c.commit.committedDate,
      checkSuites: c.commit.checkSuites.nodes.map((cs) => ({
        conclusion: cs.conclusion,
      })),
    })),
    checkSuites: pr.checkSuites.nodes.map((c) => ({
      id: c.id,
      status: c.status,
      conclusion: c.conclusion,
      startedAt: c.startedAt,
      completedAt: c.completedAt,
    })),
    timelineItems: pr.timelineItems.nodes.map((t) => ({
      type: t.__typename,
      createdAt: t.createdAt,
    })),
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changedFiles,
    labels: pr.labels.nodes.map((l) => ({ name: l.name })),
  };
}

export async function collectPullRequests(
  params: CollectPullRequestsParams,
): Promise<RawPullRequest[]> {
  const client = makeGraphQLClient({
    authStrategy: getAuthStrategy({
      owner: params.owner,
      token: params.auth,
      baseUrl: params.baseUrl,
    }),
    baseUrl: params.baseUrl,
  });
  const since = new Date(params.since);
  const prs: RawPullRequest[] = [];
  const cacheCursorKey = `cursor:${params.owner}/${params.repo}`;
  const persistEvery = 5;
  let pages = 0;
  let cursor: string | null = null;
  let lastUpdated = "";
  if (params.resume && params.cache) {
    const saved = params.cache.get<{ cursor: string | null; updatedAt: string }>(
      cacheCursorKey,
    );
    if (saved?.cursor) cursor = saved.cursor;
    if (saved?.updatedAt) lastUpdated = saved.updatedAt;
  }
  let hasNextPage = true;
  const query = `query($owner:String!,$repo:String!,$cursor:String){
    repository(owner:$owner,name:$repo){
      pullRequests(first:100,after:$cursor,orderBy:{field:UPDATED_AT,direction:DESC}){
        pageInfo{hasNextPage,endCursor}
        nodes{
          id number title state createdAt updatedAt mergedAt closedAt
          additions deletions changedFiles
          labels(first:20){nodes{name}}
          author{login}
          reviews(first:100){nodes{id state submittedAt author{login}}}
          comments(first:100){nodes{id body createdAt author{login}}}
          commits(last:100){nodes{commit{oid committedDate messageHeadline checkSuites(first:100){nodes{conclusion}}}}}
          checkSuites(first:100){nodes{id status conclusion startedAt completedAt}}
          timelineItems(first:100,itemTypes:[READY_FOR_REVIEW,REVIEW_REQUESTED]){nodes{__typename ... on ReadyForReviewEvent{createdAt} ... on ReviewRequestedEvent{createdAt}}}
        }
      }
    }
  }`;

  let retries = 0;
  while (hasNextPage) {
    try {
      const key: string = createHash("sha1").update(String(cursor)).digest("hex");
      let data: PullRequestsQuery | undefined = params.cache?.get<PullRequestsQuery>(key);
      if (!data) {
        data = (await graphqlWithRetry<PullRequestsQuery>(client, query, {
          owner: params.owner,
          repo: params.repo,
          cursor,
        })) as PullRequestsQuery;
        params.cache?.set(key, data);
      }
      const connection = data!.repository.pullRequests;
      pages += 1;
      for (const pr of connection.nodes) {
        if (new Date(pr.updatedAt) < since) {
          hasNextPage = false;
          break;
        }
        const mapped = mapPR(pr);
        if (
          params.includeLabels &&
          !mapped.labels.some((l) => params.includeLabels!.includes(l.name))
        ) {
          continue;
        }
        if (
          params.excludeLabels &&
          mapped.labels.some((l) => params.excludeLabels!.includes(l.name))
        ) {
          continue;
        }
        prs.push(mapped);
        params.onProgress?.(prs.length);
      }
      if (hasNextPage) {
        hasNextPage = connection.pageInfo.hasNextPage;
        cursor = connection.pageInfo.endCursor;
      }
      lastUpdated = connection.nodes[connection.nodes.length - 1]?.updatedAt ?? lastUpdated;
      params.events?.emit("progress", { cursor, updatedAt: lastUpdated });
      if (params.resume && params.cache && pages % persistEvery === 0) {
        params.cache.set(cacheCursorKey, { cursor, updatedAt: lastUpdated });
      }
      retries = 0;
    } catch (err: any) {
      if (
        retries < 5 &&
        (err.status === 403 || /secondary rate/i.test(err.message))
      ) {
        await new Promise((r) => setTimeout(r, 2 ** retries * 1000));
        retries += 1;
        continue;
      }
      if (params.resume && params.cache) {
        params.cache.set(cacheCursorKey, { cursor, updatedAt: lastUpdated });
      }
      params.events?.emit("progress", { cursor, updatedAt: lastUpdated });
      if (prs.length) {
        throw new PartialResultsError(err.message, prs);
      }
      throw err;
    }
  }

  prs.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  if (params.resume && params.cache) {
    params.cache.set(cacheCursorKey, { cursor: null, updatedAt: lastUpdated }, 1);
  }
  return prs;
}

export default collectPullRequests;
