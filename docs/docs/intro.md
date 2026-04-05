---
sidebar_position: 1
---

# Getting Started

`pull-request-score` is a CLI and library that scores, analyzes, and tracks
your team's GitHub pull requests.

## Install

```bash
npm install -g pull-request-score
```

Or run directly with `npx`:

```bash
npx gh-pr-metrics my-org/my-repo --since 30d --token $GH_TOKEN
```

## What you get

- A **0-100 score** for every PR based on cycle time, review quality, CI health, and size
- **Aggregate metrics** like merge rate, review coverage, build success rate
- **Author and team breakdowns** to see who's shipping what
- **Trend comparison** to track improvement over time
- **File-level code analysis** with risk scoring, test hygiene, and security pattern detection
- **AI review context** you can pipe to any model for automated code review

## Quick example

Score your repo's PRs from the last week, see the top 5 and bottom 5:

```bash
npx gh-pr-metrics my-org/api --since 7d --token $GH_TOKEN --top 5 --bottom 5
```

## Next steps

- [Metric Reference](./metric-reference) — what each metric means and how it's calculated
- [Comment Scoring](./comment-scoring) — how comment quality is measured
- [Rate Limiter](./rate-limiter) — controlling API request pacing
- [Ticket IDs](./ticket-ids) — extracting JIRA-style ticket references from PR titles
