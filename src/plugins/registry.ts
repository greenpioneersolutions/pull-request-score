import type { MetricPlugin } from "./MetricPlugin.js";

const plugins: MetricPlugin[] = [];

export function register(plugin: MetricPlugin): void {
  plugins.push(plugin);
}

export function getAll(): MetricPlugin[] {
  return [...plugins];
}
