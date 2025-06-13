# Metric Reference

| Metric       | Formula                                   | Unit  | Rationale                                                                              |
| ------------ | ----------------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `cycleTime`  | `(mergedAt - createdAt) / 3_600_000`      | hours | Measures total time from opening a PR until it is merged, highlighting delivery speed. |
| `pickupTime` | `(firstReviewAt - createdAt) / 3_600_000` | hours | Shows how quickly reviewers start evaluating a PR, indicating responsiveness.          |
| `mergeRate` | `merged PRs / total PRs` | ratio | Indicates what portion of submitted PRs ultimately merge. |
| `closedWithoutMergeRate` | `closed without merge / total PRs` | ratio | Measures wasted or abandoned effort. |
| `reviewCoverage` | `PRs with reviews / total PRs` | ratio | Ensures code changes are examined. |
| `averageCommitsPerPr` | `total commits / total PRs` | count | Highlights churn within PRs. |
| `outsizedPrs` | PR numbers exceeding threshold | list | Identifies overly large PRs that are hard to review. |
| `buildSuccessRate` | `successful check suites / all check suites` | ratio | Captures CI stability. |
| `averageCiDuration` | `sum(check duration) / count` | seconds | Average time CI takes to run. |
| `stalePrCount` | count of open PRs not updated for > staleDays | count | Highlights neglected work. |
| `hotfixFrequency` | `hotfix PRs / total PRs` | ratio | Shows urgency of production fixes. |
| `prBacklog` | number of PRs still open | count | Indicates pipeline congestion. |
