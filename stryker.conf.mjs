/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/calculators/*.ts',
    '!src/calculators/idleTimeHours.ts',
    '!src/calculators/cycleTime.ts',
    '!src/calculators/reviewMetrics.ts',
    '!src/calculators/metrics.ts',
  ],
  testRunner: 'jest',
  plugins: ['@stryker-mutator/jest-runner'],
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js'
  },
  reporters: ['clear-text', 'html'],
  coverageAnalysis: 'perTest',
  thresholds: { break: 80 },
};
