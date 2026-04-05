jest.mock("../src/api/githubGraphql", () => ({
  makeGraphQLClient: jest.fn(() => jest.fn()),
  graphqlWithRetry: jest.fn(),
}));
jest.mock("../src/auth/getAuthStrategy", () => ({
  getAuthStrategy: jest.fn(() => async () => "token"),
}));

import { fetchOrgRepos } from "../src/collectors/orgRepos";
import { graphqlWithRetry } from "../src/api/githubGraphql";

const mockRetry = graphqlWithRetry as jest.Mock;

describe("fetchOrgRepos", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetches repos with pagination", async () => {
    mockRetry
      .mockResolvedValueOnce({
        organization: {
          repositories: {
            pageInfo: { hasNextPage: true, endCursor: "c1" },
            nodes: [{ nameWithOwner: "org/repo1" }],
          },
        },
      })
      .mockResolvedValueOnce({
        organization: {
          repositories: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ nameWithOwner: "org/repo2" }],
          },
        },
      });

    const repos = await fetchOrgRepos({ org: "org", auth: "token" });
    expect(repos).toEqual(["org/repo1", "org/repo2"]);
    expect(mockRetry).toHaveBeenCalledTimes(2);
  });

  it("returns empty array for org with no repos", async () => {
    mockRetry.mockResolvedValueOnce({
      organization: {
        repositories: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [],
        },
      },
    });

    const repos = await fetchOrgRepos({ org: "empty-org", auth: "token" });
    expect(repos).toEqual([]);
  });
});
