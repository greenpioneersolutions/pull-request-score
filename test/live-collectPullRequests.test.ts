const token = process.env["GITHUB_TOKEN"];

(token ? describe : describe.skip)("collectPullRequests live", () => {
  it("fetches pull requests using the real GitHub API", async () => {
    // @ts-expect-error compiled JS has no types
    const { collectPullRequests } = await import("../dist/collectors/pullRequests.js");
    const prs = await collectPullRequests({
      owner: "octocat",
      repo: "Hello-World",
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      auth: token!,
    });
    expect(Array.isArray(prs)).toBe(true);
  });
});
