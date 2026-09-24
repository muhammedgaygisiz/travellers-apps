import { computed, Injectable, signal } from '@angular/core';

export type AppCheckReadinessStatus =
  'pending' | 'ready' | 'blocked' | 'unavailable';

/**
 * The backoff a mid-session recovery walks, one entry per attempt.
 *
 * The wait has to be bounded, because a page that waits forever is the state
 * this recovery exists to replace. Roughly a minute over four attempts: long
 * enough to sit out the connectivity blip that produces most of these - the
 * SDK's own auto-refresh is working the same problem in parallel - and short
 * enough that an operator who is going to have to act finds that out while
 * they are still looking at the screen.
 *
 * Exported so the cold-start gate can adopt the same bound when issue #1465
 * gives that path one.
 */
export const APP_CHECK_RECOVERY_DELAYS_MS: readonly number[] = [
  1_000, 4_000, 15_000, 45_000,
];

/**
 * What a re-check is being asked to prove.
 *
 * `requireToken` is set when a live request has already been refused for a
 * missing or invalid App Check token. The client's enforcement flag has been
 * contradicted by then, so the re-check must ask for a token whatever the flag
 * says (issue #1621).
 */
export type AppCheckRetryContext = {
  requireToken: boolean;
};

type RetryHandler = (context: AppCheckRetryContext) => Promise<void>;

/**
 * Holds the App Check readiness state for the shell.
 *
 * The startup initializer owns the transitions: it marks the app `ready` once
 * App Check token readiness is proven (or enforcement is off), and `blocked`
 * when enforced readiness fails. While `blocked` or `unavailable`, the root
 * component renders the gate instead of the router outlet, so no protected
 * Firebase traffic starts. The gate calls {@link retry}, which delegates to the
 * handler the initializer registered (re-preflight the token, then resume auth
 * and initial navigation on success).
 *
 * **Readiness is not a startup question.** A page that started with a token
 * can lose it: a connectivity blip answers the App Check exchange 403, the SDK
 * applies a one-day backoff, and from that moment every protected request on
 * that page is refused although the app is running and looks well. Until issue
 * #1621 that page had no way back - the retry handler was registered only on
 * the startup-failure branch, so a page that had started successfully called
 * {@link retry} into nothing - and a reload was the only exit, which nothing
 * told the operator about. {@link reportTokenLost} is the way in from there,
 * and {@link recover} is the bounded wait that follows it.
 */
@Injectable({ providedIn: 'root' })
export class AppCheckReadinessService {
  private readonly _status = signal<AppCheckReadinessStatus>('pending');
  private readonly _retrying = signal(false);
  private retryHandler: RetryHandler | null = null;
  private recovering = false;

  /**
   * Whether a token was proven missing rather than merely not yet obtained.
   *
   * Once a live request has been refused for an App Check token, every later
   * re-check in this page has to ask for a real one, whatever the build's
   * enforcement flag claims.
   */
  private tokenProvenLost = false;

  readonly status = this._status.asReadonly();
  readonly isBlocked = computed(
    () => this._status() === 'blocked' || this._status() === 'unavailable',
  );
  readonly isRetrying = this._retrying.asReadonly();

  markReady(): void {
    this._status.set('ready');
  }

  markBlocked(): void {
    this._status.set('blocked');
  }

  /**
   * The terminal state of a bounded recovery: the wait is over and the token
   * did not come back. The gate stays up and its retry is tappable again, so
   * the state ends in something an operator can act on rather than in a
   * spinner that never stops.
   */
  markUnavailable(): void {
    this._status.set('unavailable');
  }

  registerRetryHandler(handler: RetryHandler): void {
    this.retryHandler = handler;
  }

  /**
   * Reports that a request this page made was refused for a missing or invalid
   * App Check token, and waits out the bounded recovery that follows.
   *
   * Only a running app enters here. A startup that never proved readiness is
   * the gate's own business and is already blocked; re-entering would restart
   * a recovery that is running, or overwrite the terminal state of one that
   * finished.
   */
  async reportTokenLost(): Promise<void> {
    this.tokenProvenLost = true;

    if (this._status() !== 'ready' || this.recovering) {
      return;
    }

    this._status.set('blocked');
    await this.recover();
  }

  async retry(): Promise<void> {
    if (this._retrying() || !this.retryHandler) {
      return;
    }

    this._retrying.set(true);
    try {
      await this.retryHandler({ requireToken: this.tokenProvenLost });
    } finally {
      this._retrying.set(false);
    }
  }

  /**
   * Re-checks the token on the backoff above until one arrives or the attempts
   * run out, then leaves the app in `ready` or `unavailable`.
   *
   * The handler marks the app ready itself when a token comes back, which is
   * what this reads between attempts: the SDK's own auto-refresh can resolve
   * the state without this loop's help, and a recovery that did not notice
   * would go on waiting next to a healthy client.
   */
  private async recover(): Promise<void> {
    this.recovering = true;

    try {
      for (const delayMs of APP_CHECK_RECOVERY_DELAYS_MS) {
        await this.wait(delayMs);

        if (this._status() === 'ready') {
          return;
        }

        await this.retry();

        if (this._status() === 'ready') {
          return;
        }
      }

      this.markUnavailable();
    } finally {
      this.recovering = false;
    }
  }

  private wait(delayMs: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  }
}
