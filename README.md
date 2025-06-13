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

Use `--dry-run` to check parameters without contacting GitHub. The `--base-url`
option enables GitHub Enterprise support by pointing to the API root.
Progress output is printed to stderr as pull requests are fetched.
