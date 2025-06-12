import nock from "nock";
import { collectPullRequests } from "../src/collectors/pullRequests";

const baseUrl = "http://g.test";
const auth = "abc";

jest.mock("../src/api/githubGraphql.js", () => ({
  makeGraphQLClient: () => async (query: string, variables: any) => {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: "POST",
      headers: { authorization: `token ${auth}` },
      body: JSON.stringify({ query, variables }),
    });
    return (await res.json()).data;
  },
}));

describe("collectPullRequests", () => {
  const since = new Date("2024-01-01").toISOString();
  const queryRegex = /pullRequests/;

  afterEach(() => {
    nock.cleanAll();
  });

  it("fetches pages and filters by updatedAt", async () => {
    const scope = nock(baseUrl, {
      reqheaders: { authorization: `token ${auth}` },
    })
      .post("/graphql", (body: any) => queryRegex.test(body.query))
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: true, endCursor: "c1" },
              nodes: [
                {
                  id: "1",
                  number: 1,
                  title: "pr1",
                  state: "OPEN",
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-02T00:00:00Z",
                  mergedAt: null,
                  closedAt: null,
                  author: { login: "a" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                },
                {
                  id: "2",
                  number: 2,
                  title: "pr2",
                  state: "OPEN",
                  createdAt: "2024-01-02T00:00:00Z",
                  updatedAt: "2024-01-03T00:00:00Z",
                  mergedAt: null,
                  closedAt: null,
                  author: { login: "b" },
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
      .post("/graphql")
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: "3",
                  number: 3,
                  title: "pr3",
                  state: "OPEN",
                  createdAt: "2024-01-03T00:00:00Z",
                  updatedAt: "2024-01-03T12:00:00Z",
                  mergedAt: null,
                  closedAt: null,
                  author: { login: "c" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                },
                {
                  id: "4",
                  number: 4,
                  title: "pr4",
                  state: "OPEN",
                  createdAt: "2023-12-30T00:00:00Z",
                  updatedAt: "2023-12-31T00:00:00Z",
                  mergedAt: null,
                  closedAt: null,
                  author: { login: "d" },
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
      owner: "me",
      repo: "repo",
      since,
      auth,
      baseUrl,
    });

    expect(prs.map((p) => p.id)).toEqual(["1", "2", "3"]);
    scope.done();
  });
});
