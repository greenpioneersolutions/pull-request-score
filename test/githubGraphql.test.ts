import Bottleneck from "bottleneck";
import { makeGraphQLClient, graphqlWithRetry } from "../src/api/githubGraphql.js";

// Mock Bottleneck to observe scheduling
jest.mock("bottleneck", () => {
  const Mock = jest.fn().mockImplementation(function (this: any, opts: any) {
    this.opts = opts;
    this.schedule = jest.fn(async (fn: any, ...args: any[]) => fn(...args));
  });
  return { __esModule: true, default: Mock };
});

const requestMock = jest.fn();

jest.mock("@octokit/core", () => {
  return {
    Octokit: class {
      public request = requestMock;
      public graphql = jest.fn();
      static plugin() {
        return this;
      }
    },
  };
});

var graphqlFn: any;
jest.mock("@octokit/graphql", () => {
  graphqlFn = jest.fn().mockResolvedValue({});
  graphqlFn.defaults = jest.fn(() => graphqlFn);
  graphqlFn.endpoint = jest.fn();
  return { graphql: graphqlFn };
});
jest.mock("@octokit/plugin-throttling", () => ({ throttling: {} }));

describe("makeGraphQLClient", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("injects auth header", async () => {
    const client = makeGraphQLClient({ auth: "token123" });
    await client("{ test }");
    expect(graphqlFn).toHaveBeenCalledWith(
      "{ test }",
      expect.objectContaining({
        headers: { authorization: "token token123" },
      }),
    );
  });

  it("schedules requests through Bottleneck", async () => {
    const client = makeGraphQLClient({
      auth: "x",
      throttle: { requestsPerMinute: 10 },
    });
    const BottleneckMock = Bottleneck as unknown as jest.MockedClass<any>;
    const instance = BottleneckMock.mock.instances[0];

    await client("{ test }");
    expect(instance.schedule).toHaveBeenCalledTimes(1);
    expect(instance.opts.reservoir).toBe(10);
  });

  it("uses auth strategy", async () => {
    const client = makeGraphQLClient({
      authStrategy: async () => "app-token",
    });
    await client("{ test }", { foo: "bar" });
    expect(graphqlFn).toHaveBeenCalledWith(
      "{ test }",
      expect.objectContaining({
        foo: "bar",
        headers: { authorization: "token app-token" },
      }),
    );
  });
});

describe("graphqlWithRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("returns result on success", async () => {
    const client = jest.fn().mockResolvedValue({ data: "ok" }) as any;
    const result = await graphqlWithRetry(client, "{ test }");
    expect(result).toEqual({ data: "ok" });
    expect(client).toHaveBeenCalledTimes(1);
  });

  it("retries on RATE_LIMITED error", async () => {
    const client = jest
      .fn()
      .mockRejectedValueOnce({ errors: [{ type: "RATE_LIMITED" }] })
      .mockResolvedValue({ data: "ok" }) as any;

    const promise = graphqlWithRetry(client, "{ test }", undefined, {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
    });
    await jest.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toEqual({ data: "ok" });
    expect(client).toHaveBeenCalledTimes(2);
  });

  it("retries on secondary rate limit (403)", async () => {
    const client = jest
      .fn()
      .mockRejectedValueOnce({ status: 403, message: "secondary rate limit" })
      .mockResolvedValue({ data: "ok" }) as any;

    const promise = graphqlWithRetry(client, "{ test }", undefined, {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
    });
    await jest.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toEqual({ data: "ok" });
    expect(client).toHaveBeenCalledTimes(2);
  });

  it("caps delay at maxDelayMs", async () => {
    const client = jest
      .fn()
      .mockRejectedValueOnce({ errors: [{ type: "RATE_LIMITED" }] })
      .mockRejectedValueOnce({ errors: [{ type: "RATE_LIMITED" }] })
      .mockRejectedValueOnce({ errors: [{ type: "RATE_LIMITED" }] })
      .mockResolvedValue({ data: "ok" }) as any;

    const promise = graphqlWithRetry(client, "{ test }", undefined, {
      maxAttempts: 5,
      baseDelayMs: 1000,
      maxDelayMs: 2000,
    });
    // attempt 0 fails => delay min(1*1000, 2000)=1000
    await jest.advanceTimersByTimeAsync(1000);
    // attempt 1 fails => delay min(2*1000, 2000)=2000
    await jest.advanceTimersByTimeAsync(2000);
    // attempt 2 fails => delay min(4*1000, 2000)=2000 (capped)
    await jest.advanceTimersByTimeAsync(2000);
    const result = await promise;
    expect(result).toEqual({ data: "ok" });
    expect(client).toHaveBeenCalledTimes(4);
  });

  it("throws after exhausting retries", async () => {
    jest.useRealTimers();
    const error = { errors: [{ type: "RATE_LIMITED" }] };
    const client = jest.fn().mockRejectedValue(error) as any;

    await expect(
      graphqlWithRetry(client, "{ test }", undefined, {
        maxAttempts: 2,
        baseDelayMs: 1,
        maxDelayMs: 1,
      }),
    ).rejects.toEqual(error);
    expect(client).toHaveBeenCalledTimes(2);
  });

  it("accepts plain number for backward compatibility", async () => {
    const client = jest.fn().mockResolvedValue({ data: "ok" }) as any;
    const result = await graphqlWithRetry(client, "{ test }", undefined, 3);
    expect(result).toEqual({ data: "ok" });
  });
});
