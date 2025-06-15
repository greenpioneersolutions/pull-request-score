import { graphql as baseGraphql } from "@octokit/graphql";
import { Octokit } from "@octokit/core";
import { throttling } from "@octokit/plugin-throttling";
import Bottleneck from "bottleneck";

/**
 * Configuration options for {@link makeGraphQLClient}.
 */
export interface GraphQLClientOptions {
  /** Personal access token or GitHub App installation token. */
  auth?: string;
  /** Optional strategy that returns a token for each request. */
  authStrategy?: () => Promise<string>;
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
    baseUrl: opts.baseUrl,
    throttle: {
      onRateLimit: () => true,
      onSecondaryRateLimit: () => true,
    },
  });

  const graphqlBase = baseGraphql.defaults({
    request: octokit.request,
    baseUrl: opts.baseUrl,
  });

  const scheduledGraphql: typeof baseGraphql = (async (
    query: any,
    parameters?: any,
  ) => {
    const token = opts.authStrategy
      ? await opts.authStrategy()
      : (opts.auth as string);
    return limiter.schedule(() =>
      graphqlBase(query as any, {
        ...parameters,
        headers: {
          ...(parameters?.headers ?? {}),
          authorization: `token ${token}`,
        },
      }),
    );
  }) as typeof baseGraphql;

  scheduledGraphql.defaults = graphqlBase.defaults;
  scheduledGraphql.endpoint = graphqlBase.endpoint;

  return scheduledGraphql;
};

export async function graphqlWithRetry<T>(
  client: typeof baseGraphql,
  query: any,
  variables?: any,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return (await client(query, variables)) as T;
    } catch (err: any) {
      const code =
        err.errors?.[0]?.type ?? err.errors?.[0]?.extensions?.code;
      if (code === "RATE_LIMITED" && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}
