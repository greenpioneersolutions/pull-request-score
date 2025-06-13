/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts"],
  moduleNameMapper: {
    "^\.\./api/githubGraphql.js$": "<rootDir>/src/api/githubGraphql.ts",
    "^\.\./src/api/githubGraphql.js$": "<rootDir>/src/api/githubGraphql.ts",
    "^\./collectors/pullRequests.js$":
      "<rootDir>/src/collectors/pullRequests.ts",
    "^\./calculators/cycleTime.js$": "<rootDir>/src/calculators/cycleTime.ts",
    "^\./calculators/reviewMetrics.js$":
      "<rootDir>/src/calculators/reviewMetrics.ts",
    "^\./calculators/metrics.js$": "<rootDir>/src/calculators/metrics.ts",
  },
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};
