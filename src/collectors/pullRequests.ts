import { makeGraphQLClient, graphqlWithRetry } from "../api/githubGraphql.js";
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
    auth: params.auth,
    baseUrl: params.baseUrl,
  });
  const since = new Date(params.since);
  const prs: RawPullRequest[] = [];
  let cursor: string | null = null;
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
      const data = (await graphqlWithRetry<PullRequestsQuery>(client, query, {
        owner: params.owner,
        repo: params.repo,
        cursor,
      })) as PullRequestsQuery;
      const connection = data.repository.pullRequests;
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
      if (prs.length) {
        throw new PartialResultsError(err.message, prs);
      }
      throw err;
    }
  }

  prs.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return prs;
}

export default collectPullRequests;
