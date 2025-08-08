# Comment Scoring

Pull request metrics include discussion activity. You can reward teams for rich conversations by combining `discussionCoverage` and `commentQuality` in your scoring rules.

```ts
import { scoreMetrics } from '@gh-pr-metrics/core'

const score = scoreMetrics(metrics, [
  { weight: 0.5, metric: 'discussionCoverage', normalize: v => v * 100 },
  { weight: 0.5, metric: 'commentQuality', normalize: v => v * 100 },
])
```

Enable comment quality measurement when computing metrics:

```ts
import { calculateMetrics } from '@gh-pr-metrics/core'

const metrics = await calculateMetrics(prs, { enableCommentQuality: true })
```

You can also reward raw comment volume with a custom rule:

```ts
const totalComments = (m: any) =>
  Object.values(m.commentCounts).reduce((a, b) => a + b, 0)

const score = scoreMetrics(metrics, [
  { weight: 0.7, fn: totalComments },
  { weight: 0.3, metric: 'commentQuality', normalize: v => v * 100 },
])
```
