# pull-request-score

[![npm version](https://img.shields.io/npm/v/pull-request-score)](https://www.npmjs.com/package/pull-request-score)

Score, analyze, and track your team's pull requests. Get a 0-100 score for every
PR, find bottlenecks in your review process, and watch trends over time.

```bash
npx gh-pr-metrics my-org/my-repo --since 30d --token $GH_TOKEN
```

That one command gives you:

- A **0-100 score** for every PR based on cycle time, review quality, CI health, and size
- **Aggregate metrics** like merge rate, review coverage, build success rate, and stale PR count
- **Median and p95 stats** for cycle time and pickup time

---

## What does it actually tell me?

Here's a real example of what the output looks like for a single PR:

```json
{
  "prNumber": 142,
  "title": "feat: add user authentication",
  "author": "alice",
  "score": 78.5,
  "breakdown": {
    "cycleTimeHours": { "raw": 6.2, "normalized": 80, "weighted": 16 },
    "pickupTimeHours": { "raw": 1.5, "normalized": 100, "weighted": 15 },
    "ciPassRate": { "raw": 1.0, "normalized": 100, "weighted": 15 },
    "reviewerCount": { "raw": 0.67, "normalized": 67, "weighted": 6.7 },
    "linesChanged": { "raw": 180, "normalized": 80, "weighted": 8 }
  }
}
```

**Score 78.5** means: merged in 6 hours (good), picked up in 90 minutes
(great), CI passed (great), 2 of 3 ideal reviewers (okay), 180 lines changed
(reasonable). A score above 80 is a well-executed PR. Below 40 means something
went wrong.

And for the full repo:

```json
{
  "cycleTime": { "median": 12.5, "p95": 72.0 },
  "pickupTime": { "median": 3.2, "p95": 24.1 },
  "aggregateMetrics": {
    "mergeRate": 0.92,
    "reviewCoverage": 0.98,
    "buildSuccessRate": 0.96,
    "stalePrCount": 3,
    "outsizedPrRatio": 0.08
  }
}
```

**Translation:** Half your PRs merge in under 12.5 hours, 98% get reviewed, CI
passes 96% of the time, 3 PRs are stuck, and 8% of PRs are oversized.

---

## Quick Start

### Install

```bash
npm install -g pull-request-score
# or
pnpm add pull-request-score
# or just run it
npx gh-pr-metrics my-org/my-repo --since 30d --token $GH_TOKEN
```

**Requirements:** Node.js 18+

### See your top and bottom PRs

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN --top 5 --bottom 5
```

```ts
import { collectPullRequests, scorePr } from 'pull-request-score'

const prs = await collectPullRequests({
  owner: 'my-org', repo: 'api',
  since: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  auth: process.env.GH_TOKEN!,
})
const scores = prs.map(pr => scorePr(pr)).sort((a, b) => b.score - a.score)
console.log('Top 5:', scores.slice(0, 5))
console.log('Bottom 5:', scores.slice(-5))
```

### Compare this week to last week

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN --compare
```

```ts
import { collectPullRequests, calculateMetrics, parsePeriods, computeDeltas } from 'pull-request-score'

const periods = parsePeriods('7d')
const current = await collectPullRequests({ owner: 'my-org', repo: 'api', since: periods.current.since, auth: process.env.GH_TOKEN! })
const previous = await collectPullRequests({ owner: 'my-org', repo: 'api', since: periods.previous.since, until: periods.previous.until, auth: process.env.GH_TOKEN! })
const deltas = computeDeltas(calculateMetrics(current), calculateMetrics(previous))
console.log(deltas)
```

### See who's shipping what

```bash
npx gh-pr-metrics my-org/api --since 30d --token $GH_TOKEN --group-by author
```

```ts
import { collectPullRequests, calculateAuthorMetrics } from 'pull-request-score'

const prs = await collectPullRequests({ /* ... */ })
for (const a of calculateAuthorMetrics(prs)) {
  console.log(`${a.author}: ${a.prCount} PRs, avg score ${a.averageScore}`)
}
```

### Analyze multiple repos or an entire org

```bash
# Multiple repos
npx gh-pr-metrics my-org/api,my-org/web,my-org/mobile --since 30d --token $GH_TOKEN

# Entire org
npx gh-pr-metrics --org my-org --since 30d --token $GH_TOKEN
```

```ts
import { fetchOrgRepos, collectPullRequests, calculateMetrics } from 'pull-request-score'

const repos = await fetchOrgRepos({ org: 'my-org', auth: process.env.GH_TOKEN! })
for (const repo of repos) {
  const [owner, name] = repo.split('/')
  const prs = await collectPullRequests({ owner, repo: name, since: '2024-01-01T00:00:00Z', auth: process.env.GH_TOKEN! })
  console.log(`${repo}:`, calculateMetrics(prs).mergeRate)
}
```

### Analyze the actual code in a PR

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN --code-analysis --top 3
```

```ts
import { collectPullRequests, collectPrFiles, analyzePrFiles } from 'pull-request-score'

const prs = await collectPullRequests({ /* ... */ })
for (const pr of prs.slice(0, 3)) {
  const files = await collectPrFiles({ owner: 'my-org', repo: 'api', prNumber: pr.number, auth: process.env.GH_TOKEN! })
  const analysis = analyzePrFiles(files)
  console.log(`PR #${pr.number}: risk=${analysis.riskScore}, review=${analysis.reviewDepthSignal}`)
}
```

---

## Understanding the Metrics

### What's in the score?

Every PR gets a score from 0 to 100. Here's what the default scorecard evaluates:

| Factor | Weight | What scores well | What scores poorly |
|--------|--------|------------------|--------------------|
| Cycle time | 20% | Merged in < 4 hours | Sat open for a week |
| Pickup time | 15% | First review in < 2 hours | No review for 24+ hours |
| CI pass rate | 15% | All checks green | Failed builds |
| Reviewer count | 10% | 3+ reviewers | No reviewers |
| Change request ratio | 10% | Few change requests | Constant back-and-forth |
| Idle time | 10% | No long gaps between activity | Days of silence mid-PR |
| Size | 10% | Under 50 lines | 500+ line monster PRs |
| Revert rate | 10% | No reverts | Commits that undo previous work |

### Aggregate metrics explained

These are computed across all PRs in your time range:

| Metric | What it means | Healthy range |
|--------|--------------|---------------|
| **Cycle time** (median) | How long PRs take from open to merge | < 24 hours |
| **Pickup time** (median) | How long until the first review | < 4 hours |
| **Merge rate** | % of PRs that successfully merge | > 85% |
| **Review coverage** | % of PRs that get at least one review | > 90% |
| **Build success rate** | % of CI runs that pass | > 95% |
| **Stale PR count** | Open PRs with no activity for 30+ days | < 5 |
| **PR backlog** | Total open PRs right now | Depends on team size |
| **Outsized PR ratio** | % of PRs over 1000 lines | < 15% |
| **Hotfix frequency** | % of PRs labeled as hotfixes | < 5% |
| **Discussion coverage** | % of PRs with 10+ comments, 3+ commenters | Higher is better |
| **Comment density** | Comments per line changed | Engagement signal |
| **Average CI duration** | Mean build time in seconds | < 600s (10 min) |

### File-level code analysis

Enable with `--code-analysis` to get per-file insights:

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN --code-analysis --top 3
```

This adds to each PR score:

| Analysis | What it tells you |
|----------|-------------------|
| **Risk score** (0-100) | Does the PR touch auth, migrations, CI, or env files? |
| **Test hygiene** | Ratio of test changes to source changes. Missing tests flagged. |
| **Scope spread** | How many directories/modules are touched. Wide spread = harder review. |
| **Review depth signal** | "simple" (docs change, 1 reviewer ok), "complex", or "critical" (needs senior eyes) |
| **Security patterns** | Hardcoded secrets, `eval()`, SQL concatenation, disabled lint rules |
| **AI-generated signals** | Heuristic detection of uniform doc patterns, boilerplate repetition |
| **Code patterns** | New TODOs, console.logs, debug statements, commented-out code |

### AI review context

Use `--ai-context` to get a structured object you can pipe to any AI model:

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN --ai-context --top 1 \
  | jq '.prScores[0].aiContext'
```

The output contains the PR metadata, full file diffs, deterministic analysis,
and metrics snapshot. Everything an AI needs to review the PR. This
package does not call any AI itself. It gives you the data; your model does
the thinking.

---

## CLI Reference

```bash
npx gh-pr-metrics [owner/repo] [options]
```

The repo argument accepts a single repo, comma-separated repos, or use `--org`
for an entire organization.

| Flag | Description | Default |
|------|-------------|---------|
| `--since <duration>` | Look back period (`30d`, `2w`, etc.) | `90d` |
| `--token <token>` | GitHub token (or `GH_TOKEN` env) | |
| `--base-url <url>` | GitHub Enterprise API root | |
| `--org <orgname>` | Fetch all repos from a GitHub org | |
| `--format <json\|csv>` | Output format | `json` |
| `--output <path\|stdout\|stderr>` | Output destination | `stdout` |
| `--progress` | Show fetch progress on stderr | |
| `--dry-run` | Print options and exit | |
| `--include-labels <a,b>` | Only include PRs with these labels | |
| `--exclude-labels <a,b>` | Skip PRs with these labels | |
| `--top <n>` | Show top N PRs by score | |
| `--bottom <n>` | Show bottom N PRs by score | |
| `--group-by <author\|team>` | Breakdown metrics by author or team | |
| `--team-config <path>` | JSON mapping authors to teams | |
| `--compare [duration]` | Compare with previous period | |
| `--include-files` | Fetch per-file data (1 API call per PR) | |
| `--code-analysis` | Run file-level code analysis | |
| `--ai-context` | Include AI review context in output | |
| `--skip-patches` | Omit diff text from file data | |
| `--use-cache` | Cache API responses in local SQLite | |
| `--resume` | Resume from where a previous run stopped | |

---

## Library Usage

Everything the CLI does is available as a library. The Quick Start section
above shows paired CLI + library examples for each use case. Here are
additional patterns for library-only workflows.

### Custom scoring rules

Define your own weights and normalizers instead of using the default scorecard:

```ts
import { collectPullRequests, scorePr, createRangeNormalizer } from 'pull-request-score'
import type { ScoreRule, PrMetricsSnapshot } from 'pull-request-score'

const pickupNorm = createRangeNormalizer(
  [{ max: 4, score: 100 }, { max: 8, score: 80 }, { max: 24, score: 50 }],
  20,
)

const myRules: ScoreRule<PrMetricsSnapshot>[] = [
  { metric: 'cycleTimeHours', weight: 0.4, normalize: v => pickupNorm(v) },
  { metric: 'ciPassRate', weight: 0.3, normalize: v => v * 100 },
  { fn: m => Math.min(m.reviewerCount ?? 0, 2) / 2, weight: 0.3, normalize: v => v * 100 },
]

const prs = await collectPullRequests({ /* ... */ })
const scores = prs.map(pr => scorePr(pr, myRules))
```

### Build AI review context

Collect file diffs and analysis, then send to any model:

```ts
import { collectPullRequests, collectPrFiles, analyzePrFiles, buildAiReviewContext } from 'pull-request-score'

const prs = await collectPullRequests({ /* ... */ })
const pr = prs[0]
const files = await collectPrFiles({ owner: 'my-org', repo: 'api', prNumber: pr.number, auth: process.env.GH_TOKEN! })
const context = buildAiReviewContext(pr, files, analyzePrFiles(files))
// context.files has the diffs, context.analysis has the risk/hygiene/security data
```

### Aggregate scoring with custom weights

Score across an entire repo instead of per-PR:

```ts
import { collectPullRequests, calculateMetrics, scoreMetrics } from 'pull-request-score'

const prs = await collectPullRequests({ /* ... */ })
const metrics = calculateMetrics(prs)

const repoScore = scoreMetrics(metrics, [
  { metric: 'mergeRate', weight: 0.3, normalize: v => v * 100 },
  { metric: 'reviewCoverage', weight: 0.3, normalize: v => v * 100 },
  { metric: 'buildSuccessRate', weight: 0.2, normalize: v => v * 100 },
  { metric: 'stalePrCount', weight: -0.1 },
  { metric: 'prBacklog', weight: -0.1 },
])
```

---

## Monorepos

Use label filtering to slice a monorepo by team:

```bash
# Payments team only
npx gh-pr-metrics my-org/monorepo --include-labels team-payments --since 30d

# Backend services, excluding bots
npx gh-pr-metrics my-org/monorepo --include-labels backend --exclude-labels bot

# Team breakdown with author-to-team mapping
npx gh-pr-metrics my-org/monorepo --group-by team --team-config teams.json
```

The `teams.json` file maps GitHub usernames to team names:

```json
{
  "alice": "payments",
  "bob": "payments",
  "carol": "platform",
  "dave": "platform"
}
```

Labels are filtered after fetching, so you can `--use-cache` and run multiple
queries against the same cached data.

---

## AI-Powered PR Review

`pull-request-score` gives you all the data. You bring the AI. The
`--ai-context` flag outputs a structured object per PR containing the full file
diffs, deterministic analysis, and metrics — everything a model needs to review
the code. No AI dependencies ship with this package.

### With Claude Code (CLI)

The fastest path. Claude Code can read the output directly:

```bash
# Grab the worst PR from last week and ask Claude to review it
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN \
  --ai-context --bottom 1 --output pr-review.json

claude "Review the PR in pr-review.json. Focus on the security patterns, 
test coverage gaps, and whether the risk score of the file analysis is justified. 
Suggest what a reviewer should pay attention to."
```

Or pipe it inline for a one-liner:

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN \
  --ai-context --bottom 1 \
  | claude "Review this PR data. Is the low score justified? 
    What should the reviewer focus on?"
```

Claude Code can also run the tool itself. Just ask it:

```
> Look at my-org/api PRs from the last 7 days. Find the riskiest one and
  review its code changes. Tell me if there are security concerns.
```

Claude Code will run `gh-pr-metrics` with `--ai-context`, read the output,
and analyze the diffs, risk factors, and security patterns for you.

### With GitHub Copilot CLI

```bash
# Generate the context
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN \
  --ai-context --bottom 3 --output review-context.json

# Ask Copilot to analyze it
gh copilot explain "$(cat review-context.json | jq '.prScores[0].aiContext')"
```

### With any AI model (API)

The `--ai-context` output is a plain JSON object. Send it to any model's API:

```ts
import {
  collectPullRequests,
  collectPrFiles,
  analyzePrFiles,
  buildAiReviewContext,
  scorePr,
} from 'pull-request-score'
import Anthropic from '@anthropic-ai/sdk'

const prs = await collectPullRequests({
  owner: 'my-org', repo: 'my-repo',
  since: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  auth: process.env.GH_TOKEN!,
})

// Pick the lowest-scored PR
const scores = prs.map(pr => scorePr(pr)).sort((a, b) => a.score - b.score)
const worstPr = prs.find(pr => pr.number === scores[0].prNumber)!

// Build the full context
const files = await collectPrFiles({
  owner: 'my-org', repo: 'my-repo',
  prNumber: worstPr.number, auth: process.env.GH_TOKEN!,
})
const analysis = analyzePrFiles(files)
const context = buildAiReviewContext(worstPr, files, analysis)

// Send to Claude
const client = new Anthropic()
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: `Review this pull request. The file analysis found a risk score 
of ${context.analysis.riskScore}/100 and flagged it as "${context.analysis.reviewDepthSignal}".

Security patterns found: ${JSON.stringify(context.analysis.securityPatterns)}
Code patterns found: ${JSON.stringify(context.analysis.codePatterns)}

Here are the changed files:
${context.files.map(f => `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch}\n\`\`\``).join('\n\n')}

Give me:
1. A summary of what this PR does
2. Whether the risk score is justified
3. Security concerns if any
4. What a human reviewer should focus on`
  }],
})

console.log(response.content[0].text)
```

### What's in the AI context?

The `aiContext` object contains everything needed for a thorough review:

```json
{
  "pr": {
    "number": 142,
    "title": "refactor: update auth middleware",
    "author": "alice",
    "state": "MERGED",
    "linesChanged": 340,
    "filesChanged": 8
  },
  "analysis": {
    "riskScore": 65,
    "riskFactors": [
      { "filename": "src/auth/middleware.ts", "reason": "auth-path", "weight": 20 },
      { "filename": "db/migrations/005_sessions.sql", "reason": "migration", "weight": 15 }
    ],
    "reviewDepthSignal": "critical",
    "testHygiene": { "ratio": 0.4, "sourceFilesWithoutTests": ["src/auth/session.ts"] },
    "securityPatterns": [],
    "codePatterns": [
      { "type": "todo", "filename": "src/auth/middleware.ts", "snippet": "// TODO: add rate limiting" }
    ],
    "diffComplexity": { "bucket": "medium", "newFunctionCount": 6 }
  },
  "files": [
    {
      "filename": "src/auth/middleware.ts",
      "status": "modified",
      "additions": 45,
      "deletions": 12,
      "patch": "@@ -10,12 +10,45 @@ ..."
    }
  ],
  "metrics": null
}
```

This is the same data structure whether you use it from the CLI, the library,
Claude Code, Copilot, or a custom pipeline. The format is stable and designed
for AI consumption.

---

## Enterprise

Supports GitHub Enterprise Server, GitHub App authentication, org-wide analysis,
and multi-repo rollups. See the full **[Enterprise Guide](enterprise.md)** for:

- Use cases for managers, tech leads, developers, and platform teams
- Metric interpretation with healthy ranges and anti-patterns
- CI/CD integration (GitHub Actions, Slack, data warehouses)
- Custom scorecards for your organization's priorities

Quick example:

```bash
npx gh-pr-metrics --org my-org --since 30d --token $GH_TOKEN \
  --base-url https://github.mycompany.com/api/v3 \
  --group-by team --team-config teams.json --compare
```

---

## Development

```bash
pnpm install
pnpm test
pnpm build
```

202 tests, mutation testing via Stryker, TypeScript strict mode.

See [docs/metric-reference.md](docs/metric-reference.md) for metric definitions
and the [Enterprise Guide](enterprise.md) for deployment patterns.
