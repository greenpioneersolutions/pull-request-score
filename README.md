# pull-request-score

1  Why focus on Pull‑Requests?
Independent studies of ~1 million PRs highlight review wait‑time as the #1 bottleneck in cycle time (‑4 days on average before the first pickup). Teams that keep review turnaround under ≤12 h rank among the industry’s “elite” performers. 
linearb.io

Commercial analytics platforms (LinearB, Code Climate Velocity, Pluralsight Flow, Haystack, Swarmia, Waydev, etc.) all anchor their productivity dashboards on PR signals such as cycle time, review depth, and merge success rate. 
linearb.io
docs.velocity.codeclimate.com
docs.velocity.codeclimate.com
docs.velocity.codeclimate.com

2  What the GitHub APIs already expose
Capability	GraphQL v4	REST v3	Notes
Pull Request metadata (author, state, labels, draft flag, merge base, mergeable)	PullRequest object fields (e.g., state, isDraft, mergedAt, mergeable) 
docs.github.com
GET /repos/{owner}/{repo}/pulls	GraphQL lets you request everything in one round‑trip, keeping rate‑limit cost low.
Reviews & approvals	reviews(first:100){ state author createdAt }	GET /pulls/{num}/reviews	Needed for first‑review latency, reviewer count, approval cadence.
Review & issue comments	comments connection	GET /issues/{num}/comments	Enables “discussion density” metric.
Commits & diff stats	commits{ commit{ committedDate } }, additions, deletions, changedFiles	GET /pulls/{num}/commits, .../files	Needed for PR size, churn and follow‑up pushes.
Checks / CI	commits{ commit{ statusCheckRollup } }	GET /repos/{owner}/{repo}/commits/{sha}/check-runs	Lets you calculate pass‑rate and flaky‑failure rate.
Timeline events	timelineItems connection	GET /issues/{num}/timeline (preview)	Surfaces “review requested”, “ready for review”, “auto‑merge enabled”, etc.

Enterprise parity – All endpoints above exist on GitHub Enterprise Server ≥ 3.13 
docs.github.com
. Only the base URL changes.

3  Metric catalogue (baseline + stretch)
3.1 Speed
Metric	Definition	Insight
PR Cycle Time	mergedAt – createdAt	End‑to‑end delivery speed.
Pickup Time	firstReviewAt – createdAt	How fast reviewers react.
Review Turnaround	mergedAt – firstApprovalAt	Latency after sign‑off.
Idle Spans	Total time PR spent with no commits and no reviews.	Hidden queues.

3.2 Collaboration
Metric	Definition
Reviewer Count	Unique review authors per PR.
Cross‑team Review Rate	% reviews from outside author’s team (requires mapping file).
Comment Density	(issueComments + reviewComments) / changedFiles.

3.3 Quality / Risk
Metric	Definition
Size Buckets	S, M, L based on LOC Δ (thresholds configurable).
Iterative Rework	# of additional pushes after first review.
Change‑Request Ratio	# reviews state==CHANGES_REQUESTED / total reviews.
Success Rate	mergedPRs / (closed + merged) 
docs.velocity.codeclimate.com
Revert Rate	% merges reverted within 48 h (requires commit‑graph scan).

3.4 Workflow / CI
Metric	Definition
CI Pass Rate	successful workflows / total runs on PR branch.
Repeated Failures	Median # reruns to reach green.

All formulas will be implemented as pure functions so your team can derive or weight them any way you like.

4  Existing tooling landscape & gaps
Tool	Licence	Strengths	Limitations (for our purpose)
GitHub “Insights” (built‑in)	Native	basic PR graphs	no programmatic export
Apache DevLake 
github.com
devlake.apache.org
Apache‑2.0	full ETL + dashboards, DORA bundles	heavy DB footprint; 👷‍♂ not a light NPM lib
LinearB	SaaS	automatic team heuristics	closed source; cost per dev
Code Climate Velocity	SaaS	review depth, risk flags	closed source; coarse API
gitinspector / git‑quick‑stats	MIT	commit‑level, CLI	no PR coverage
Augur, GrimoireLab	Apache‑2.0	rich community metrics	steep learning curve

Opportunity: a lightweight, embeddable TypeScript SDK that yields just the numbers, ready for BI pipes (Looker, Power BI) or Slack bots, without forcing a storage backend.

5  Package architecture proposal
pgsql
Copy
@gh-pr-metrics/
├─ src/
│  ├─ api/
│  │   ├─ githubGraphql.ts   // thin Octokit wrapper
│  │   └─ rateLimiter.ts     // @octokit/plugin-throttling
│  ├─ collectors/
│  │   └─ pullRequests.ts    // pagination, ETag caching
│  ├─ calculators/
│  │   ├─ cycleTime.ts
│  │   ├─ reviewMetrics.ts
│  │   └─ ciMetrics.ts
│  ├─ models/                // TS types ↔ GitHub schema
│  ├─ output/
│  │   └─ writers.ts         // JSON, CSV, stdout
│  └─ cli.ts                 // `gh-pr-metrics --repo octo/hello`
├─ test/ (Jest)
├─ .github/workflows/ci.yml  // lint, unit tests, semantic‑release
└─ package.json              // ESM, Node 18, strict TS
Core design principles
GraphQL‑first – single batched query minimizes rate‑limit cost. 
docs.github.com

Stateless by default – metrics are calculated in‑memory; adapters for SQLite/Redis can be added later.

Plugin interface – each metric = MetricPlugin { slug, description, calculate(pr) }, enabling enterprise users to add proprietary KPIs.

Dual interface – importable API and zero‑config CLI.

Enterprise support – GITHUB_BASE_URL env variable routes to on‑prem servers; PAT or GitHub App JWT supported.

Type safety – auto‑generated GraphQL typings via @octokit/graphql-schema ensures compile‑time safety.

Security – token never written to disk; optional --no-cache flag for air‑gapped environments.

6  Example usage
ts
Copy
import { analyzeRepository } from '@gh-pr-metrics/core';

const metrics = await analyzeRepository({
  owner: 'acme-inc',
  repo: 'payments-api',
  auth: process.env.GH_TOKEN,         // PAT with `repo` scope
  since: '2024‑01‑01',                // ISO or daysBack
});

console.log(metrics.summary);
/*
{
  pullRequestCount: 412,
  medianCycleTimeHours: 26.3,
  p95PickupTimeHours: 9.1,
  approvalSaturation: 1.8,
  largePrRatio: 0.12,
  successRate: 0.97,
  ...
}
*/
CLI equivalent:

bash
Copy
npx gh-pr-metrics acme-inc/payments-api --since 90d --format csv > metrics.csv
7  Development roadmap
Sprint	Deliverables
0 (1 wk)	Repo bootstrap, MIT licence, Prettier/ESLint, Octokit core wrapper.
1 (2 wks)	Data collector (GraphQL pagination), JSON output, metrics: cycle time, pickup time, reviewer count.
2 (2 wks)	CI metrics, size buckets, success rate, CSV writer, CLI packaging.
3 (2 wks)	Plugin API, SQLite cache, GitHub App auth, enterprise base‑URL test matrix.
4 (2 wks)	Documentation site (Docusaurus), sample Looker Studio connector, 1.0.0 release via semantic‑release.
Backlog	GitLab adapter, Bitbucket adapter, Slack summarizer, DORA bundles, Grafana datasource, PR risk scoring ML experiment.

8  Metric definitions (canonical formulas)
slug	Calculation	Output unit
cycle_time	mergedAt – createdAt	hours
pickup_time	firstReviewSubmittedAt – createdAt	hours
review_iterations	count distinct sets where state==CHANGES_REQUESTED preceding APPROVED	integer
approval_count	reviews where state==APPROVED	integer
comment_density	(issueComments + reviewComments) / changedFiles	ratio
pr_size	additions + deletions	LOC
success_rate	merged / (closed + merged)	percentage
ci_pass_rate	successful check runs / total runs	percentage

(Metrics emitted per‑PR and aggregated by mean/median/p95.)

9  Comparing to open‑source alternatives
Apache DevLake offers hundreds of metrics and dashboards out‑of‑box but assumes you will run a Postgres + Grafana stack and ETL nightly. If you only need programmatic numbers, DevLake is over‑kill. 
github.com
devlake.apache.org

Smaller CLI tools (git‑quick‑stats, gitinspector) ignore the PR workflow entirely; they operate on commit history only.

Your package fills the SDK gap: drop‑in, infra‑light, TypeScript‑native, embeddable in scripts, CI, or backstage plugins.

10  Next steps for internal rollout
Pilot – Run the CLI against one high‑traffic repo for the past 90 days; export to CSV and share findings with the team.

Baseline – Agree internally on thresholds (e.g., p50 cycle time ≤24 h, p95 pickup time ≤12 h).

Automate – Wire the package into a scheduled GitHub Action that posts weekly summaries to Slack or your BI warehouse.

Refine – Gather feedback; add or drop metrics via the plugin API.

Open‑source launch – Publish v1.0 on npm, announce on the GitHub Marketplace, and tag good‑first‑issue items to grow community adoption.

Final thought
Metrics should illuminate systems—not rank individuals. Use these numbers to expose queue time, bottlenecks, and collaboration patterns, then pair them with qualitative insights (retros, code reviews) for a data‑informed, human‑centric engineering culture.
