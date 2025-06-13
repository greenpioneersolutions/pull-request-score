import Bottleneck from "bottleneck";

export interface RateLimiterOptions {
  /** Requests allowed per minute */
  requestsPerMinute?: number;
}

/**
 * Create a simple rate limiter using a token bucket. The returned
 * function schedules work through a `Bottleneck` instance so that the
 * given requests-per-minute limit is respected.
 *
 * @param opts - throttling options
 * @returns a scheduler function wrapping `Bottleneck.schedule`
 */
export function createRateLimiter(
  opts: RateLimiterOptions = {},
): <T>(fn: () => Promise<T>) => Promise<T> {
  const rpm = opts.requestsPerMinute ?? 5000 / 60;

  const limiter = new Bottleneck({
    reservoir: rpm,
    reservoirRefreshAmount: rpm,
    reservoirRefreshInterval: 60 * 1000,
  });

  return async <T>(fn: () => Promise<T>): Promise<T> =>
    limiter.schedule(() => fn());
}

export default createRateLimiter;
