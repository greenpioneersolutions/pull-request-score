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
