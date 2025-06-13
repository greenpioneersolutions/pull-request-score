import fs from "fs";
import { Writable } from "stream";

export interface OutputMetrics {
  cycleTime: { median: number | null; p95: number | null };
  pickupTime: { median: number | null; p95: number | null };
  [key: string]: unknown;
}

export interface WriteOutputOptions {
  /** Output format. Defaults to `json`. */
  format?: "json" | "csv";
  /**
   * Destination for the output. Can be a file path, `"stdout"`,
   * `"stderr"`, or a writable stream instance. Defaults to `"stdout"`.
   */
  destination?: string | Writable;
}

/**
 * Write metrics to a destination in either JSON or CSV format.
 */
export function writeOutput(
  metrics: OutputMetrics,
  opts: WriteOutputOptions = {},
): void {
  const format = opts.format ?? "json";
  const { destination = "stdout" } = opts;

  let output: string;
  if (format === "csv") {
    const rows = [
      ["metric", "median", "p95"],
      [
        "cycleTime",
        String(metrics.cycleTime.median ?? ""),
        String(metrics.cycleTime.p95 ?? ""),
      ],
      [
        "pickupTime",
        String(metrics.pickupTime.median ?? ""),
        String(metrics.pickupTime.p95 ?? ""),
      ],
    ];
    output = rows.map((r) => r.join(",")).join("\n");
  } else {
    output = JSON.stringify(metrics, null, 2);
  }

  const finalOutput = output + "\n";

  if (typeof destination === "string") {
    if (destination === "stdout") {
      process.stdout.write(finalOutput);
    } else if (destination === "stderr") {
      process.stderr.write(finalOutput);
    } else {
      fs.writeFileSync(destination, finalOutput);
    }
  } else if (destination instanceof Writable) {
    destination.write(finalOutput);
  }
}

export default writeOutput;
