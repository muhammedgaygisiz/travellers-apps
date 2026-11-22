import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/**
 * The IndexedDB database Firebase Auth keeps the web session in. The name is
 * the SDK's, not ours; it has been the same since the modular SDK began.
 */
export const FIREBASE_AUTH_DB_NAME = 'firebaseLocalStorageDb';

/** How long an open of that database may take before it counts as stuck. */
export const AUTH_STORAGE_PROBE_TIMEOUT_MS = 3_000;

export type AuthStorageProbeResult = 'responsive' | 'stuck' | 'unavailable';

/**
 * Opens Firebase Auth's database once, to learn whether the browser answers.
 *
 * - `responsive`: the open finished, either way. A database that does not
 *   exist yet counts too: the open is aborted in `upgradeneeded`, so the probe
 *   never creates the database it is checking.
 * - `stuck`: nothing came back within the timeout. That is what a pending
 *   delete or a blocked upgrade from another tab looks like: every open on the
 *   origin queues behind it, Firebase Auth's included.
 * - `unavailable`: there is no IndexedDB to ask, or it threw. Firebase Auth
 *   falls back to other storage then, so this is not reported as stuck.
 *
 * A connection the probe gets, however late, is closed at once, so the probe
 * never becomes the thing another tab's upgrade waits for.
 */
export const probeAuthStorage = (
  idb: IDBFactory | undefined = globalThis.indexedDB,
  timeoutMs = AUTH_STORAGE_PROBE_TIMEOUT_MS,
): Promise<AuthStorageProbeResult> => {
  if (!idb) {
    return Promise.resolve('unavailable');
  }

  return new Promise<AuthStorageProbeResult>((resolve) => {
    let settled = false;

    const settle = (result: AuthStorageProbeResult): void => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }
    };

    const timer = setTimeout(() => settle('stuck'), timeoutMs);

    let request: IDBOpenDBRequest;

    try {
      request = idb.open(FIREBASE_AUTH_DB_NAME);
    } catch {
      settle('unavailable');
      return;
    }

    request.onupgradeneeded = (): void => {
      request.transaction?.abort();
    };
    request.onsuccess = (): void => {
      request.result.close();
      settle('responsive');
    };
    request.onerror = (event): void => {
      // An abort from `upgradeneeded` lands here; keep it from surfacing as
      // an uncaught error on the page.
      event.preventDefault();
      settle('responsive');
    };
  });
};

/**
 * Whether the browser's storage for Firebase Auth is stuck, so that the apps
 * can say so instead of signing in forever (GitHub issue #2253).
 *
 * When that database cannot be opened, Firebase Auth never finishes starting:
 * no session is restored, a sign-in waits behind it, and nothing fails or
 * logs. The user sees "Signing you in…" for good. This service is told when
 * Auth has taken too long, asks the database directly, and raises
 * {@link isStuck} when it does not answer. Each app shows its storage gate on
 * that signal, the same way it shows the App Check gate.
 *
 * Web only. The native apps restore the session through the platform SDK, and
 * their web view has no second tab to hold the database.
 */
@Injectable({ providedIn: 'root' })
export class AuthStorageHealthService {
  private readonly _isStuck = signal(false);
  private checking: Promise<AuthStorageProbeResult> | null = null;

  readonly isStuck = this._isStuck.asReadonly();

  /**
   * Asks the storage now. Concurrent calls share one probe. Raises
   * {@link isStuck} on `stuck`, and never lowers it: only Auth answering does
   * that, through {@link markResponsive}.
   */
  check(
    probe: () => Promise<AuthStorageProbeResult> = probeAuthStorage,
  ): Promise<AuthStorageProbeResult> {
    if (Capacitor.isNativePlatform()) {
      return Promise.resolve('responsive');
    }

    this.checking ??= probe()
      .then((result) => {
        if (result === 'stuck') {
          this._isStuck.set(true);
        }

        return result;
      })
      .finally(() => {
        this.checking = null;
      });

    return this.checking;
  }

  /**
   * Auth answered after all, for example because the user closed the tab that
   * held the database, so the gate lifts on its own.
   */
  markResponsive(): void {
    this._isStuck.set(false);
  }
}
