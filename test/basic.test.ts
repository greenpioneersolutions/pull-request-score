jest.mock("../src/api/githubGraphql.js", () => ({
  makeGraphQLClient: () => jest.fn(),
}));
import { collectPullRequests } from "../src/collectors/pullRequests";

describe("collectPullRequests", () => {
  it("is a function", () => {
    expect(typeof collectPullRequests).toBe("function");
  });
});
