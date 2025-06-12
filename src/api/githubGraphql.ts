import { graphql as baseGraphql } from "@octokit/graphql";
import { Octokit } from "@octokit/core";
import { throttling } from "@octokit/plugin-throttling";
import Bottleneck from "bottleneck";

/**
 * Configuration options for {@link makeGraphQLClient}.
 */
export interface GraphQLClientOptions {
  /** Personal access token or GitHub App installation token. */
  auth: string;
  /** Optional GitHub Enterprise URL, defaults to public GitHub. */
  baseUrl?: string;
  /**
   * Simple token bucket throttling configuration.
   * The rate limit is expressed as requests per minute.
   */
  throttle?: { requestsPerMinute: number };
}

/**
 * Create a preconfigured GraphQL client with authentication and
 * rate limiting using `@octokit/plugin-throttling` and `bottleneck`.
 *
 * @param opts - authentication, URL and throttling options
 * @returns a function compatible with `@octokit/graphql`
 */
export const makeGraphQLClient = (
  opts: GraphQLClientOptions,
): typeof baseGraphql => {
  const rpm = opts.throttle?.requestsPerMinute ?? 5000 / 60;

  const limiter = new Bottleneck({
    reservoir: rpm,
    reservoirRefreshAmount: rpm,
    reservoirRefreshInterval: 60 * 1000,
  });

  const OctokitWithThrottle = Octokit.plugin(throttling);

  const octokit = new OctokitWithThrottle({
    auth: opts.auth,
    baseUrl: opts.baseUrl,
    throttle: {
      onRateLimit: () => true,
      onSecondaryRateLimit: () => true,
    },
  });

  const graphqlWithAuth = baseGraphql.defaults({
    request: octokit.request,
    baseUrl: opts.baseUrl,
    headers: { authorization: `token ${opts.auth}` },
  });

  const scheduledGraphql: typeof baseGraphql = (async (
    query: any,
    parameters?: any,
  ) =>
    limiter.schedule(() =>
      graphqlWithAuth(query as any, parameters),
    )) as typeof baseGraphql;

  scheduledGraphql.defaults = graphqlWithAuth.defaults;
  scheduledGraphql.endpoint = graphqlWithAuth.endpoint;

  return scheduledGraphql;
};
