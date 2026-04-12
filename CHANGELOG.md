# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.5] - 2026-04-11

### Fixed

- PR number collision in multi-repo file analysis. When multiple repos had
  the same PR number, `allFileAnalyses` map would overwrite entries. Now keyed
  by `"owner/repo#number"` with repo-scoped maps for per-repo results.
- CSV output now escapes values containing commas, double quotes, and newlines
  per RFC 4180. Previously these produced invalid CSV.
- Multi-repo comparison (`--compare` with comma-separated repos) now includes
  `perRepo` breakdown in the previous period result, matching the current period
  structure.

### Changed

- Replaced `better-sqlite3` (native C++ bindings) with a zero-dependency
  filesystem-based cache. Each cache entry is stored as a JSON file in
  `~/.gh-pr-metrics/cache/`. Eliminates installation failures in containers,
  CI/CD, ARM, and environments without build toolchains. Falls back to
  in-memory Map if the filesystem is read-only. Same `CacheStore` interface,
  same `--use-cache`/`--resume` behavior.
- Removed `better-sqlite3` from dependencies and `@types/better-sqlite3`
  from devDependencies.

---

## [2.0.4] - 2026-04-10

### Fixed

- GitHub GraphQL query exceeds 500,000 node limit. The nested pagination
  limits multiplied out to 1,000,000 nodes (100 PRs x 100 commits x 100
  contexts). Reduced inner limits to stay well under budget: reviews 10,
  comments 50, commits 5, contexts 25, timeline items 20. Total worst-case
  is now ~22,500 nodes per page.

---

## [2.0.3] - 2026-04-10

### Fixed

- GitHub GraphQL API errors when collecting pull requests. The `checkSuites`
  field was removed from the PullRequest type in GitHub's schema. CI status
  is now derived from `statusCheckRollup` on each commit's check runs. Also
  fixed `timelineItems` filter using invalid enum values (`READY_FOR_REVIEW`,
  `REVIEW_REQUESTED`) — corrected to `READY_FOR_REVIEW_EVENT` and
  `REVIEW_REQUESTED_EVENT`.

---

## [2.0.2] - 2026-04-10

### Fixed

- Plugin registry ESM TDZ crash fully resolved. The v2.0.1 fix (lazy-init
  with `let plugins | undefined`) still hit the Temporal Dead Zone because
  ESM hoists imports above ALL `let`/`const` declarations regardless of
  initializers. The real fix separates auto-registration into its own module
  (`src/plugins/autoRegister.ts`) so `registry.ts` has zero calculator imports
  and fully initializes before any calculator calls `register()`.

---

## [2.0.1] - 2026-04-06

### Fixed

- Plugin registry crashes with "Cannot access 'plugins' before initialization"
  in ESM environments. Import statements are hoisted in ESM, so the auto-
  registration imports in `src/plugins/registry.ts` ran before the `plugins`
  array was initialized. (Incomplete fix — see 2.0.2.)

---

## [2.0.0] - 2026-04-04

A major release that transforms `pull-request-score` from a metrics collector
into a full PR analytics platform. Adds per-PR scoring, multi-repo support,
author/team breakdowns, trend comparison, file-level code analysis, and AI
review context — while remaining fully backward compatible with all 1.0.0 APIs.

### Added

#### Per-PR Scoring Engine
- `scorePr()` scores individual pull requests 0-100 using a built-in scorecard
- `computePrSnapshot()` extracts all per-PR metric values into a typed snapshot
- Default scorecard evaluates cycle time (20%), pickup time (15%), CI pass rate (15%),
  reviewer count (10%), change request ratio (10%), idle time (10%), size (10%),
  and revert rate (10%)
- `--top <n>` and `--bottom <n>` CLI flags to surface the best and worst PRs
- New files: `src/scoring/prScoring.ts`, `src/scoring/defaultScorecard.ts`

#### Multi-Repo and Org-Wide Analysis
- CLI now accepts comma-separated repos: `my-org/api,my-org/web`
- `--org <orgname>` flag fetches all repositories from a GitHub organization
- `fetchOrgRepos()` library function for programmatic org discovery
- Output includes `perRepo` breakdown alongside combined rollup when analyzing multiple repos
- Repo argument changed from required `<repo>` to optional `[repo]`
- New file: `src/collectors/orgRepos.ts`

#### Author and Team Metric Breakdowns
- `--group-by author` breaks down all metrics per PR author
- `--group-by team --team-config teams.json` groups authors into teams
- `calculateAuthorMetrics()` and `calculateTeamMetrics()` library functions
- `loadTeamMapping()` reads author-to-team JSON config files
- Per-author/team output includes PR count, cycle time stats, merge rate,
  review coverage, build success rate, and average PR score
- New file: `src/calculators/groupMetrics.ts`

#### Period-Over-Period Trend Comparison
- `--compare` flag fetches two time periods and shows metric deltas
- `--compare <duration>` allows a custom previous period length
- `parsePeriods()` computes non-overlapping date ranges
- `computeDeltas()` calculates absolute and percentage changes for all numeric metrics
- `until` parameter added to `CollectPullRequestsParams` for bounded time ranges
- New files: `src/comparison/periodParser.ts`, `src/comparison/trendComparison.ts`

#### File-Level Code Analysis
- `--include-files` fetches per-file data from the GitHub REST API (filenames,
  per-file additions/deletions, and unified diff patches)
- `--code-analysis` runs deterministic analysis on file data (implies `--include-files`)
- `--ai-context` includes structured AI review context per PR (implies `--code-analysis`)
- `--skip-patches` omits diff text for smaller payloads
- `collectPrFiles()` and `collectFilesForPrs()` REST API collectors with
  pagination, caching, and rate limiting
- New files: `src/collectors/prFiles.ts`, `src/models/files.ts`

#### Deterministic Code Calculators (no AI)
- `classifyFiles()` categorizes files as source, test, config, docs, CI,
  migration, dependency, or generated
- `calculateRiskScore()` produces a 0-100 risk score based on sensitive file
  patterns (auth, migrations, .env, Dockerfiles, CI config, dependencies)
- `calculateTestHygiene()` measures ratio of test changes to source changes
  and identifies source files without corresponding test updates
- `calculateScopeSpread()` counts distinct directories and top-level modules touched
- `calculateReviewDepthSignal()` classifies PRs as "simple", "complex", or
  "critical" for reviewer routing
- `calculateDiffComplexity()` analyzes diff patches for nesting depth, new
  function count, and regex density
- `detectSecurityPatterns()` scans added lines for hardcoded secrets, `eval()`,
  SQL concatenation, `dangerouslySetInnerHTML`, and disabled lint rules
- `detectAiGeneratedSignals()` uses heuristics to detect uniform documentation
  patterns and repetitive comment structures
- `detectCodePatterns()` finds new TODOs, FIXMEs, console.logs, debug
  statements, and commented-out code
- `analyzePrFiles()` orchestrates all file calculators into a single `FileAnalysis` object
- New files: 9 calculators in `src/calculators/`, orchestrator in `src/analyzers/fileAnalyzer.ts`

#### AI Review Context Builder
- `buildAiReviewContext()` packages PR metadata, full file diffs, deterministic
  analysis, and metrics into a structured object for AI model consumption
- Zero AI dependencies — returns data only, the consumer's model does the analysis
- New file: `src/analyzers/aiReviewContext.ts`

#### Public API Expansion
- Exported `scoreMetrics`, `ScoreRule`, `createRangeNormalizer`, `RangeRule`
  from the public API (previously importable but not in the barrel export)
- Exported `stats()` utility with `StatsResult` type (previously private to CLI)
- Exported all new scoring, grouping, comparison, file analysis, and context
  builder functions and types
- Added `types` field and conditional `exports` map to `package.json`
- Added `description` to `package.json`

#### Documentation
- `enterprise.md` — comprehensive enterprise guide covering use cases by role,
  metric interpretation, monorepo strategies, CI/CD integration, and custom scorecards
- Complete README rewrite with concrete output examples, metric explanations
  with healthy ranges, and AI-powered PR review workflows
- AI review section with Claude Code CLI, GitHub Copilot CLI, and Anthropic
  SDK integration examples

### Changed

- CLI output now includes `aggregateMetrics` and `prScores` arrays alongside
  the existing `cycleTime` and `pickupTime` stats (additive, not breaking)
- `writeOutput()` accepts any data shape instead of the rigid `OutputMetrics`
  interface; CSV output uses a generic `flattenToRows()` approach
- `jest.config.js` simplified from 60+ individual module name mappers to a
  single universal regex pattern: `"^(\\.{1,2}/.*)\\.js$": "$1"`
- Stryker mutation testing scope expanded to include scoring, comparison,
  stats, and normalizer files
- Retry backoff in `graphqlWithRetry()` now caps at 60 seconds (was unbounded)
  and detects secondary rate limits (403 + "secondary" in message)
- Collector retry backoff also capped at 60 seconds

### Fixed

- Calculator errors in CLI are now logged at debug level instead of silently
  swallowed (`catch { /* ignore */ }` replaced with structured pino logging)
- Owner/repo CLI argument now validated against GitHub's allowed character
  pattern before making API calls
- Output file paths resolved with `path.resolve()` and root path writes
  rejected to prevent path traversal
- `graphqlWithRetry()` accepts `RetryOptions` object with configurable
  `maxAttempts`, `baseDelayMs`, and `maxDelayMs` (backward compatible —
  still accepts a plain number)

---

## [1.0.0] - 2025-06-15

Initial stable release. A CLI and library for collecting and aggregating
GitHub pull request metrics.

### Added

#### Core
- `collectPullRequests()` fetches PR data from the GitHub GraphQL API with
  cursor-based pagination, rate limiting via Bottleneck, and exponential
  backoff retry
- `PartialResultsError` preserves collected data when a fetch fails partway
- `RawPullRequest` model with full PR metadata: id, number, title, state,
  timestamps, author, reviews, comments, commits, check suites, timeline
  items, labels, additions, deletions, changedFiles

#### Metrics
- `calculateMetrics()` computes 17+ aggregate metrics from a PR array:
  merge rate, closed-without-merge rate, review coverage, discussion coverage,
  comment quality, average commits per PR, outsized PR detection, build success
  rate, average CI duration, stale PR count, hotfix frequency, PR backlog,
  per-developer PR counts, per-PR review/comment/commenter counts
- `calculateCycleTime()` — hours from PR creation to merge
- `calculateReviewMetrics()` — hours from creation to first review (pickup time)
- `calculateCiMetrics()` — CI success rate and average duration per PR
- `calculateCiPassRate()` — CI pass rate per PR
- `calculateCommentDensity()` — comments per line changed
- `calculateReviewerCount()` — unique reviewers per PR
- `calculateChangeRequestRatio()` — ratio of change-requesting reviews
- `calculateRevertRate()` — ratio of revert commits
- `calculateIdleTimeHours()` — sum of gaps exceeding 24 hours between activity
- `calculateSizeBucket()` — S/M/L classification based on lines changed
- `calculateOutsizedFlag()` — boolean flag for PRs exceeding a size threshold

#### Scoring
- `scoreMetrics()` — weighted scoring engine for any metrics object
- `ScoreRule` interface supporting field access, custom functions, and
  normalize transforms
- `createRangeNormalizer()` — maps value ranges to discrete scores

#### CLI (`gh-pr-metrics`)
- `--since <duration>` with `ms` library for human-readable durations
- `--token <token>` and `GH_TOKEN` environment variable support
- `--base-url <url>` for GitHub Enterprise Server
- `--format json|csv` output formatting
- `--output <path|stdout|stderr>` destination control
- `--progress` flag for fetch progress on stderr
- `--dry-run` to preview options without fetching
- `--include-labels` and `--exclude-labels` for monorepo team filtering
- `--use-cache` for SQLite-backed response caching
- `--resume` to continue from a saved pagination cursor
- `--app-id` and `--app-private-key` for GitHub App authentication
- `--log-level` for pino logger control

#### Authentication
- Personal Access Token (PAT) support
- GitHub App authentication with JWT generation and installation token
  resolution via `@octokit/auth-app`

#### Caching
- `sqliteStore()` — persistent SQLite cache at `~/.gh-pr-metrics/cache.db`
  with TTL support (default 24 hours)
- Automatic fallback to in-memory `Map` when `better-sqlite3` native bindings
  are unavailable
- GraphQL responses cached by SHA1 hash of pagination cursor
- Cursor state persisted every 5 pages for resume capability

#### Plugin System
- `MetricPlugin` interface: `{ slug, description, calculate(pr) }`
- `register()` and `getAll()` for the plugin registry
- All built-in calculators auto-register via import side effects

#### Utilities
- `parseTicket()` and `hasTicket()` for extracting JIRA-style ticket IDs
  (e.g., `BOSS-1252`) from PR titles
- Pino structured logging with `LOG_LEVEL` environment variable
- `createRateLimiter()` standalone Bottleneck wrapper

#### Infrastructure
- TypeScript strict mode with `noUncheckedIndexedAccess` and
  `noPropertyAccessFromIndexSignature`
- ES module (NodeNext) targeting ES2022
- Jest test suite with `ts-jest` ESM preset
- Stryker mutation testing at 80% threshold
- ESLint + Prettier configuration
- Semantic release with Angular commit convention
- GitHub Actions CI (Jest + Stryker on PRs and main)
- GitHub Actions weekly metrics collection workflow
- Docusaurus documentation site deployed to GitHub Pages
- Slack webhook posting script (`scripts/postToSlack.ts`)

#### Documentation
- Metric reference with formulas and rationale for all 17+ metrics
- Rate limiter guide
- Comment scoring guide
- Ticket ID parsing guide
- Plugin API guide
- Docusaurus site with blog

---

[2.0.5]: https://github.com/greenpioneersolutions/pull-request-score/compare/v2.0.4...v2.0.5
[2.0.4]: https://github.com/greenpioneersolutions/pull-request-score/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/greenpioneersolutions/pull-request-score/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/greenpioneersolutions/pull-request-score/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/greenpioneersolutions/pull-request-score/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/greenpioneersolutions/pull-request-score/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/greenpioneersolutions/pull-request-score/releases/tag/v1.0.0
