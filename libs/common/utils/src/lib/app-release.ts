import { signal } from '@angular/core';
import { App } from '@capacitor/app';

/**
 * Release metadata inlined by `tools/env-var-plugin.js` at build time.
 *
 * `version` comes from `package.json`, which is the single authored source of
 * the marketing version, and `buildNumber` from the native projects.
 */
declare const process: {
  env: {
    version?: string;
    buildNumber?: string;
  };
};

/** The marketing version and build number this app is running as. */
export interface AppRelease {
  /** Marketing version, e.g. `1.0.1`. Empty when nothing declared one. */
  version: string;
  /** Native build number, e.g. `93`. Empty when nothing declared one. */
  buildNumber: string;
}

/**
 * What the bundle was told about itself when it was built.
 *
 * Correct for every surface, including the web build, as long as the release
 * tooling has kept `package.json` and the native projects in step. It is the
 * only answer the web build can give, since there is no native bundle to ask.
 */
const buildTimeRelease: AppRelease = {
  version: process.env['version'] ?? '',
  buildNumber: process.env['buildNumber'] ?? '',
};

const release = signal<AppRelease>(buildTimeRelease);

/**
 * The release this app reports as its own, everywhere it reports one.
 *
 * Reading a signal keeps the rendering surfaces synchronous while still letting
 * the native values arrive asynchronously: the build-time values render first
 * and are replaced in place once {@link loadAppRelease} resolves.
 */
export const appRelease = release.asReadonly();

let pendingLoad: Promise<AppRelease> | undefined;

const readNativeRelease = async (): Promise<AppRelease | undefined> => {
  try {
    const { version, build } = await App.getInfo();

    return version ? { version, buildNumber: build ?? '' } : undefined;
  } catch {
    // The web build has no native app info to read, so the build-time values
    // stand. They are the same bundle's own metadata, not a guess.
    return undefined;
  }
};

/**
 * Resolves the release, preferring what the native bundle says it is.
 *
 * A native build knows its real `CFBundleShortVersionString` and `versionName`
 * in-process, which makes the reported version independent of whether the
 * release tooling propagated `package.json` correctly. That matters because
 * `appVersion` on the user document exists to diagnose builds already in the
 * field, where the tooling can no longer be fixed (issue #1303).
 *
 * Memoised: the plugin call is a bridge round-trip, and every caller wants the
 * same answer for the lifetime of the process.
 */
export const loadAppRelease = (): Promise<AppRelease> =>
  (pendingLoad ??= readNativeRelease().then((nativeRelease) => {
    if (nativeRelease) {
      release.set(nativeRelease);
    }

    return release();
  }));

/** Test seam: forgets the memoised load and the resolved native values. */
export const resetAppReleaseForTesting = (): void => {
  pendingLoad = undefined;
  release.set(buildTimeRelease);
};
