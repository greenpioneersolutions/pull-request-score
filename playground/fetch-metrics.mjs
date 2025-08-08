import { collectPullRequests, calculateMetrics } from "../dist/index.js";
import { pathToFileURL } from "url";

export async function fetchMetrics(repoArg = "octocat/Hello-World") {
  const [owner, repo] = repoArg.split("/");
  const token = process.env.GH_TOKEN;
  if (!token) {
    throw new Error("Set GH_TOKEN environment variable to a GitHub token");
  }
  const prs = await collectPullRequests({
    owner,
    repo,
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    auth: token,
  });
  return calculateMetrics(prs);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  fetchMetrics(process.argv[2])
    .then((m) => console.log(JSON.stringify(m, null, 2)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
