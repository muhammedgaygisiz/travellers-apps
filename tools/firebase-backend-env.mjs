// The NX_APP_BITE_TRIBE_* values a web build needs for one Firebase backend
// (issue 1221). Shared by tools/run-ios-simulator.mjs and
// tools/run-android-qa.mjs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Production returns nothing, so apps/bite-tribe/.env applies as usual. Any
 * other backend builds from apps/bite-tribe-firebase/backends/<name>.json
 * alone.
 */
export function backendEnv(name) {
  if (name === 'production') {
    return {};
  }
  const file = resolve(`apps/bite-tribe-firebase/backends/${name}.json`);
  const entries = Object.entries(JSON.parse(readFileSync(file, 'utf8')));
  return {
    ...Object.fromEntries(entries.filter(([key]) => key.startsWith('NX_'))),
    // Without this Nx still merges apps/bite-tribe/.env underneath, and
    // dotenv-expand treats an empty shell value as unset, so a key this file
    // blanks (the reCAPTCHA site key) came back with its production value.
    NX_LOAD_DOT_ENV_FILES: 'false',
  };
}
