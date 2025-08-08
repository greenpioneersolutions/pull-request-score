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

For GitHub Enterprise, you can specify a custom API base URL:

```bash
GH_TOKEN=TOKEN node playground/fetch-metrics.mjs owner/repo --base-url https://ghe.example.com/api/v3
```

If your instance uses a self-signed certificate, add `--insecure` to bypass
certificate validation.

### Score some metrics

```bash
node playground/score-metrics.mjs
```
