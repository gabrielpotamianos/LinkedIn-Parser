/**
 * Jest configuration for LinkedIn Parser extension
 * @see https://jestjs.io/docs/configuration
 */
module.exports = {
  // Simulate a browser-like environment for DOM APIs
  testEnvironment: 'jsdom',

  // Mock out chrome.* APIs before each test
  setupFiles: ['jest-chrome'],

  // Look for test files under the "tests/" directory
  roots: ['<rootDir>/tests'],

  // Recognize .test.js or .spec.js anywhere under "tests/"
  testMatch: [
    '<rootDir>/tests/**/auth.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],

  // (Optional) Collect coverage info
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
};