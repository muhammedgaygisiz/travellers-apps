import { createRequire } from 'node:module';
import { buildNotes } from './changelog-sections.mjs';

const require = createRequire(import.meta.url);
const { readBuildNumber } = require('../apps/bite-tribe/read-build-number.js');

// Prints the changelog range used for store build notes. Pass --full for the
// wider range that becomes the GitHub release body.
//
//   npm run release:notes            store notes for the previous build
//   npm run release:notes -- --full  GitHub release body
//   npm run release:notes -- 92      a specific build

const args = process.argv.slice(2);
const includeChores = args.includes('--full');
const requested = args.find((arg) => /^\d+$/.test(arg));

// The workspace is bumped to x+1 straight after a release, so the build worth
// describing is the previous one unless the caller names it.
const buildNumber =
  requested ?? String(Number(readBuildNumber(process.cwd())) - 1);

try {
  console.log(buildNotes(buildNumber, { includeChores }));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
