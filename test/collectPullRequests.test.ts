import nock from 'nock';
import { collectPullRequests } from '../src/collectors/pullRequests';

const baseUrl = 'http://g.test';
const auth = 'abc';

jest.mock('../src/api/githubGraphql.js', () => ({
  makeGraphQLClient: () => async (query: string, variables: any) => {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { authorization: `token ${auth}` },
      body: JSON.stringify({ query, variables }),
    });
    return (await res.json()).data;
  },
}));

describe('collectPullRequests', () => {
  const since = new Date('2024-01-01').toISOString();
  const queryRegex = /pullRequests/;

  afterEach(() => {
    nock.cleanAll();
  });

  it('fetches pages and filters by updatedAt', async () => {
    const scope = nock(baseUrl, {
      reqheaders: { authorization: `token ${auth}` },
    })
      .post('/graphql', (body: any) => queryRegex.test(body.query))
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: true, endCursor: 'c1' },
              nodes: [
                {
                  id: '1',
                  number: 1,
                  title: 'pr1',
                  state: 'OPEN',
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-02T00:00:00Z',
                  mergedAt: null,
                  closedAt: null,
                  additions: 5,
                  deletions: 1,
                  changedFiles: 2,
                  labels: { nodes: [] },
                  author: { login: 'a' },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                },
                {
                  id: '2',
                  number: 2,
                  title: 'pr2',
                  state: 'OPEN',
                  createdAt: '2024-01-02T00:00:00Z',
                  updatedAt: '2024-01-03T00:00:00Z',
                  mergedAt: null,
                  closedAt: null,
                  additions: 3,
                  deletions: 2,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: 'b' },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                },
              ],
            },
          },
        },
      })
      .post('/graphql')
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: '3',
                  number: 3,
                  title: 'pr3',
                  state: 'OPEN',
                  createdAt: '2024-01-03T00:00:00Z',
                  updatedAt: '2024-01-03T12:00:00Z',
                  mergedAt: null,
                  closedAt: null,
                  additions: 4,
                  deletions: 0,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: 'c' },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                },
                {
                  id: '4',
                  number: 4,
                  title: 'pr4',
                  state: 'OPEN',
                  createdAt: '2023-12-30T00:00:00Z',
                  updatedAt: '2023-12-31T00:00:00Z',
                  mergedAt: null,
                  closedAt: null,
                  additions: 10,
                  deletions: 5,
                  changedFiles: 5,
                  labels: { nodes: [] },
                  author: { login: 'd' },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                },
              ],
            },
          },
        },
      });

    const prs = await collectPullRequests({
      owner: 'me',
      repo: 'repo',
      since,
      auth,
      baseUrl,
    });

    expect(prs.map((p) => p.id)).toEqual(['1', '2', '3']);
    expect(prs[0]?.additions).toBe(5);
    expect(prs[1]?.labels).toEqual([]);
    scope.done();
  });

  it('invokes progress callback', async () => {
    nock(baseUrl)
      .post('/graphql')
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: '1',
                  number: 1,
                  title: 'pr1',
                  state: 'OPEN',
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-02T00:00:00Z',
                  mergedAt: null,
                  closedAt: null,
                  additions: 1,
                  deletions: 1,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: 'a' },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                },
              ],
            },
          },
        },
      });
    const counts: number[] = [];
    await collectPullRequests({
      owner: 'me',
      repo: 'r',
      since,
      auth,
      baseUrl,
      onProgress: (c) => counts.push(c),
    });
    expect(counts).toEqual([1]);
  });

  it('returns partial results on error', async () => {
    const scope = nock(baseUrl)
      .post('/graphql')
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: true, endCursor: 'c1' },
              nodes: [
                {
                  id: '1',
                  number: 1,
                  title: 'pr1',
                  state: 'OPEN',
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-02T00:00:00Z',
                  mergedAt: null,
                  closedAt: null,
                  additions: 1,
                  deletions: 1,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: 'a' },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                },
              ],
            },
          },
        },
      })
      .post('/graphql')
      .reply(500, {});

    await expect(
      collectPullRequests({ owner: 'me', repo: 'r', since, auth, baseUrl }),
    ).rejects.toHaveProperty('partial.length', 1);
    scope.done();
  });
});
