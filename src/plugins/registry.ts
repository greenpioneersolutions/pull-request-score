import type { MetricPlugin } from "./MetricPlugin.js";

let plugins: MetricPlugin[] | undefined;

export function register(plugin: MetricPlugin): void {
  if (!plugins) plugins = [];
  plugins.push(plugin);
}

export function getAll(): MetricPlugin[] {
  return [...(plugins ?? [])];
}

// Auto-register built-in calculators
import "../calculators/changeRequestRatio.js";
import "../calculators/commentDensity.js";
import "../calculators/cycleTime.js";
import "../calculators/idleTimeHours.js";
import "../calculators/reviewerCount.js";
import "../calculators/revertRate.js";
import "../calculators/ciPassRate.js";
import "../calculators/ciMetrics.js";
import "../calculators/reviewMetrics.js";
import "../calculators/sizeBucket.js";
import "../calculators/outsizedFlag.js";
