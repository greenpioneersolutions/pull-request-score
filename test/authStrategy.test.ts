import { getAuthStrategy } from "../src/auth/getAuthStrategy.js";
import { makeGraphQLClient } from "../src/api/githubGraphql.js";

const requestMock: any = jest.fn().mockResolvedValue({
  data: [{ id: 123, account: { login: "me" } }],
});
requestMock.defaults = () => requestMock;

jest.mock("@octokit/auth-app", () => ({
  createAppAuth: () =>
    jest.fn(async (opts: any) => {
      if (opts.type === "app") return { token: "jwt" };
      return { token: "app-token" };
    }),
}));

jest.mock("@octokit/request", () => ({ request: requestMock }));

jest.mock("@octokit/core", () => ({
  Octokit: class {
    public request = jest.fn();
    public graphql = jest.fn();
    static plugin() {
      return this;
    }
  },
}));

var graphqlFn: any;
jest.mock("@octokit/graphql", () => {
  graphqlFn = jest.fn().mockResolvedValue({});
  graphqlFn.defaults = jest.fn(() => graphqlFn);
  graphqlFn.endpoint = jest.fn();
  return { graphql: graphqlFn };
});
jest.mock("@octokit/plugin-throttling", () => ({ throttling: {} }));

beforeEach(() => {
  process.env["GH_APP_ID"] = "1";
  process.env["GH_APP_PK"] = "pk";
});

afterEach(() => {
  jest.clearAllMocks();
  delete process.env["GH_APP_ID"];
  delete process.env["GH_APP_PK"];
});

test("GraphQL client uses app token", async () => {
  const authStrategy = getAuthStrategy({ owner: "me", token: "pat" });
  const client = makeGraphQLClient({ authStrategy });
  await client("{ test }");
  expect(graphqlFn).toHaveBeenCalledWith(
    "{ test }",
    expect.objectContaining({
      headers: { authorization: "token app-token" },
    }),
  );
});
