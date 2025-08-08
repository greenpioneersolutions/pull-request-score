import { scoreMetrics } from "../dist/scoring.js";

const metrics = { mergeRate: 0.95, reviewCoverage: 0.8 };

const score = scoreMetrics(metrics, [
  { weight: 0.5, metric: "mergeRate", normalize: (v) => Math.round(v * 100) },
  {
    weight: 0.5,
    metric: "reviewCoverage",
    normalize: (v) => Math.round(v * 100),
  },
]);

console.log("Score:", score);
