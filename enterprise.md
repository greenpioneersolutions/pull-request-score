# Enterprise Guide

This guide covers how engineering organizations can adopt `pull-request-score`
to measure, track, and improve their software delivery process. It covers use
cases for different roles, metric interpretation, monorepo strategies, CI/CD
integration, and team configuration patterns.

---

## Table of Contents

- [Who Is This For?](#who-is-this-for)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Use Cases by Role](#use-cases-by-role)
  - [Engineering Managers](#engineering-managers)
  - [Tech Leads and Staff Engineers](#tech-leads-and-staff-engineers)
  - [Individual Developers](#individual-developers)
  - [Platform and DevOps Teams](#platform-and-devops-teams)
- [Understanding the Metrics](#understanding-the-metrics)
  - [Delivery Speed](#delivery-speed)
  - [Review Health](#review-health)
  - [CI/CD Reliability](#cicd-reliability)
  - [Code Quality Signals](#code-quality-signals)
  - [Per-PR Scores](#per-pr-scores)
- [Monorepo Strategies](#monorepo-strategies)
  - [Label-Based Team Filtering](#label-based-team-filtering)
  - [Team Configuration Files](#team-configuration-files)
  - [Combining Labels and Teams](#combining-labels-and-teams)
- [Multi-Repo and Org-Wide Analysis](#multi-repo-and-org-wide-analysis)
- [Trend Comparison](#trend-comparison)
- [CI/CD Integration](#cicd-integration)
  - [GitHub Actions Weekly Report](#github-actions-weekly-report)
  - [Posting to Slack](#posting-to-slack)
  - [Storing Historical Data](#storing-historical-data)
- [Custom Scorecards](#custom-scorecards)
- [Interpreting the Numbers](#interpreting-the-numbers)
  - [What Good Looks Like](#what-good-looks-like)
  - [Common Anti-Patterns](#common-anti-patterns)
  - [Using Scores Responsibly](#using-scores-responsibly)

---

## Who Is This For?

`pull-request-score` is designed for engineering organizations of any size that
use GitHub (cloud or Enterprise Server) for code review. It is most valuable
when you have:

- Multiple teams contributing to shared repositories
- A desire to measure DORA-like metrics without buying a vendor platform
- Monorepos where different teams need their own views
- A need to track improvement over time with period-over-period comparison
- Engineering leadership that wants data-driven conversations about process

---

## Getting Started

Install the package or run it directly with `npx`:

```bash
# Install globally
npm install -g pull-request-score

# Or run on demand
npx gh-pr-metrics my-org/my-repo --since 30d --token $GH_TOKEN
```

For GitHub Enterprise Server, add the `--base-url` flag:

```bash
npx gh-pr-metrics my-org/my-repo --since 30d --token $GH_TOKEN \
  --base-url https://github.mycompany.com/api/v3
```

---

## Authentication

### Personal Access Token (PAT)

The simplest approach. Create a token with `repo` scope and pass it via
`--token` or the `GH_TOKEN` environment variable.

```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
npx gh-pr-metrics my-org/my-repo --since 30d
```

### GitHub App (recommended for organizations)

GitHub Apps provide fine-grained permissions and higher rate limits. Set the
`GH_APP_ID` and `GH_APP_PK` environment variables (or use `--app-id` and
`--app-private-key`):

```bash
export GH_APP_ID=123456
export GH_APP_PK=$(cat /path/to/private-key.pem)
npx gh-pr-metrics my-org/my-repo --since 30d
```

The tool will automatically generate a JWT, find the installation for your org,
and request an installation token with repository access.

---

## Use Cases by Role

### Engineering Managers

**Goal:** Understand team health, identify bottlenecks, and track improvement.

**Weekly team health report:**

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN \
  --group-by author --compare
```

This gives you:

- **Per-author metrics** — who is shipping, who might be overloaded, who needs
  pairing support. Look at PR count, cycle time, and average score per author.
- **Trend comparison** — are things getting better or worse vs. last week?
  The `comparison.deltas` section shows percentage changes for every metric.
- **Per-PR scores** — quickly spot the best and worst PRs. Use `--top 5
  --bottom 5` to surface outliers in standups.

**Monthly team comparison across repos:**

```bash
npx gh-pr-metrics my-org/api,my-org/web,my-org/mobile \
  --since 30d --token $GH_TOKEN --group-by team \
  --team-config teams.json --compare
```

The output includes `perRepo` results for each repository, a combined rollup,
and team-level breakdowns. Use this to compare delivery velocity across squads.

**What to watch:**

| Metric | Healthy Range | Action If Outside |
|--------|--------------|-------------------|
| Cycle time (median) | < 24 hours | Review WIP limits, PR size |
| Pickup time (median) | < 4 hours | Adjust review norms, add reviewers |
| Merge rate | > 85% | Investigate abandoned PRs |
| Review coverage | > 90% | Enforce required reviews |
| Build success rate | > 95% | Invest in test infrastructure |
| Stale PR count | < 5 | Triage and close or merge |

### Tech Leads and Staff Engineers

**Goal:** Ensure code quality, review culture, and architectural standards.

**Review culture audit:**

```bash
npx gh-pr-metrics my-org/core-platform --since 30d --token $GH_TOKEN \
  --group-by author
```

Look at:

- **Review coverage** — are PRs getting reviews before merge?
- **Comment density** — are reviews substantive or rubber-stamps?
- **Change request ratio** — how often are reviewers pushing back? Too low
  might mean rubber-stamping; too high might mean unclear standards.
- **Reviewer count per PR** — is knowledge spreading or are the same 2 people
  reviewing everything?

**Identifying oversized PRs:**

The output includes an `outsizedPrs` list (PR numbers exceeding 1000 lines by
default) and `outsizedPrRatio`. If this ratio is above 10-15%, it's worth
having a conversation about breaking work into smaller increments.

**Per-PR scoring for code review:**

```bash
npx gh-pr-metrics my-org/core-platform --since 7d --token $GH_TOKEN \
  --bottom 10
```

The bottom-scored PRs are the ones most likely to have quality issues — long
cycle times, no reviews, failed CI, large diffs. Use this list to prioritize
retroactive review or post-merge discussion.

### Individual Developers

**Goal:** Understand your own contribution patterns and improve.

```bash
npx gh-pr-metrics my-org/api --since 30d --token $GH_TOKEN \
  --group-by author | jq '.authorMetrics[] | select(.author == "myusername")'
```

Your author metrics include:

- **PR count** — how many PRs you shipped
- **Cycle time** — median and p95 for how long your PRs take to merge
- **Pickup time** — how quickly your PRs get their first review
- **Average score** — your average per-PR score across all PRs
- **Merge rate** — what percentage of your PRs successfully merge

If your cycle time is high but pickup time is low, the bottleneck is in the
review-to-merge phase — perhaps addressing review feedback faster or breaking
PRs into smaller pieces would help.

If pickup time is high, consider tagging reviewers explicitly or posting in
your team's channel when a PR is ready.

### Platform and DevOps Teams

**Goal:** Monitor CI health, build times, and infrastructure reliability.

```bash
npx gh-pr-metrics --org my-org --since 7d --token $GH_TOKEN \
  --format csv --output weekly-metrics.csv
```

Key metrics for platform teams:

- **Build success rate** — across the entire org, what percentage of CI runs
  pass? A drop here often signals infrastructure issues, flaky tests, or
  dependency problems.
- **Average CI duration** — is CI getting slower? Track this weekly. A gradual
  increase is normal as the codebase grows, but sudden jumps indicate problems.
- **Hotfix frequency** — how often are teams shipping emergency fixes? High
  hotfix rates suggest gaps in testing or staging environments.

---

## Understanding the Metrics

### Delivery Speed

| Metric | What It Tells You |
|--------|-------------------|
| **Cycle time** | Total time from PR creation to merge. The single most important delivery metric. |
| **Pickup time** | Time until the first review. Measures team responsiveness. |
| **Stale PR count** | Open PRs with no activity. Work that's stuck. |
| **PR backlog** | Total open PRs. A growing backlog signals capacity issues. |

**Cycle time** is measured in hours from `createdAt` to `mergedAt`. For most
teams, a healthy median is under 24 hours. If your p95 is over a week, you
likely have a long tail of PRs that sit in review for too long.

**Pickup time** is measured from `createdAt` to the first review submission.
Under 4 hours is excellent. Over 24 hours means reviewers are not checking
their queues frequently enough.

### Review Health

| Metric | What It Tells You |
|--------|-------------------|
| **Review coverage** | Percentage of PRs that received at least one review. |
| **Reviewer count** | Number of unique reviewers per PR. |
| **Change request ratio** | Percentage of reviews that request changes. |
| **Discussion coverage** | PRs with 10+ comments and 3+ commenters. |
| **Comment density** | Comments per line changed. |
| **Comment quality** | Ratio of substantive comments (5+ words). |

A high **change request ratio** (above 40%) might indicate that PRs are being
opened before they're ready, or that standards aren't well communicated. A very
low ratio (under 5%) could mean reviews are perfunctory.

**Discussion coverage** captures PRs where real collaborative discussion
happened. If this is near zero, reviews might be happening but they're
superficial.

### CI/CD Reliability

| Metric | What It Tells You |
|--------|-------------------|
| **Build success rate** | Fraction of check suites that pass. |
| **Average CI duration** | Mean build time in seconds. |
| **CI pass rate** (per-PR) | Success rate for an individual PR's CI runs. |

Track **build success rate** weekly. A healthy org is above 95%. Below 90%
means developers are regularly waiting for broken builds, which destroys
flow.

**CI duration** matters more than most teams realize. If your median build
takes 20 minutes, every PR has a built-in 20-minute delay before merge. Fast
CI (under 10 minutes) enables faster cycle times.

### Code Quality Signals

| Metric | What It Tells You |
|--------|-------------------|
| **Outsized PR ratio** | Percentage of PRs over the size threshold. |
| **Size bucket** | Per-PR: S (< 50 lines), M (50-399), L (400+). |
| **Revert rate** | Fraction of commits containing "revert". |
| **Hotfix frequency** | PRs with hotfix-related labels. |

**Outsized PRs** are the number one predictor of review quality problems. PRs
over 500 lines receive less thorough review. If your outsized ratio is above
15%, focus on helping developers break work into smaller increments.

**Revert rate** is a lagging indicator of quality. Frequent reverts suggest
either inadequate testing or premature merges. Combine with CI pass rate to
understand the full picture.

### Per-PR Scores

Every PR receives a score from 0 to 100 based on a built-in scorecard. The
default scorecard weights:

| Factor | Weight | What Scores Well |
|--------|--------|-----------------|
| Cycle time | 20% | Merged in < 4 hours |
| Pickup time | 15% | First review in < 2 hours |
| CI pass rate | 15% | All checks passing |
| Reviewer count | 10% | 3+ reviewers |
| Change request ratio | 10% | Low change-request rate |
| Idle time | 10% | < 4 hours of idle gaps |
| Size (lines changed) | 10% | < 50 lines changed |
| Revert rate | 10% | No reverts |

A score above 80 represents a well-executed PR: small, fast, reviewed, and
green CI. A score below 40 typically indicates a PR with multiple problems —
large diff, slow review, or failed CI.

---

## Monorepo Strategies

Monorepos present a unique challenge: all teams share one repository, so
unfiltered metrics are meaningless per-team. `pull-request-score` provides
multiple strategies for slicing the data.

### Label-Based Team Filtering

The most common approach. Teams add labels to their PRs (e.g., `team-payments`,
`team-platform`, `team-mobile`) and you filter with `--include-labels`:

```bash
# Payments team metrics
npx gh-pr-metrics my-org/monorepo --since 30d --token $GH_TOKEN \
  --include-labels team-payments

# Platform team metrics
npx gh-pr-metrics my-org/monorepo --since 30d --token $GH_TOKEN \
  --include-labels team-platform

# Exclude bot-generated PRs
npx gh-pr-metrics my-org/monorepo --since 30d --token $GH_TOKEN \
  --exclude-labels automated,bot
```

Label filtering happens after fetching, so the same cached data can be reused
across multiple team queries by enabling `--use-cache`:

```bash
# First run caches the data
npx gh-pr-metrics my-org/monorepo --since 30d --token $GH_TOKEN \
  --use-cache --include-labels team-payments

# Second run reuses cached GraphQL responses
npx gh-pr-metrics my-org/monorepo --since 30d --token $GH_TOKEN \
  --use-cache --include-labels team-platform
```

### Team Configuration Files

For author-level grouping, create a `teams.json` file mapping GitHub usernames
to team names:

```json
{
  "alice": "payments",
  "bob": "payments",
  "carol": "platform",
  "dave": "platform",
  "eve": "mobile",
  "frank": "mobile"
}
```

Then use `--group-by team --team-config teams.json`:

```bash
npx gh-pr-metrics my-org/monorepo --since 30d --token $GH_TOKEN \
  --group-by team --team-config teams.json
```

The output includes a `teamMetrics` array with per-team aggregates:

```json
{
  "teamMetrics": [
    {
      "team": "payments",
      "members": ["alice", "bob"],
      "prCount": 42,
      "cycleTime": { "median": 8.2, "p95": 48.1 },
      "pickupTime": { "median": 2.1, "p95": 12.5 },
      "mergeRate": 0.95,
      "reviewCoverage": 1.0,
      "buildSuccessRate": 0.98,
      "averageScore": 76.3
    }
  ]
}
```

### Combining Labels and Teams

For the most granular control, combine both approaches:

```bash
# Get team-level metrics for just the backend services
npx gh-pr-metrics my-org/monorepo --since 30d --token $GH_TOKEN \
  --include-labels backend --group-by team --team-config teams.json
```

This filters to PRs with the `backend` label, then groups those PRs by the
team mapping. Useful when your monorepo has both label-based area ownership and
author-based team membership.

---

## Multi-Repo and Org-Wide Analysis

### Multiple specific repos

Pass comma-separated repos to analyze them together:

```bash
npx gh-pr-metrics my-org/api,my-org/web,my-org/mobile \
  --since 30d --token $GH_TOKEN
```

The output includes:

- **Top-level results** — combined metrics across all repos
- **`perRepo`** — individual metrics for each repository

```json
{
  "cycleTime": { "median": 12.5, "p95": 72.0 },
  "aggregateMetrics": { "mergeRate": 0.91 },
  "prScores": [],
  "perRepo": {
    "my-org/api": { "cycleTime": { "median": 8.0 }, "aggregateMetrics": {} },
    "my-org/web": { "cycleTime": { "median": 15.2 }, "aggregateMetrics": {} },
    "my-org/mobile": { "cycleTime": { "median": 22.1 }, "aggregateMetrics": {} }
  }
}
```

### Entire organization

Use `--org` to automatically discover and analyze all repositories:

```bash
npx gh-pr-metrics --org my-org --since 7d --token $GH_TOKEN
```

This queries the GitHub API for all repositories under the organization and
collects PRs from each one. The output structure is the same as multi-repo
(combined + perRepo).

For large organizations with hundreds of repos, combine with `--use-cache` and
`--resume` to handle rate limits and interruptions gracefully:

```bash
npx gh-pr-metrics --org my-org --since 30d --token $GH_TOKEN \
  --use-cache --resume --progress
```

---

## Trend Comparison

The `--compare` flag fetches two time periods and shows how metrics changed:

```bash
# Compare last 30 days to the previous 30 days
npx gh-pr-metrics my-org/api --since 30d --token $GH_TOKEN --compare

# Compare last 7 days to a custom previous period of 14 days
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN --compare 14d
```

The output includes a `comparison` section:

```json
{
  "comparison": {
    "current": { "cycleTime": { "median": 10 }, "aggregateMetrics": {} },
    "previous": { "cycleTime": { "median": 14 }, "aggregateMetrics": {} },
    "deltas": {
      "cycleTime.median": {
        "current": 10,
        "previous": 14,
        "absoluteDelta": -4,
        "percentageChange": -28.57
      },
      "aggregateMetrics.mergeRate": {
        "current": 0.92,
        "previous": 0.85,
        "absoluteDelta": 0.07,
        "percentageChange": 8.24
      }
    }
  }
}
```

Use trend comparison for:

- **Sprint retrospectives** — compare this sprint to last sprint
- **Post-incident reviews** — compare the week after an incident to the week
  before
- **Process change validation** — did that new review policy actually improve
  pickup time?
- **Quarterly reviews** — compare Q1 to Q2 at the leadership level

---

## CI/CD Integration

### GitHub Actions Weekly Report

Add a scheduled workflow to collect metrics every week:

```yaml
name: Weekly PR Metrics
on:
  schedule:
    - cron: '0 8 * * FRI'  # Every Friday at 8am UTC
  workflow_dispatch: {}

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install
      - run: |
          npx gh-pr-metrics ${{ github.repository }} \
            --since 7d --token ${{ secrets.GITHUB_TOKEN }} \
            --format json --output metrics/$(date +%Y-%m-%d).json \
            --compare --group-by author
      - run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add metrics/
          git commit -m "chore(metrics): weekly report $(date +%Y-%m-%d)" || true
          git push
```

### Posting to Slack

The project includes a `scripts/postToSlack.ts` script that formats metrics as
Slack blocks. You can also pipe the JSON output to any webhook:

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN \
  --format json --output metrics.json

npx ts-node scripts/postToSlack.ts metrics.json
```

Or build your own Slack integration with the library:

```ts
import { collectPullRequests, calculateMetrics, stats } from 'pull-request-score'

const prs = await collectPullRequests({ /* ... */ })
const metrics = calculateMetrics(prs)

await fetch(process.env.SLACK_WEBHOOK_URL!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: `Weekly metrics: merge rate ${(metrics.mergeRate * 100).toFixed(0)}%, ` +
          `review coverage ${(metrics.reviewCoverage * 100).toFixed(0)}%, ` +
          `${metrics.stalePrCount} stale PRs`
  }),
})
```

### Storing Historical Data

For tracking trends over months, write metrics to a file per period:

```bash
# Weekly snapshot
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN \
  --format json --output "metrics/$(date +%Y-W%V).json"
```

Or store in a database by reading the JSON output programmatically:

```ts
import { collectPullRequests, calculateMetrics } from 'pull-request-score'

const prs = await collectPullRequests({ /* ... */ })
const metrics = calculateMetrics(prs)

// Insert into your data warehouse, Postgres, BigQuery, etc.
await db.insert('pr_metrics', {
  date: new Date(),
  repo: 'my-org/api',
  merge_rate: metrics.mergeRate,
  review_coverage: metrics.reviewCoverage,
  build_success_rate: metrics.buildSuccessRate,
  stale_pr_count: metrics.stalePrCount,
})
```

---

## Custom Scorecards

The default scorecard covers common use cases, but enterprises often have
specific priorities. You can build custom scoring rules:

```ts
import {
  collectPullRequests,
  scorePr,
  createRangeNormalizer,
} from 'pull-request-score'
import type { ScoreRule } from 'pull-request-score'
import type { PrMetricsSnapshot } from 'pull-request-score'

// Stricter cycle time expectations for a fast-shipping team
const cycleTimeNorm = createRangeNormalizer(
  [
    { max: 2, score: 100 },   // < 2 hours = perfect
    { max: 8, score: 80 },    // < 8 hours = good
    { max: 24, score: 50 },   // < 1 day = okay
  ],
  20,                          // anything slower
)

const customRules: ScoreRule<PrMetricsSnapshot>[] = [
  { metric: 'cycleTimeHours', weight: 0.30, normalize: v => cycleTimeNorm(v) },
  { metric: 'ciPassRate', weight: 0.25, normalize: v => v * 100 },
  { metric: 'pickupTimeHours', weight: 0.20, normalize: v => cycleTimeNorm(v) },
  { fn: m => Math.min(m.reviewerCount ?? 0, 2) / 2, weight: 0.15, normalize: v => v * 100 },
  { metric: 'revertRate', weight: 0.10, normalize: v => (1 - v) * 100 },
]

const prs = await collectPullRequests({ /* ... */ })
const scores = prs.map(pr => scorePr(pr, customRules))
```

---

## Interpreting the Numbers

### What Good Looks Like

These benchmarks come from industry research (DORA, Google's DevOps report)
and are intentionally broad. Your mileage will vary based on team size,
codebase complexity, and deployment frequency.

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Cycle time (median) | < 4h | < 24h | < 72h | > 1 week |
| Pickup time (median) | < 1h | < 4h | < 12h | > 24h |
| Merge rate | > 95% | > 85% | > 70% | < 70% |
| Review coverage | 100% | > 90% | > 70% | < 70% |
| Build success rate | > 99% | > 95% | > 85% | < 85% |
| Outsized PR ratio | < 5% | < 15% | < 30% | > 30% |
| Per-PR score (avg) | > 85 | > 70 | > 50 | < 50 |

### Common Anti-Patterns

**High cycle time but low pickup time:** The bottleneck is between first
review and merge. Common causes: back-and-forth on review feedback, waiting for
CI, waiting for a second approval. Fix: clearer PR standards, faster CI,
reduce required approvals for low-risk changes.

**High merge rate but high revert rate:** PRs are merging fast but then getting
reverted. Suggests inadequate testing or rubber-stamp reviews. Fix: enforce CI
gates, improve test coverage, require more reviewers for critical paths.

**Low review coverage with high build success rate:** CI is passing but humans
aren't reviewing. This is a process gap, not a quality one. The code might be
fine today, but knowledge isn't spreading and subtle issues aren't getting
caught. Fix: require at least one approval before merge.

**High outsized PR ratio with low comment density:** Large PRs are going in
with minimal review. This is the highest-risk pattern. Fix: set PR size
guidelines, break features into incremental PRs, use feature flags.

**Uneven author metrics:** One or two people ship 80% of PRs while others
ship very few. This creates bus factor risk and can indicate team dysfunction.
Fix: pair programming, rotate ownership, distribute review assignments.

### Using Scores Responsibly

PR scores and author metrics are tools for understanding process, not for
evaluating individual performance. Used well, they illuminate systemic issues:

- A team with consistently low scores likely has a process problem (too few
  reviewers, slow CI, unclear standards), not a people problem.
- Compare a team against itself over time, not against other teams. Different
  codebases have different complexity profiles.
- Use `--bottom` to find PRs that need attention, not to name and shame.
- Share metrics transparently with the team. Metrics that only managers see
  create distrust.
- Focus on trends, not absolute values. Improving from 50 to 65 matters more
  than being at 80.

The goal is to help teams ship better software faster, not to create a
leaderboard. If the metrics are causing anxiety instead of insight, revisit how
they're being presented and discussed.
