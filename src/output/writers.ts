import fs from "fs";
import path from "path";
import { Writable } from "stream";

export interface OutputMetrics {
  cycleTime: { median: number | null; p95: number | null };
  pickupTime: { median: number | null; p95: number | null };
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
 * Flatten a metrics object into CSV rows.
 * Handles nested objects by joining keys with dots.
 */
export function flattenToRows(
  data: Record<string, unknown>,
): string[][] {
  const rows: string[][] = [["metric", "value"]];

  function walk(obj: unknown, prefix: string): void {
    if (obj === null || obj === undefined) {
      rows.push([prefix, ""]);
    } else if (Array.isArray(obj)) {
      rows.push([prefix, obj.map(String).join(";")]);
    } else if (typeof obj === "object") {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
    } else {
      rows.push([prefix, String(obj)]);
    }
  }

  walk(data, "");
  return rows;
}

/**
 * Escape a value for CSV output per RFC 4180.
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 */
function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Write metrics to a destination in either JSON or CSV format.
 * Accepts any data shape — JSON serializes directly, CSV flattens to rows.
 */
export function writeOutput(
  metrics: Record<string, unknown>,
  opts: WriteOutputOptions = {},
): void {
  const format = opts.format ?? "json";
  const { destination = "stdout" } = opts;

  let output: string;
  if (format === "csv") {
    const rows = flattenToRows(metrics);
    output = rows
      .map((r) => r.map(csvEscape).join(","))
      .join("\n");
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
      const resolved = path.resolve(destination);
      if (resolved === "/" || resolved === path.sep) {
        throw new Error(`Refusing to write to root path: ${destination}`);
      }
      fs.writeFileSync(resolved, finalOutput);
    }
  } else if (destination instanceof Writable) {
    destination.write(finalOutput);
  }
}

export default writeOutput;
