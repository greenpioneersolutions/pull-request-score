import nock from "nock";
import fs from "fs";
import os from "os";
import path from "path";
import { collectPullRequests } from "../src/collectors/pullRequests";
import type { GraphqlPullRequest } from "../src/collectors/pullRequests.types";

const baseUrl = "http://g.test";
const auth = "abc";

jest.mock("../src/api/githubGraphql.js", () => ({
  graphqlWithRetry: async (client: any, q: any, v: any) => {
    let attempt = 0;
    // simple retry on RATE_LIMITED
    for (;;) {
      try {
        return await client(q, v);
      } catch (e: any) {
        if (e.errors?.[0]?.type === "RATE_LIMITED" && attempt < 5) {
          attempt++;
          continue;
        }
        throw e;
      }
    }
  },
  makeGraphQLClient: () => async (query: string, variables: any) => {
    const res = await fetch(`${baseUrl}/graphql`, {
      method: "POST",
      headers: { authorization: `token ${auth}` },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) {
      const err: any = new Error("GraphQL error");
      err.errors = json.errors;
      throw err;
    }
    return json.data;
  },
}));

describe("collectPullRequests", () => {
  const since = new Date("2024-01-01").toISOString();
  const queryRegex = /pullRequests/;

  afterEach(() => {
    nock.cleanAll();
  });

  it("retries on rate limit and handles pagination", async () => {
    const scope = nock(baseUrl, {
      reqheaders: { authorization: `token ${auth}` },
    })
      .post("/graphql", (body: any) => queryRegex.test(body.query))
      .reply(200, { errors: [{ type: "RATE_LIMITED" }] })
      .post("/graphql")
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
                  additions: 5,
                  deletions: 1,
                  changedFiles: 2,
                  labels: { nodes: [] },
                  author: { login: "a" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
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
                  additions: 3,
                  deletions: 2,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: "b" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
                },
              ] as GraphqlPullRequest[],
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
                  additions: 4,
                  deletions: 0,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: "c" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
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
                  additions: 10,
                  deletions: 5,
                  changedFiles: 5,
                  labels: { nodes: [] },
                  author: { login: "d" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
                },
              ] as GraphqlPullRequest[],
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
    expect(prs[0]?.additions).toBe(5);
    expect(prs[1]?.labels).toEqual([]);
    scope.done();
  });

  it("invokes progress callback", async () => {
    nock(baseUrl)
      .post("/graphql")
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
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
                  additions: 1,
                  deletions: 1,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: "a" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
                },
              ] as GraphqlPullRequest[],
            },
          },
        },
      });
    const counts: number[] = [];
    await collectPullRequests({
      owner: "me",
      repo: "r",
      since,
      auth,
      baseUrl,
      onProgress: (c) => counts.push(c),
    });
    expect(counts).toEqual([1]);
  });

  it("extracts ticket info from title", async () => {
    nock(baseUrl)
      .post("/graphql")
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: "1",
                  number: 1,
                  title: "BOSS-1252 fix bug",
                  state: "OPEN",
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-02T00:00:00Z",
                  mergedAt: null,
                  closedAt: null,
                  additions: 1,
                  deletions: 1,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: "a" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
                },
              ] as GraphqlPullRequest[],
            },
          },
        },
      });

    const prs = await collectPullRequests({
      owner: "me",
      repo: "r",
      since,
      auth,
      baseUrl,
    });
    expect(prs[0]?.ticket).toEqual({ team: "BOSS", number: 1252 });
  });

  it("filters by labels", async () => {
    nock(baseUrl)
      .post("/graphql")
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
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
                  additions: 1,
                  deletions: 1,
                  changedFiles: 1,
                  labels: { nodes: [{ name: "team-a" }] },
                  author: { login: "a" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
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
                  additions: 2,
                  deletions: 2,
                  changedFiles: 1,
                  labels: { nodes: [{ name: "team-b" }] },
                  author: { login: "b" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
                },
              ] as GraphqlPullRequest[],
            },
          },
        },
      });

    const prs = await collectPullRequests({
      owner: "me",
      repo: "r",
      since,
      auth,
      baseUrl,
      includeLabels: ["team-a"],
      excludeLabels: ["team-b"],
    });
    expect(prs.map((p) => p.number)).toEqual([1]);
  });

  it("returns partial results on error", async () => {
    const scope = nock(baseUrl)
      .post("/graphql")
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
                  additions: 1,
                  deletions: 1,
                  changedFiles: 1,
                  labels: { nodes: [] },
                  author: { login: "a" },
                  reviews: { nodes: [] },
                  comments: { nodes: [] },
                  commits: { nodes: [] },
                  checkSuites: { nodes: [] },
                  timelineItems: { nodes: [] },
                },
              ] as GraphqlPullRequest[],
            },
          },
        },
      })
      .post("/graphql")
      .reply(500, {});

    await expect(
      collectPullRequests({ owner: "me", repo: "r", since, auth, baseUrl }),
    ).rejects.toHaveProperty("partial.length", 1);
    scope.done();
  });

  it("uses cache on second run", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cache-"));
    const origHome = process.env["HOME"];
    process.env["HOME"] = tmp;
    const { sqliteStore } = require("../src/cache/sqliteStore");
    const cache = sqliteStore();

    const scope = nock(baseUrl)
      .post("/graphql")
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [] as GraphqlPullRequest[],
            },
          },
        },
      });

    await collectPullRequests({ owner: "me", repo: "r", since, auth, baseUrl, cache });
    await collectPullRequests({ owner: "me", repo: "r", since, auth, baseUrl, cache });

    process.env["HOME"] = origHome;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("resumes after interruption", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cache-"));
    const origHome = process.env["HOME"];
    process.env["HOME"] = tmp;
    const { sqliteStore } = require("../src/cache/sqliteStore");
    const cache = sqliteStore();

    const makePr = (n: number): GraphqlPullRequest => ({
      id: String(n),
      number: n,
      title: `pr${n}`,
      state: "OPEN",
      createdAt: `2024-01-0${n}T00:00:00Z`,
      updatedAt: `2024-01-0${n}T00:00:00Z`,
      mergedAt: null,
      closedAt: null,
      additions: 1,
      deletions: 1,
      changedFiles: 1,
      labels: { nodes: [] },
      author: { login: "a" },
      reviews: { nodes: [] },
      comments: { nodes: [] },
      commits: { nodes: [] },
      checkSuites: { nodes: [] },
      timelineItems: { nodes: [] },
    });

    cache.set("cursor:me/r", { cursor: "c5", updatedAt: "2024-01-05T00:00:00Z" });
    nock(baseUrl)
      .post("/graphql", (body: any) => body.variables.cursor === "c5")
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: { hasNextPage: true, endCursor: "c6" },
              nodes: [makePr(6)] as GraphqlPullRequest[],
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
              nodes: [makePr(7)] as GraphqlPullRequest[],
            },
          },
        },
      });
    const prs = await collectPullRequests({
      owner: "me",
      repo: "r",
      since,
      auth,
      baseUrl,
      cache,
      resume: true,
    });

    expect(prs.map((p) => p.number)).toEqual([6, 7]);

    process.env["HOME"] = origHome;
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
