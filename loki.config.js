// Loki visual regression configuration.
//
// Invoked directly through the upstream oblador/loki CLI (see the `loki:*`
// scripts in package.json and the tools/loki.mjs wrapper) instead of the
// removed `nx-loki` Nx adapter. The wrapper serves the Storybook static build
// produced by `npm run build:storybook` (dist/storybook/storybook-host) and
// points Loki at it via `host.docker.internal` so the same command works
// locally and in CI.
module.exports = {
  diffingEngine: 'looks-same',
  chromeTolerance: 0,
  chromeRetries: 5,
  configurations: {
    'chrome.laptop': {
      target: 'chrome.docker',
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
    },
    'chrome.iphone7': {
      target: 'chrome.docker',
      preset: 'iPhone 7',
    },
  },
};
