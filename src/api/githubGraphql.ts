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

export interface RetryOptions {
  /** Maximum number of retry attempts. Default: 5 */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff. Default: 1000 */
  baseDelayMs?: number;
  /** Maximum delay in ms. Default: 60000 (60s) */
  maxDelayMs?: number;
}

export async function graphqlWithRetry<T>(
  client: typeof baseGraphql,
  query: any,
  variables?: any,
  retryOpts?: RetryOptions | number,
): Promise<T> {
  const opts: Required<RetryOptions> =
    typeof retryOpts === "number"
      ? { maxAttempts: retryOpts, baseDelayMs: 1000, maxDelayMs: 60_000 }
      : {
          maxAttempts: retryOpts?.maxAttempts ?? 5,
          baseDelayMs: retryOpts?.baseDelayMs ?? 1000,
          maxDelayMs: retryOpts?.maxDelayMs ?? 60_000,
        };

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return (await client(query, variables)) as T;
    } catch (err: any) {
      const code =
        err.errors?.[0]?.type ?? err.errors?.[0]?.extensions?.code;
      const isSecondary =
        /secondary/i.test(err.message ?? "") || err.status === 403;
      if (
        (code === "RATE_LIMITED" || isSecondary) &&
        attempt < opts.maxAttempts - 1
      ) {
        const delay = Math.min(
          2 ** attempt * opts.baseDelayMs,
          opts.maxDelayMs,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}
