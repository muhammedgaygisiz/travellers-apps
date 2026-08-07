import { Injectable } from '@angular/core';

/**
 * Reports when the app's startup navigation has settled.
 *
 * Initial navigation is disabled in both shells and released by the App Check
 * startup gate, so the first navigation is issued late — after auth has been
 * restored. It resolves the browser's current URL, which for a signed-in user
 * ends on Home, and being the last navigation issued it supersedes anything
 * routed before it. A deep target requested while the app was still starting —
 * a tapped push notification — is therefore lost unless it waits for this
 * (issue #1244).
 *
 * A startup that is never released, because App Check is blocked and the retry
 * gate is showing, never settles here either. That is deliberate: there is no
 * routing to join until a retry proves readiness, and callers bound their own
 * wait rather than navigating into a gated app.
 */
@Injectable({ providedIn: 'root' })
export class StartupNavigationService {
  private settled = false;
  private resolveSettled!: () => void;

  private readonly settledPromise = new Promise<void>((resolve) => {
    this.resolveSettled = resolve;
  });

  /** Whether the startup navigation has already completed. */
  hasSettled(): boolean {
    return this.settled;
  }

  /**
   * Records that the startup navigation completed. Called once, by the startup
   * gate that released it; later calls are ignored so a re-entered gate cannot
   * re-open a window that has already closed.
   */
  markSettled(): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolveSettled();
  }

  /**
   * Resolves once the startup navigation has settled, immediately when it
   * already has.
   */
  whenSettled(): Promise<void> {
    return this.settledPromise;
  }
}
