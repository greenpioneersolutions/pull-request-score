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

### Output

Metrics can be written using `writeOutput` which supports JSON and CSV formats
as well as custom destinations:

```ts
import { writeOutput } from '@gh-pr-metrics/core';

writeOutput(metrics, { format: 'csv', destination: 'metrics.csv' });
// write to stderr instead of stdout
writeOutput(metrics, { destination: 'stderr' });
```

See the [metric reference](docs/metric-reference.md) for details.
For more details on output options see [docs/write-output.md](docs/write-output.md).

## Development

```bash
pnpm install
pnpm test
```
