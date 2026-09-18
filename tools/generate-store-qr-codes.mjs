#!/usr/bin/env node
// Draws the two store QR codes committed under the consumer app's assets.
//
// Generated once and committed rather than rendered at runtime, because the two
// URLs are fixed by the store listings and change approximately never. A
// committed SVG costs the web bundle nothing, needs no encoder in the browser,
// and is the same bytes in Storybook, in the dev server and in production. See
// GitHub issue #1453.
//
// Re-run it only when a listing identity moves - a new app id, a new package
// name - and commit what it writes.

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// `qrcode-generator` is a UMD package declared with `export =`, so it has no
// ES module entry point to import from here. The same package already draws the
// printed table codes in `bite-tribe-business/floor-plan/ui`; this script is
// deliberately the second caller rather than a second dependency.
const require = createRequire(import.meta.url);
const qrcode = require('qrcode-generator');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIRECTORY = join(ROOT, 'apps/bite-tribe/src/assets/store');

/**
 * The white border around a code, in modules.
 *
 * Four is what ISO/IEC 18004 requires, and a scanner that cannot separate the
 * finder patterns from what surrounds them does not fail loudly - it simply
 * never sees a code. Carried inside the `viewBox` so a caller that sizes the
 * image cannot crop it away.
 */
const QUIET_ZONE_MODULES = 4;

/**
 * Error correction level `M`: about 15% of the code can be lost and still read.
 *
 * The printed table codes use `Q` because they collect thumbprints and sauce.
 * These are drawn on a screen a metre from the camera with nothing between
 * them, so the margin that matters is the one that keeps the code small enough
 * to sit under two buttons rather than the one that survives damage.
 */
const ERROR_CORRECTION = 'M';

/** What each code encodes, and the file it is written to. */
const CODES = [
  {
    name: 'app-store-qr.svg',
    url: 'https://apps.apple.com/app/id6746098595',
  },
  {
    name: 'google-play-qr.svg',
    url: 'https://play.google.com/store/apps/details?id=com.bitetribe.app',
  },
];

/**
 * The dark modules of one row, as SVG path commands.
 *
 * Consecutive dark modules become one horizontal bar rather than one rectangle
 * each: it is a third of the bytes, and it keeps the joins between neighbouring
 * modules from showing as hairlines when the code is scaled up.
 */
const rowPath = (isDark, row, moduleCount) => {
  const commands = [];
  let start = null;

  // One past the last column, so a run reaching the right edge is closed by the
  // same branch that closes every other run.
  for (let column = 0; column <= moduleCount; column += 1) {
    const dark = column < moduleCount && isDark(column);

    if (dark && start === null) {
      start = column;
    } else if (!dark && start !== null) {
      const width = column - start;

      commands.push(
        `M${start + QUIET_ZONE_MODULES} ${
          row + QUIET_ZONE_MODULES
        }h${width}v1h-${width}z`,
      );
      start = null;
    }
  }

  return commands.join('');
};

/**
 * One code as a standalone SVG document.
 *
 * Literal black and white rather than Ionic theme variables, and that is the
 * point rather than an oversight: a scanner needs dark modules on a light quiet
 * zone, and a code that inverted itself in dark mode would look correct on the
 * page and scan as nothing at all.
 */
const codeSvg = (url) => {
  const code = qrcode(0, ERROR_CORRECTION);

  code.addData(url, 'Byte');
  code.make();

  const moduleCount = code.getModuleCount();
  const side = moduleCount + QUIET_ZONE_MODULES * 2;
  const path = Array.from({ length: moduleCount }, (_, row) =>
    rowPath((column) => code.isDark(row, column), row, moduleCount),
  ).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges" role="img"><title>${url}</title><rect width="${side}" height="${side}" fill="#fff"/><path d="${path}" fill="#000"/></svg>\n`;
};

await mkdir(OUTPUT_DIRECTORY, { recursive: true });

for (const { name, url } of CODES) {
  await writeFile(join(OUTPUT_DIRECTORY, name), codeSvg(url), 'utf8');
  console.log(`${name} <- ${url}`);
}
