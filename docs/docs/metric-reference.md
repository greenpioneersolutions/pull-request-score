# Metric Reference

| Metric                   | Formula                                                             | Unit    | Rationale                                                                    |
| ------------------------ | ------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| `cycleTime`              | `(mergedAt - createdAt) / 3_600_000`                                | hours   | Total time from opening a PR until merge. Useful for gauging delivery speed. |
| `pickupTime`             | `(firstReviewAt - createdAt) / 3_600_000`                           | hours   | Time for the first review to arrive, reflecting reviewer responsiveness.     |
| `mergeRate`              | `merged PRs / total PRs`                                            | ratio   | Portion of submitted PRs that merge successfully.                            |
| `closedWithoutMergeRate` | `closed without merge / total PRs`                                  | ratio   | Share of PRs closed without merging, signalling wasted effort.               |
| `reviewCoverage`         | `PRs with reviews / total PRs`                                      | ratio   | How many PRs receive at least one review.                                    |
| `averageCommitsPerPr`    | `total commits / total PRs`                                         | count   | Typical number of commits per PR, hinting at churn.                          |
| `outsizedPrs`            | PR numbers where `additions + deletions` exceed `outsizedThreshold` | list    | Large PRs tend to be harder to review.                                       |
| `buildSuccessRate`       | `successful check suites / all check suites`                        | ratio   | Fraction of CI runs that pass.                                               |
| `averageCiDuration`      | `sum(check duration) / count`                                       | seconds | Mean time taken for CI to complete.                                          |
| `stalePrCount`           | count of open PRs not updated for more than `staleDays`             | count   | Highlights neglected work.                                                   |
| `hotfixFrequency`        | `hotfix PRs / total PRs`                                            | ratio   | Frequency of urgent production fixes.                                        |
| `prBacklog`              | `number of PRs with state == "OPEN"`                                | count   | How many PRs are currently pending.                                          |
| `prCountPerDeveloper`    | `PRs authored by user / total PRs`                                  | record  | Distribution of PR authorship.                                               |
| `reviewCounts`           | `reviews per PR`                                                    | record  | Number of reviews each PR received.                                          |
| `commentCounts`          | `comments per PR`                                                   | record  | Total comments on each PR.                                                   |
| `commenterCounts`        | `unique commenters per PR`                                          | record  | How many distinct people commented.                                          |
| `discussionCoverage`     | `PRs with >=10 comments and >=3 commenters / total PRs`             | ratio   | Share of PRs with active discussion.                                         |
| `commentDensity`         | `comments / (additions + deletions)`                                | ratio   | Engagement relative to code changes.                                         |
| `commentQuality`         | `ratio of long comments (>=5 words)`                                | ratio   | Approximate quality of comments (requires opt in).                           |
