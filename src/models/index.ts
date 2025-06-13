/** Basic user information attached to a pull request entity. */
export interface Author {
  /** GitHub login name */
  login: string;
}

/**
 * A single review on a pull request.
 */
export interface Review {
  id: string;
  state: string;
  submittedAt: string;
  author: Author | null;
}

/**
 * Comment left on a pull request.
 */
export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Author | null;
}

/**
 * Commit associated with a pull request.
 */
export interface Commit {
  oid: string;
  messageHeadline: string;
  committedDate: string;
}

/**
 * Result of a CI check suite on the pull request.
 */
export interface CheckSuite {
  id: string;
  status: string;
  conclusion: string | null;
  startedAt: string;
  completedAt: string;
}

/**
 * Normalised pull request record returned from the GitHub API.
 */
export interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  author: Author | null;
  reviews: Review[];
  comments: Comment[];
  commits: Commit[];
  checkSuites: CheckSuite[];
  /** Lines added in the pull request */
  additions: number;
  /** Lines removed in the pull request */
  deletions: number;
  /** Number of files changed */
  changedFiles: number;
  /** Labels applied to the pull request */
  labels: { name: string }[];
}
