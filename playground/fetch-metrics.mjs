import { collectPullRequests, calculateMetrics } from "../dist/index.js";

const repoArg = process.argv[2] || "octocat/Hello-World";
const [owner, repo] = repoArg.split("/");
const token = process.env.GH_TOKEN;

if (!token) {
  console.error("Set GH_TOKEN environment variable to a GitHub token");
  process.exit(1);
}

async function main() {
  const prs = await collectPullRequests({
    owner,
    repo,
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    auth: token,
  });
  const metrics = calculateMetrics(prs);
  console.log(JSON.stringify(metrics, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
