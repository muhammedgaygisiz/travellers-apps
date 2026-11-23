// The NX_APP_BITE_TRIBE_* values a web build needs for one Firebase backend
// (issue 1221). Shared by tools/run-ios-simulator.mjs, tools/run-android-qa.mjs
// and tools/build-web-qa.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readNxValues = (file) =>
  Object.fromEntries(
    Object.entries(JSON.parse(readFileSync(file, 'utf8'))).filter(([key]) =>
      key.startsWith('NX_'),
    ),
  );

/**
 * Production returns nothing, so apps/bite-tribe/.env applies as usual. Any
 * other backend builds from apps/bite-tribe-firebase/backends/<name>.json
 * alone.
 *
 * `web: true` also merges `backends/<name>.web.json` when it exists: the values
 * only a hosted web build of that backend needs, such as its reCAPTCHA site
 * key, which the native builds of the same backend must not carry
 * (issue 2293).
 */
export function backendEnv(name, { web = false } = {}) {
  if (name === 'production') {
    return {};
  }
  const base = resolve(`apps/bite-tribe-firebase/backends/${name}.json`);
  const overlay = resolve(`apps/bite-tribe-firebase/backends/${name}.web.json`);
  return {
    ...readNxValues(base),
    ...(web && existsSync(overlay) ? readNxValues(overlay) : {}),
    // Without this Nx still merges apps/bite-tribe/.env underneath, and
    // dotenv-expand treats an empty shell value as unset, so a key this file
    // blanks (the reCAPTCHA site key) came back with its production value.
    NX_LOAD_DOT_ENV_FILES: 'false',
  };
}
