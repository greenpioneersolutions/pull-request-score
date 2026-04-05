jest.mock("@octokit/request", () => ({
  request: jest.fn(),
}));
jest.mock("../src/api/rateLimiter", () => ({
  createRateLimiter: () => async <T>(fn: () => Promise<T>) => fn(),
}));

import { request } from "@octokit/request";
import { collectPrFiles, collectFilesForPrs } from "../src/collectors/prFiles";

const mockRequest = request as unknown as jest.Mock;

function githubFileResponse(filename: string, patch?: string) {
  return {
    sha: "abc",
    filename,
    status: "modified",
    additions: 5,
    deletions: 2,
    changes: 7,
    patch: patch ?? "@@ -1 +1 @@\n-old\n+new",
    previous_filename: undefined,
  };
}

describe("collectPrFiles", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetches files for a PR", async () => {
    mockRequest.mockResolvedValueOnce({
      data: [githubFileResponse("src/index.ts")],
    });

    const files = await collectPrFiles({
      owner: "org",
      repo: "repo",
      prNumber: 1,
      auth: "token",
    });

    expect(files).toHaveLength(1);
    expect(files[0]!.filename).toBe("src/index.ts");
    expect(files[0]!.patch).toBeDefined();
    expect(mockRequest).toHaveBeenCalledWith(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
      expect.objectContaining({
        owner: "org",
        repo: "repo",
        pull_number: 1,
      }),
    );
  });

  it("paginates when 100 files returned", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) =>
      githubFileResponse(`file${i}.ts`),
    );
    const page2 = [githubFileResponse("file100.ts")];

    mockRequest
      .mockResolvedValueOnce({ data: page1 })
      .mockResolvedValueOnce({ data: page2 });

    const files = await collectPrFiles({
      owner: "org",
      repo: "repo",
      prNumber: 1,
      auth: "token",
    });

    expect(files).toHaveLength(101);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it("strips patches when skipPatches is set", async () => {
    mockRequest.mockResolvedValueOnce({
      data: [githubFileResponse("src/index.ts", "some diff")],
    });

    const files = await collectPrFiles({
      owner: "org",
      repo: "repo",
      prNumber: 1,
      auth: "token",
      skipPatches: true,
    });

    expect(files[0]!.patch).toBeUndefined();
  });

  it("uses cache when available", async () => {
    const cached = [{ sha: "x", filename: "cached.ts", status: "modified" as const, additions: 1, deletions: 0, changes: 1 }];
    const cache: import("../src/cache/CacheStore").CacheStore = {
      get: jest.fn(() => cached) as any,
      set: jest.fn(),
    };

    const files = await collectPrFiles({
      owner: "org",
      repo: "repo",
      prNumber: 1,
      auth: "token",
      cache,
    });

    expect(files).toEqual(cached);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("writes to cache after fetch", async () => {
    const cache: import("../src/cache/CacheStore").CacheStore = {
      get: jest.fn(() => undefined) as any,
      set: jest.fn(),
    };
    mockRequest.mockResolvedValueOnce({
      data: [githubFileResponse("src/index.ts")],
    });

    await collectPrFiles({
      owner: "org",
      repo: "repo",
      prNumber: 1,
      auth: "token",
      cache,
    });

    expect(cache.set).toHaveBeenCalledWith(
      "files:org/repo/1",
      expect.any(Array),
      expect.any(Number),
    );
  });
});

describe("collectFilesForPrs", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetches files for multiple PRs", async () => {
    mockRequest
      .mockResolvedValueOnce({ data: [githubFileResponse("a.ts")] })
      .mockResolvedValueOnce({ data: [githubFileResponse("b.ts")] });

    const prs = [
      { number: 1 } as any,
      { number: 2 } as any,
    ];
    const progress = jest.fn();
    const result = await collectFilesForPrs(
      prs,
      { owner: "org", repo: "repo", auth: "token" },
      progress,
    );

    expect(result.size).toBe(2);
    expect(result.get(1)![0]!.filename).toBe("a.ts");
    expect(result.get(2)![0]!.filename).toBe("b.ts");
    expect(progress).toHaveBeenCalledWith(1, 2);
    expect(progress).toHaveBeenCalledWith(2, 2);
  });
});
