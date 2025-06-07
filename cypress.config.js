import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:1234',
    specPattern: 'cypress/e2e/**/*.spec.js',
    supportFile: false,
    experimentalFetchPolyfill: true,  // so fetch intercepts work
  },
});