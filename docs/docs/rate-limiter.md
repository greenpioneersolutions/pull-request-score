# Rate Limiter

The library exposes a small utility called `createRateLimiter` to help
pace requests to the GitHub API. Internally it wraps a [Bottleneck](https://github.com/SGrondin/bottleneck)
instance and schedules work so that no more than a fixed number of
operations are executed per minute.

```ts
import { createRateLimiter } from '@gh-pr-metrics/core'

// allow 60 requests each minute
const limit = createRateLimiter({ requestsPerMinute: 60 })

// schedule API calls
await limit(() => fetch('https://api.github.com/'))
```

If no `requestsPerMinute` value is provided the limiter defaults to the
standard GitHub API throughput of roughly 5000 requests per hour.
