# @gh-pr-metrics/core

[![npm version](https://img.shields.io/npm/v/@gh-pr-metrics/core)](https://www.npmjs.com/package/@gh-pr-metrics/core)
[![CI](https://github.com/owner/repo/actions/workflows/ci.yml/badge.svg)](https://github.com/owner/repo/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/owner/repo)](https://codecov.io/gh/owner/repo)

Core utilities for calculating GitHub pull request metrics.

## Quick Start

Install the package:

```bash
pnpm add @gh-pr-metrics/core
```

Run the CLI:

```bash
npx gh-pr-metrics octocat/hello-world --since 30d
```

See the [metric reference](docs/metric-reference.md) for details.
Documentation for the optional request throttling helper is available in
[docs/rate-limiter.md](docs/rate-limiter.md).

## Development

```bash
pnpm install
pnpm test
```

### CLI Usage

```
npx gh-pr-metrics <owner/repo> --since 30d --token YOUR_TOKEN \
  --base-url https://github.mycompany.com/api/v3 --progress
```

To save the metrics to a file:

```
npx gh-pr-metrics <owner/repo> --format csv --token YOUR_TOKEN \
  --output metrics.csv
```

Use `--dry-run` to check parameters without contacting GitHub. The `--base-url`
option enables GitHub Enterprise support by pointing to the API root.
Progress output is printed to stderr as pull requests are fetched.
Set `--output <path|stdout|stderr>` to control where the metrics are written.

### `calculateMetrics`

The library provides a helper to aggregate many pull requests into a single
metrics object.

```ts
import { collectPullRequests, calculateMetrics } from '@gh-pr-metrics/core'

const prs = await collectPullRequests({
  owner: 'octocat',
  repo: 'hello-world',
  since: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  auth: 'YOUR_TOKEN',
})

const metrics = calculateMetrics(prs, {
  outsizedThreshold: 1500,
  staleDays: 60,
})

console.log(metrics)
```

`outsizedThreshold` marks PRs with more than this number of changed lines as
outsized while `staleDays` defines how long an open PR can go without updates
before it is considered stale.

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
