# @gh-pr-metrics/core

[![npm version](https://img.shields.io/npm/v/@gh-pr-metrics/core)](https://www.npmjs.com/package/@gh-pr-metrics/core)
[![CI](https://github.com/owner/repo/actions/workflows/ci.yml/badge.svg)](https://github.com/owner/repo/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/owner/repo)](https://codecov.io/gh/owner/repo)
[![docs](https://img.shields.io/badge/docs-website-blue)](https://owner.github.io/pull-request-score/)

`@gh-pr-metrics/core` collects and aggregates pull request data from GitHub. It was
built to help teams understand how code moves through their repositories and to
highlight opportunities for process improvements. The project exposes both a CLI
for quick analysis as well as a library for building custom workflows.

## Why does this exist?

Tracking cycle time, review responsiveness and CI reliability across many pull
requests is tedious. This package automates the heavy lifting so you can focus
on interpreting the numbers. It works against the public GitHub API and GitHub
Enterprise installations and is designed to scale to large organizations with
many concurrent pull requests.

## Requirements

- **Node.js** 18 or newer
- **pnpm** package manager

## Features

 - **Comprehensive metrics** – see the [Metric Reference](https://owner.github.io/pull-request-score/docs/metric-reference) for the full list.
- **Support for GitHub Enterprise** via the `--base-url` option.
- **CLI and library usage** for flexibility.
- **Label based filtering** so monorepo users can target a specific team or
  category of work.
- Optional throttling helper for environments with strict API limits.

## Documentation

Browse the website for usage guides and API details at
[https://owner.github.io/pull-request-score/](https://owner.github.io/pull-request-score/).

## Installation

```bash
pnpm add @gh-pr-metrics/core
```

When you only need a quick report you can use `npx`:

```bash
npx gh-pr-metrics octocat/hello-world --since 30d
```

## Using the CLI

```bash
npx gh-pr-metrics <owner/repo> --since 30d --token YOUR_TOKEN \
  --base-url https://github.mycompany.com/api/v3 --progress
```

### Options

- `--since <duration>` – look back period. Values like `30d` or `2w` are
  supported. Defaults to `90d`.
- `--token <token>` – GitHub token or use the `GH_TOKEN` environment variable.
- `--base-url <url>` – API root when running against GitHub Enterprise.
- `--format <json|csv>` – output format. Defaults to JSON.
- `--output <path|stdout|stderr>` – where to write metrics. Defaults to stdout.
- `--progress` – show fetching progress on stderr.
- `--dry-run` – print the options that would be used and exit.
- `--include-labels <a,b>` – only include pull requests that have any of the
  given labels.
- `--exclude-labels <a,b>` – skip pull requests that have any of the given
  labels.

Label filters make it easy for large enterprises to slice metrics per team when
many groups share a monorepo. Omitting the filters aggregates over all pull
requests.

### Examples

Output metrics as CSV:

```bash
npx gh-pr-metrics myorg/app --format csv --token MY_TOKEN \
  --output metrics.csv
```

Generate metrics for just the `team-a` labeled pull requests:

```bash
npx gh-pr-metrics myorg/app --since 7d --token MY_TOKEN \
  --include-labels team-a
```

Exclude work in progress PRs:

```bash
npx gh-pr-metrics myorg/app --exclude-labels wip --token MY_TOKEN
```

## Library Usage

All functionality exposed by the CLI is also available programmatically.

```ts
import {
  collectPullRequests,
  calculateMetrics,
  calculateCycleTime,
  calculateReviewMetrics,
  calculateCiMetrics,
  writeOutput,
} from "@gh-pr-metrics/core";

const prs = await collectPullRequests({
  owner: "octocat",
  repo: "hello-world",
  since: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  auth: "YOUR_TOKEN",
  includeLabels: ["team-a"],
});

const metrics = calculateMetrics(prs, {
  outsizedThreshold: 1500,
  staleDays: 60,
});

console.log(calculateCycleTime(prs[0]));
console.log(calculateReviewMetrics(prs[0]));
console.log(calculateCiMetrics(prs[0]));
writeOutput(metrics, { format: "json" });
```

See [docs/rate-limiter.md](docs/rate-limiter.md) for details on pacing API
requests and [docs/write-output.md](docs/write-output.md) for controlling output
formats.
For custom metrics see the [Plugin API docs](https://owner.github.io/pull-request-score/plugin-api).

## Development

```bash
pnpm install
pnpm test
```

Contributions are welcome! The project is intentionally small and easy to extend
for additional metrics.

See [docs/metric-reference.md](docs/metric-reference.md) for definitions of all
available metrics.

### `scoreMetrics`

After calculating metrics you can derive a single numeric score by
combining them with custom weights.

```ts
import { scoreMetrics } from '@gh-pr-metrics/core'

const score = scoreMetrics(metrics, [
  { weight: 0.6, metric: 'mergeRate' },
  { weight: 0.4, metric: 'reviewCoverage' },
])
```

Rules may also use custom functions to leverage any metric data:

```ts
const score = scoreMetrics(metrics, [
  { weight: 1, metric: 'mergeRate' },
  { weight: -0.1, fn: m => m.prBacklog },
])
```

Metrics can be normalized before weighting using the `normalize` option. This
is useful for converting ratios into a 1–100 scale:

```ts
const score = scoreMetrics(metrics, [
  { weight: 0.5, metric: 'mergeRate', normalize: v => v * 100 },
  { weight: 0.5, metric: 'reviewCoverage', normalize: v => v * 100 },
])
```

More advanced transforms can convert ranges of values to discrete scores. The
`createRangeNormalizer` helper makes this easy:

```ts
import { scoreMetrics, createRangeNormalizer } from '@gh-pr-metrics/core'

const normalizePickupTime = createRangeNormalizer(
  [
    { max: 4, score: 100 },
    { max: 6, score: 80 },
    { max: 12, score: 60 },
  ],
  40,
)

const score = scoreMetrics({ pickupTime: 5 }, [
  { weight: 1, metric: 'pickupTime', normalize: normalizePickupTime },
])
```

You can reuse the normalizer alongside others for a combined score:

```ts
const metrics = { pickupTime: 2, mergeRate: 0.95 }

const normalizePickupTime = createRangeNormalizer(
  [
    { max: 4, score: 100 },
    { max: 6, score: 80 },
    { max: 12, score: 60 },
  ],
  40,
)

const pct = (v: number) => Math.round(v * 100)

const score = scoreMetrics(metrics, [
  { weight: 0.5, metric: 'pickupTime', normalize: normalizePickupTime },
  { weight: 0.5, metric: 'mergeRate', normalize: pct },
])
// => 98
```

Multiple rules can even target the same metric, for example to
compare rounding strategies:

```ts
scoreMetrics({ mergeRate: 0.955 }, [
  { weight: 0.5, metric: 'mergeRate', normalize: v => Math.floor(v * 100) },
  { weight: 0.5, metric: 'mergeRate', normalize: v => Math.ceil(v * 100) },
])
// => 95.5
```

