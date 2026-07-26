import { isDevMode } from '@angular/core';
import { Capacitor } from '@capacitor/core';

const NGSW_CACHE_PREFIX = 'ngsw:';

/**
 * The PWA service worker stays web-only (issue \#1067).
 *
 * Capacitor loads the same web build inside a WebView, so a registered ngsw keeps
 * answering from its own cache after a native app update: the user still sees the
 * previous build - old build number, old resources - until ngsw has fetched the
 * new version and the WebView is restarted. Native resources are already shipped
 * and versioned by the store update, so on native the extra caching layer only
 * adds a stale window. On web it stays enabled outside dev mode.
 */
export const isServiceWorkerEnabled = (): boolean =>
  !isDevMode() && !Capacitor.isNativePlatform();

/**
 * Removes a service worker that an earlier native build registered.
 *
 * Skipping registration only keeps new installs clean; an install that already
 * has a worker keeps it forever, so it has to be unregistered at runtime. Cached
 * bundles are dropped only once no worker controls this document, because a
 * controlling worker answers lazy-chunk requests from exactly those caches - the
 * launch after the unregistration is the safe moment to clear them.
 *
 * Never rejects: a failed cleanup must not block app startup.
 */
export const disableServiceWorkerOnNative = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const container: ServiceWorkerContainer | undefined =
    globalThis.navigator?.serviceWorker;

  if (!container) {
    return;
  }

  try {
    const registrations = await container.getRegistrations();

    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );

    if (!container.controller) {
      await deleteServiceWorkerCaches();
    }
  } catch (error) {
    console.warn('Failed to remove the native service worker:', error);
  }
};

const deleteServiceWorkerCaches = async (): Promise<void> => {
  const cacheStorage: CacheStorage | undefined = globalThis.caches;

  if (!cacheStorage) {
    return;
  }

  const keys = await cacheStorage.keys();

  await Promise.all(
    keys
      .filter((key) => key.startsWith(NGSW_CACHE_PREFIX))
      .map((key) => cacheStorage.delete(key)),
  );
};
