export interface GraphqlAuthor {
  login: string;
}

export interface GraphqlReview {
  id: string;
  state: string;
  submittedAt: string;
  author: GraphqlAuthor | null;
}

export interface GraphqlComment {
  id: string;
  body: string;
  createdAt: string;
  author: GraphqlAuthor | null;
}

export interface GraphqlCommit {
  commit: {
    oid: string;
    messageHeadline: string;
    committedDate: string;
    checkSuites: { nodes: GraphqlCheckSuite[] };
  };
}

export interface GraphqlTimelineItem {
  __typename: string;
  createdAt: string;
}

export interface GraphqlCheckSuite {
  id: string;
  status: string;
  conclusion: string | null;
  startedAt: string;
  completedAt: string;
}

export interface GraphqlPullRequest {
  id: string;
  number: number;
  title: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: { nodes: { name: string }[] };
  author: GraphqlAuthor | null;
  reviews: { nodes: GraphqlReview[] };
  comments: { nodes: GraphqlComment[] };
  commits: { nodes: GraphqlCommit[] };
  timelineItems: { nodes: GraphqlTimelineItem[] };
}

export interface PullRequestConnection {
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  nodes: GraphqlPullRequest[];
}

export interface PullRequestsQuery {
  repository: {
    pullRequests: PullRequestConnection;
  };
}
