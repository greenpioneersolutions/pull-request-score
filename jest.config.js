/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts"],
  testPathIgnorePatterns: ["<rootDir>/.stryker-tmp"],
  moduleNameMapper: {
    "^\.\./api/githubGraphql.js$": "<rootDir>/src/api/githubGraphql.ts",
    "^\.\./src/api/githubGraphql.js$": "<rootDir>/src/api/githubGraphql.ts",
    "^\./collectors/pullRequests.js$":
      "<rootDir>/src/collectors/pullRequests.ts",
    "^\./calculators/cycleTime.js$": "<rootDir>/src/calculators/cycleTime.ts",
    "^\./calculators/reviewMetrics.js$":
      "<rootDir>/src/calculators/reviewMetrics.ts",
    "^\./calculators/metrics.js$": "<rootDir>/src/calculators/metrics.ts",
    "^\./calculators/ciMetrics.js$": "<rootDir>/src/calculators/ciMetrics.ts",
    "^\./calculators/commentDensity.js$":
      "<rootDir>/src/calculators/commentDensity.ts",
    "^\./calculators/changeRequestRatio.js$":
      "<rootDir>/src/calculators/changeRequestRatio.ts",
    "^\./calculators/idleTimeHours.js$":
      "<rootDir>/src/calculators/idleTimeHours.ts",
    "^\./calculators/reviewerCount.js$":
      "<rootDir>/src/calculators/reviewerCount.ts",
    "^\./calculators/revertRate.js$": "<rootDir>/src/calculators/revertRate.ts",
    "^\./calculators/ciPassRate.js$": "<rootDir>/src/calculators/ciPassRate.ts",
    "^\./calculators/sizeBucket.js$": "<rootDir>/src/calculators/sizeBucket.ts",
    "^\./calculators/outsizedFlag.js$":
      "<rootDir>/src/calculators/outsizedFlag.ts",
    "^\.\.\/calculators/commentDensity.js$":
      "<rootDir>/src/calculators/commentDensity.ts",
    "^\.\.\/calculators/changeRequestRatio.js$":
      "<rootDir>/src/calculators/changeRequestRatio.ts",
    "^\.\.\/calculators/idleTimeHours.js$":
      "<rootDir>/src/calculators/idleTimeHours.ts",
    "^\.\.\/calculators/reviewerCount.js$":
      "<rootDir>/src/calculators/reviewerCount.ts",
    "^\.\.\/calculators/revertRate.js$":
      "<rootDir>/src/calculators/revertRate.ts",
    "^\.\.\/calculators/ciPassRate.js$":
      "<rootDir>/src/calculators/ciPassRate.ts",
    "^\.\.\/calculators/ciMetrics.js$":
      "<rootDir>/src/calculators/ciMetrics.ts",
    "^\.\.\/calculators/sizeBucket.js$":
      "<rootDir>/src/calculators/sizeBucket.ts",
    "^\.\./calculators/outsizedFlag.js$":
      "<rootDir>/src/calculators/outsizedFlag.ts",
    "^\./output/writers.js$": "<rootDir>/src/output/writers.ts",
    "^\./plugins/registry.js$": "<rootDir>/src/plugins/registry.ts",
    "^\.\.\/plugins/registry.js$": "<rootDir>/src/plugins/registry.ts",
    "^\.\.\/calculators/cycleTime.js$":
      "<rootDir>/src/calculators/cycleTime.ts",
    "^\.\.\/calculators/reviewMetrics.js$":
      "<rootDir>/src/calculators/reviewMetrics.ts",
    "^\./cache/sqliteStore.js$": "<rootDir>/src/cache/sqliteStore.ts",
    "^\\./auth/getAuthStrategy.js$": "<rootDir>/src/auth/getAuthStrategy.ts",
    "^\./logger.js$": "<rootDir>/src/logger.ts",
    "^\.\.\/src/logger.js$": "<rootDir>/src/logger.ts",
    "^\\.\\./src/auth/getAuthStrategy.js$":
      "<rootDir>/src/auth/getAuthStrategy.ts",
    "^\\.\\./auth/getAuthStrategy.js$": "<rootDir>/src/auth/getAuthStrategy.ts",
  },
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
};
