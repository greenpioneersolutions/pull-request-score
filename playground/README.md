# Playground

Example scripts for experimenting with `pull-request-score`.

## Setup

Install dependencies and build the project:

```bash
pnpm install
pnpm build
```

## Examples

### Fetch metrics from GitHub

Requires a GitHub token in `GH_TOKEN`.

```bash
GH_TOKEN=YOUR_TOKEN node playground/fetch-metrics.mjs owner/repo
```

Omitting `owner/repo` defaults to `octocat/Hello-World`.

### Score some metrics

```bash
node playground/score-metrics.mjs
```
