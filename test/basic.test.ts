const clientMock = jest.fn().mockResolvedValue({
  repository: {
    pullRequests: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
  },
});

const makeGraphQLClientMock = jest.fn(() => clientMock);

jest.mock("../src/api/githubGraphql.js", () => ({
  makeGraphQLClient: makeGraphQLClientMock,
  graphqlWithRetry: async (client: any, q: any, v: any) => client(q, v),
}));

import { collectPullRequests } from "../src/collectors/pullRequests";

describe("collectPullRequests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("invokes the GraphQL client", async () => {
    await collectPullRequests({
      owner: "me",
      repo: "repo",
      since: "2024-01-01",
      auth: "token123",
      baseUrl: "http://g.test",
    });

    expect(makeGraphQLClientMock).toHaveBeenCalledWith({
      auth: "token123",
      baseUrl: "http://g.test",
    });
    expect(clientMock).toHaveBeenCalledTimes(1);
    expect(clientMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ owner: "me", repo: "repo" })
    );
  });
});
