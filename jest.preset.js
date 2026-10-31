const path = require('path');
const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  /* TODO: Update to latest Jest snapshotFormat
   * By default Nx has kept the older style of Jest Snapshot formats
   * to prevent breaking of any existing tests with snapshots.
   * It's recommend you update to the latest format.
   * You can do this by removing snapshotFormat property
   * and running tests with --update-snapshot flag.
   * Example: "nx affected --targets=test --update-snapshot"
   * More info: https://jestjs.io/docs/upgrading-to-jest29#snapshot-format
   */
  snapshotFormat: { escapeString: true, printBasicPrototype: true },
  // Under the workspace rather than /tmp, so CI can persist the transforms
  // between runs (issue #1813). `tmp` is gitignored.
  cacheDirectory: path.resolve(__dirname, 'tmp/jest-cache'),
  roots: ['<rootDir>', path.resolve(__dirname, './__mocks__')],
  setupFilesAfterEnv: [
    path.resolve(__dirname, './__mocks__/fetch.js'),
    path.resolve(__dirname, './__mocks__/resize-observer.js'),
    path.resolve(__dirname, './__mocks__/ionic-asset-path.js'),
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
