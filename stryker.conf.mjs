/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: ['src/calculators/**/*.ts'],
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
