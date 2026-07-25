import { computed, Injectable, signal } from '@angular/core';

export type AppCheckReadinessStatus = 'pending' | 'ready' | 'blocked';

type RetryHandler = () => Promise<void>;

/**
 * Holds the App Check startup-gate state for the shell.
 *
 * The startup initializer owns the transitions: it marks the app `ready` once
 * App Check token readiness is proven (or enforcement is off), and `blocked`
 * when enforced readiness fails. While `blocked`, the root component renders a
 * retry gate instead of the router outlet, so no protected Firebase traffic
 * starts. The gate calls {@link retry}, which delegates to the handler the
 * initializer registered (re-preflight the token, then resume auth and initial
 * navigation on success).
 */
@Injectable({ providedIn: 'root' })
export class AppCheckReadinessService {
  private readonly _status = signal<AppCheckReadinessStatus>('pending');
  private readonly _retrying = signal(false);
  private retryHandler: RetryHandler | null = null;

  readonly status = this._status.asReadonly();
  readonly isBlocked = computed(() => this._status() === 'blocked');
  readonly isRetrying = this._retrying.asReadonly();

  markReady(): void {
    this._status.set('ready');
  }

  markBlocked(): void {
    this._status.set('blocked');
  }

  registerRetryHandler(handler: RetryHandler): void {
    this.retryHandler = handler;
  }

  async retry(): Promise<void> {
    if (this._retrying() || !this.retryHandler) {
      return;
    }

    this._retrying.set(true);
    try {
      await this.retryHandler();
    } finally {
      this._retrying.set(false);
    }
  }
}
