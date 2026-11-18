import { Injectable, signal } from '@angular/core';

/**
 * Whether a newer version of the web app is ready, and how to switch to it.
 *
 * The service worker effects announce a ready version here instead of opening a
 * dialog, and the page chrome reads it: a badge on the menu button, and a row in
 * the menu that loads the new version on tap. The member decides when to
 * reload, so nothing interrupts what they are doing (issue #2135).
 *
 * Kept in `utils` rather than next to the effects because the menu lives in a
 * common UI library that must not depend on the consumer app's store. An app
 * that never announces an update simply never shows the badge.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly readyState = signal(false);
  private applyReady: (() => void) | undefined;

  /** True once a newer version is ready to be loaded. */
  readonly ready = this.readyState.asReadonly();

  /** Records a ready version together with the way to switch to it. */
  announce(apply: () => void): void {
    this.applyReady = apply;
    this.readyState.set(true);
  }

  /** Switches to the announced version. Does nothing when none is ready. */
  apply(): void {
    this.applyReady?.();
  }
}
