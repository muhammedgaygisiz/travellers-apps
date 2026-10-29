import { DOCUMENT, inject, Injectable } from '@angular/core';
import confetti from 'canvas-confetti';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';

/**
 * The moments bite-tribe celebrates (epic #1741). Each is a first or a
 * completion the user reaches once in the normal course of use, never a
 * routine action.
 */
export type CelebrationMoment =
  | 'first-bite'
  | 'first-country'
  | 'onboarding-finished'
  | 'first-follow'
  | 'bite-trail-completed';

/**
 * The toast each moment raises in place of its ordinary success toast. The
 * copy behind each key is added by the issue that wires the moment.
 */
export const CELEBRATION_MESSAGE_KEYS: Record<CelebrationMoment, string> = {
  'first-bite': 'bite-created-first',
  'first-country': 'country-badge-earned',
  'onboarding-finished': 'onboarding-finished',
  'first-follow': 'first-follow',
  'bite-trail-completed': 'bite-trail-completed',
};

/**
 * One burst from the bottom centre, straight up. The values are the starting
 * point for the on-device tuning in issue #1801.
 */
export const CELEBRATION_BURST: confetti.Options = {
  origin: { x: 0.5, y: 1 },
  angle: 90,
  particleCount: 80,
  spread: 70,
  startVelocity: 45,
  ticks: 120,
  scalar: 0.8,
  disableForReducedMotion: true,
};

/**
 * The theme colours the confetti is drawn in, read at fire time so dark mode
 * applies without a second palette. `--ion-color-tertiary` is left out: in
 * both modes it sits a shade away from the page background and would draw
 * invisible particles.
 */
export const CELEBRATION_COLOR_PROPERTIES = [
  '--ion-color-primary',
  '--bite-tribe-color',
  '--ion-color-secondary',
] as const;

/**
 * Above every Ionic overlay, so a burst is never drawn behind the toast it
 * accompanies. The canvas takes no pointer events, so nothing under it is
 * covered.
 */
const CANVAS_Z_INDEX = '100000';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The single way bite-tribe celebrates a moment.
 *
 * A celebration is one short confetti burst from the bottom of the screen, the
 * moment's own success toast, and the `success` haptic `ToastService` already
 * plays for it. The confetti plays no haptic of its own, so each moment is one
 * action with one reaction. This is the only file that imports
 * `canvas-confetti`.
 *
 * **An overlay, never in the way.** The burst is drawn on a full-viewport
 * canvas appended to the document body - not to a page, so it keeps running
 * across a route change - with `pointer-events: none`, and the canvas is
 * removed when the burst ends.
 *
 * **One at a time.** A celebration that starts while a burst is still running
 * presents its toast but draws no second burst.
 *
 * **Reduced motion.** Under `prefers-reduced-motion: reduce` no canvas is
 * created at all; the toast and haptic still mark the moment.
 *
 * **Never rejects.** The celebration decorates an action the caller has
 * already completed, so any failure of the confetti is swallowed - the same
 * posture `ToastService.present()` holds.
 */
@Injectable({ providedIn: 'root' })
export class CelebrationService {
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);

  private bursting = false;

  /**
   * Celebrates `moment`. Resolves once the toast is presented and the burst,
   * if one is drawn, has ended. `params` fill the moment's toast copy, such as
   * the country of a first Bite there.
   */
  async celebrate(
    moment: CelebrationMoment,
    params?: Record<string, unknown>,
  ): Promise<void> {
    this.analytics.logEvent(AnalyticsEvent.CelebrationShown, { moment });

    await Promise.all([
      this.toast.present({
        messageKey: CELEBRATION_MESSAGE_KEYS[moment],
        params,
        outcome: 'success',
      }),
      this.burst(),
    ]);
  }

  private async burst(): Promise<void> {
    const view = this.document.defaultView;

    if (
      this.bursting ||
      !view ||
      view.matchMedia(REDUCED_MOTION_QUERY).matches
    ) {
      return;
    }

    this.bursting = true;

    const canvas = this.document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: CANVAS_Z_INDEX,
    });
    this.document.body.appendChild(canvas);

    try {
      const fire = confetti.create(canvas, { resize: true, useWorker: true });

      await fire({ ...CELEBRATION_BURST, colors: this.colors(view) });
    } catch {
      // Nothing to fall back to; the toast already marks the moment.
    } finally {
      canvas.remove();
      this.bursting = false;
    }
  }

  /** The theme colours that are set, or the library's own when none is. */
  private colors(view: Window): string[] | undefined {
    const style = view.getComputedStyle(this.document.documentElement);
    const colors = CELEBRATION_COLOR_PROPERTIES.map((property) =>
      style.getPropertyValue(property).trim(),
    ).filter((color) => color.length > 0);

    return colors.length > 0 ? colors : undefined;
  }
}
