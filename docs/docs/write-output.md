# Writing Output

Use the `writeOutput` helper to write calculated metrics in different formats.

```
writeOutput(metrics, options?)
```

- `metrics` – Object containing the metrics you generated.
- `options.format` – Either `"json"` or `"csv"`. Defaults to `json`.
- `options.destination` – Where to send the output. You can pass a
  file path, `"stdout"`, `"stderr"`, or a writable stream. Defaults to
  `stdout`.

Example:

```ts
import { writeOutput } from 'pull-request-score';

writeOutput(metrics, { format: 'csv', destination: 'metrics.csv' });
writeOutput(metrics, { destination: 'stderr' });
```

When the destination is a writable stream, the output is written
synchronously using the stream's `write` method.

