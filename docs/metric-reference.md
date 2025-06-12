# Metric Reference

| Metric       | Formula                                   | Unit  | Rationale                                                                              |
| ------------ | ----------------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `cycleTime`  | `(mergedAt - createdAt) / 3_600_000`      | hours | Measures total time from opening a PR until it is merged, highlighting delivery speed. |
| `pickupTime` | `(firstReviewAt - createdAt) / 3_600_000` | hours | Shows how quickly reviewers start evaluating a PR, indicating responsiveness.          |
