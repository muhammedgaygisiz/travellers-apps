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
  // Per-pixel colour-distance threshold (CIEDE2000) below which a pixel counts
  // as unchanged. ~2.3 is the "just noticeable difference" for human vision, so
  // 2.5 absorbs sub-pixel anti-aliasing noise - which `looks-same` misses on
  // curved borders such as rounded button corners, causing rare phantom diffs
  // even though the render is otherwise deterministic - while still flagging any
  // visible change. Keep as low as practical; do not raise it to hide real diffs.
  chromeTolerance: 2.5,
  chromeRetries: 5,
  // Loki fails a story if any request fails to load. Visual references must not
  // depend on live third-party services (OpenStreetMap tiles, web fonts, Google
  // avatars, Firebase Storage photos, ...), which can be blocked or flaky inside
  // the docker Chrome. `fetchFailIgnore` is compiled to a case-insensitive
  // RegExp and tested against each failed URL: this negative lookahead ignores
  // failures from every host except our own served Storybook build
  // (host.docker.internal, see tools/loki.mjs), so a genuinely missing bundled
  // asset still fails the story while external noise does not.
  fetchFailIgnore: '^https?://(?!host\\.docker\\.internal)',
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
