import Bottleneck from 'bottleneck';
import { makeGraphQLClient } from '../src/api/githubGraphql.js';

// Mock Bottleneck to observe scheduling
jest.mock('bottleneck', () => {
  const Mock = jest.fn().mockImplementation(function (this: any, opts: any) {
    this.opts = opts;
    this.schedule = jest.fn(async (fn: any, ...args: any[]) => fn(...args));
  });
  return { __esModule: true, default: Mock };
});

const requestMock = jest.fn();

jest.mock('@octokit/core', () => {
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
jest.mock('@octokit/graphql', () => {
  graphqlFn = jest.fn().mockResolvedValue({});
  graphqlFn.defaults = jest.fn(() => graphqlFn);
  graphqlFn.endpoint = jest.fn();
  return { graphql: graphqlFn };
});
jest.mock('@octokit/plugin-throttling', () => ({ throttling: {} }));

describe('makeGraphQLClient', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('injects auth header', async () => {
    const client = makeGraphQLClient({ auth: 'token123' });
    await client('{ test }');
    expect(graphqlFn.defaults).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { authorization: 'token token123' },
      }),
    );
  });

  it('schedules requests through Bottleneck', async () => {
    const client = makeGraphQLClient({
      auth: 'x',
      throttle: { requestsPerMinute: 10 },
    });
    const BottleneckMock = Bottleneck as unknown as jest.MockedClass<any>;
    const instance = BottleneckMock.mock.instances[0];

    await client('{ test }');
    expect(instance.schedule).toHaveBeenCalledTimes(1);
    expect(instance.opts.reservoir).toBe(10);
  });
});
