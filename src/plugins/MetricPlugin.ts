export interface MetricPlugin {
  slug: string;
  description: string;
  calculate(pr: import('../collectors/pullRequests.js').RawPullRequest): unknown;
}
