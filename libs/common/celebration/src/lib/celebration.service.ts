import { DOCUMENT, inject, Injectable } from '@angular/core';
import confetti from 'canvas-confetti';
import { SoundsService } from 'sounds';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';

/**
 * The moments bite-tribe celebrates. Epic #1741 brought the firsts and the
 * completion, each reached once in the normal course of use; epic #2012 added a
 * few round Bite counts and progress in the leaderboard's top ten. Nothing else
 * is celebrated, so a routine post stays a routine post.
 */
export type CelebrationMoment =
  | 'first-bite'
  | 'first-country'
  | 'onboarding-finished'
  | 'first-follow'
  | 'bite-trail-completed'
  | 'bite-milestone'
  | 'leaderboard-top-ten'
  | 'leaderboard-overtake';

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
  'bite-milestone': 'bite-milestone',
  'leaderboard-top-ten': 'leaderboard-top-ten',
  'leaderboard-overtake': 'leaderboard-overtake',
};

/**
 * The toast a thousandth Bite raises in place of `bite-milestone`'s own
 * (issue #2013). `bite-milestone` picks between the two from `params.count`.
 */
export const CELEBRATION_THOUSAND_MESSAGE_KEY = 'bite-milestone-thousand';

/**
 * Which moment wins when one Bite earns several (issue #2013), highest first.
 * The moments after `first-bite` arrive from separate snapshots seconds after
 * the post, so they are held for {@link CELEBRATION_SETTLING_WINDOW_MS} and
 * only the highest of them plays. A moment not listed here is a direct
 * reaction to a tap and plays at once.
 */
export const CELEBRATION_PRECEDENCE: readonly CelebrationMoment[] = [
  'first-bite',
  'first-country',
  'bite-milestone',
  'leaderboard-top-ten',
  'leaderboard-overtake',
];

/**
 * How long a held moment waits for the others one Bite may still earn
 * (issue #2013). The window opens with the first held moment, or with a
 * `first-bite` that plays, and is tuned on the reference devices in the
 * epic's acceptance story.
 */
export const CELEBRATION_SETTLING_WINDOW_MS = 3000;

/** The moments that wait out the settling window before they play. */
const HELD_MOMENTS: ReadonlySet<CelebrationMoment> = new Set(
  CELEBRATION_PRECEDENCE.filter((moment) => moment !== 'first-bite'),
);

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
 * One cannon of a burst: the options it fires with, and how long after the
 * burst starts it fires. An `emoji` shot draws food emoji instead of the
 * theme colours.
 */
export interface CelebrationShot {
  readonly delayMs: number;
  readonly options: confetti.Options;
  readonly emoji?: boolean;
}

/** The food the grand burst throws among its confetti. */
export const CELEBRATION_GRAND_BURST_EMOJI = ['🍜', '🍕', '🌮', '🍣'] as const;

/**
 * The bigger burst every thousandth Bite plays (issue #2013), the one
 * celebration above the standard burst's ceiling. Both bottom corners fire
 * inwards at once, then the bottom centre 250 ms later, with food emoji among
 * the confetti: 250 particles over about 3 s. The values are the starting point
 * for the on-device tuning in the epic's acceptance story.
 */
export const CELEBRATION_GRAND_BURST: readonly CelebrationShot[] = [
  {
    delayMs: 0,
    options: {
      origin: { x: 0, y: 1 },
      angle: 60,
      particleCount: 70,
      spread: 55,
      startVelocity: 60,
      ticks: 180,
      scalar: 0.8,
      disableForReducedMotion: true,
    },
  },
  {
    delayMs: 0,
    options: {
      origin: { x: 1, y: 1 },
      angle: 120,
      particleCount: 70,
      spread: 55,
      startVelocity: 60,
      ticks: 180,
      scalar: 0.8,
      disableForReducedMotion: true,
    },
  },
  {
    delayMs: 250,
    options: {
      origin: { x: 0.5, y: 1 },
      angle: 90,
      particleCount: 60,
      spread: 100,
      startVelocity: 50,
      ticks: 180,
      scalar: 0.8,
      disableForReducedMotion: true,
    },
  },
  {
    delayMs: 250,
    emoji: true,
    options: {
      origin: { x: 0.5, y: 1 },
      angle: 90,
      particleCount: 50,
      spread: 80,
      startVelocity: 45,
      ticks: 180,
      scalar: 2,
      flat: true,
      disableForReducedMotion: true,
    },
  },
];

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
 * The longest a burst may hold its canvas (issue #2039). A burst runs about
 * 2 s, but `canvas-confetti` settles its promise only when its worker reports
 * the last frame drawn, and that report can come late or never: while the app
 * is in the background, the WebView is paused or the renderer is starved. Past
 * this bound the burst is stopped and its canvas removed regardless, so one
 * stalled burst can neither stay on screen nor block every later one.
 */
export const BURST_TIMEOUT_MS = 4000;

/**
 * The same bound for the grand burst, which runs about 3.25 s from its first
 * shot to its last particle.
 */
export const GRAND_BURST_TIMEOUT_MS = 5000;

/** A burst variant: its shots, and the longest it may hold its canvas. */
interface Burst {
  readonly shots: readonly CelebrationShot[];
  readonly timeoutMs: number;
}

const STANDARD: Burst = {
  shots: [{ delayMs: 0, options: CELEBRATION_BURST }],
  timeoutMs: BURST_TIMEOUT_MS,
};

const GRAND: Burst = {
  shots: CELEBRATION_GRAND_BURST,
  timeoutMs: GRAND_BURST_TIMEOUT_MS,
};

/** A held moment waiting for its settling window to close. */
interface HeldCelebration {
  readonly moment: CelebrationMoment;
  readonly params?: Record<string, unknown>;
  /** Settles the caller's `celebrate()`, whether the moment played or not. */
  readonly done: () => void;
}

/** The settling window currently open. */
interface SettlingWindow {
  /** A `first-bite` played in it, so no held moment does. */
  firstBite: boolean;
  /** The highest held moment raised in it so far. */
  best?: HeldCelebration;
}

/** `celebration_shown`'s parameters: the moment, and its count or rank. */
interface CelebrationShownParams {
  moment: CelebrationMoment;
  count?: number;
  rank?: number;
}

/**
 * The single way bite-tribe celebrates a moment.
 *
 * A celebration is one short confetti burst from the bottom of the screen - or
 * the grand burst, for a thousandth Bite - the moment's own success toast, the `success` haptic `ToastService` already
 * plays for it, and the `celebration` sound from `SoundsService` (issue
 * #1846). The confetti plays no haptic of its own, so each moment is one
 * action with one reaction. This is the only file that imports
 * `canvas-confetti`.
 *
 * **An overlay, never in the way.** The burst is drawn on a full-viewport
 * canvas appended to the document body - not to a page, so it keeps running
 * across a route change - with `pointer-events: none`, and the canvas is
 * removed when the burst ends, or after {@link BURST_TIMEOUT_MS} at the latest.
 *
 * **One Bite, one celebration.** The moments one post can earn arrive from
 * separate snapshots seconds apart, so those in {@link CELEBRATION_PRECEDENCE}
 * after `first-bite` are held for {@link CELEBRATION_SETTLING_WINDOW_MS} and
 * only the highest one raised in that window plays. A `first-bite` that played
 * in the window suppresses them all. A suppressed moment presents nothing,
 * plays nothing and logs nothing.
 *
 * **One at a time.** A celebration that starts while a burst is still running
 * presents its toast but draws no second burst, and one that starts while the
 * sound is still playing plays no second sound - `SoundsService` drops it.
 *
 * **Reduced motion.** Under `prefers-reduced-motion: reduce` no canvas is
 * created at all; the toast, haptic and sound still mark the moment, because a
 * sound is not motion.
 *
 * **Never rejects.** The celebration decorates an action the caller has
 * already completed, so any failure of the confetti or the sound is swallowed
 * - the same posture `ToastService.present()` holds.
 */
@Injectable({ providedIn: 'root' })
export class CelebrationService {
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(AnalyticsService);
  private readonly sounds = inject(SoundsService);

  private bursting = false;
  private settling?: SettlingWindow;

  /**
   * Celebrates `moment`. Resolves once the toast is presented and the burst,
   * if one is drawn, has ended - for a held moment, after its settling window
   * has closed, and at once if it was suppressed. The sound is fired and not
   * awaited, so it never holds the call up. `params` fill the moment's toast
   * copy, such as the country of a first Bite there; `count` picks
   * `bite-milestone`'s burst and copy, and `count` or `rank` go to analytics.
   */
  celebrate(
    moment: CelebrationMoment,
    params?: Record<string, unknown>,
  ): Promise<void> {
    if (HELD_MOMENTS.has(moment)) {
      return new Promise((done) => this.hold({ moment, params, done }));
    }

    if (moment === 'first-bite') {
      this.claimWindow();
    }

    return this.play(moment, params);
  }

  /**
   * Marks the open window as taken by a `first-bite`, or opens one for it, so
   * no held moment of the same post plays after it.
   */
  private claimWindow(): void {
    if (!this.settling) {
      this.openWindow({ firstBite: true });
      return;
    }

    this.settling.firstBite = true;
    this.settling.best?.done();
    this.settling.best = undefined;
  }

  /** Keeps `held` if it is the highest moment of its window so far. */
  private hold(held: HeldCelebration): void {
    if (!this.settling) {
      this.openWindow({ firstBite: false, best: held });
      return;
    }

    const { best, firstBite } = this.settling;

    if (firstBite || (best && rank(best.moment) < rank(held.moment))) {
      held.done();
      return;
    }

    best?.done();
    this.settling.best = held;
  }

  private openWindow(window: SettlingWindow): void {
    this.settling = window;

    setTimeout(() => {
      const { best } = window;
      this.settling = undefined;

      if (best) {
        void this.play(best.moment, best.params).then(best.done);
      }
    }, CELEBRATION_SETTLING_WINDOW_MS);
  }

  private async play(
    moment: CelebrationMoment,
    params?: Record<string, unknown>,
  ): Promise<void> {
    const thousand = isThousand(moment, params);

    this.analytics.logEvent(
      AnalyticsEvent.CelebrationShown,
      shownParams(moment, params),
    );

    // `SoundsService` never rejects; the catch keeps a broken one from
    // surfacing as an unhandled rejection all the same.
    this.sounds.celebration().catch(() => undefined);

    await Promise.all([
      this.toast.present({
        messageKey: thousand
          ? CELEBRATION_THOUSAND_MESSAGE_KEY
          : CELEBRATION_MESSAGE_KEYS[moment],
        params,
        outcome: 'success',
      }),
      this.burst(thousand ? GRAND : STANDARD),
    ]);
  }

  private async burst({ shots, timeoutMs }: Burst): Promise<void> {
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

    const timers: ReturnType<typeof setTimeout>[] = [];

    try {
      const fire = confetti.create(canvas, { resize: true, useWorker: true });
      const colors = this.colors(view);
      const timedOut = new Promise<'timed-out'>((resolve) => {
        timers.push(setTimeout(() => resolve('timed-out'), timeoutMs));
      });

      const fired = shots.map((shot) => {
        const options = shotOptions(shot, colors);

        if (!options) {
          return undefined;
        }

        if (shot.delayMs === 0) {
          return fire(options);
        }

        return new Promise<unknown>((resolve) => {
          timers.push(setTimeout(() => resolve(fire(options)), shot.delayMs));
        });
      });

      const outcome = await Promise.race([Promise.all(fired), timedOut]);

      if (outcome === 'timed-out') {
        // Stops the worker's animation, so nothing is left drawing into a
        // canvas that is about to go.
        fire.reset();
      }
    } catch {
      // Nothing to fall back to; the toast already marks the moment.
    } finally {
      timers.forEach((timer) => clearTimeout(timer));
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

/** The place of `moment` in {@link CELEBRATION_PRECEDENCE}; lower wins. */
const rank = (moment: CelebrationMoment): number =>
  CELEBRATION_PRECEDENCE.indexOf(moment);

/** A `bite-milestone` at a multiple of 1,000, which plays the grand burst. */
const isThousand = (
  moment: CelebrationMoment,
  params?: Record<string, unknown>,
): boolean => {
  const count = params?.['count'];

  return (
    moment === 'bite-milestone' &&
    typeof count === 'number' &&
    Number.isInteger(count) &&
    count > 0 &&
    count % 1000 === 0
  );
};

/** `celebration_shown`'s parameters for `moment`. */
const shownParams = (
  moment: CelebrationMoment,
  params?: Record<string, unknown>,
): CelebrationShownParams => {
  const shown: CelebrationShownParams = { moment };
  const count = params?.['count'];
  const place = params?.['rank'];

  if (moment === 'bite-milestone' && typeof count === 'number') {
    shown.count = count;
  }

  if (
    (moment === 'leaderboard-top-ten' || moment === 'leaderboard-overtake') &&
    typeof place === 'number'
  ) {
    shown.rank = place;
  }

  return shown;
};

/**
 * What `shot` fires with: the theme colours, or for an emoji shot the food
 * shapes. An emoji shot the browser cannot draw shapes for is left out, so the
 * rest of the burst still plays.
 */
const shotOptions = (
  shot: CelebrationShot,
  colors: string[] | undefined,
): confetti.Options | undefined => {
  if (!shot.emoji) {
    return { ...shot.options, colors };
  }

  try {
    const shapes = CELEBRATION_GRAND_BURST_EMOJI.map((text) =>
      confetti.shapeFromText({ text, scalar: shot.options.scalar }),
    );

    return { ...shot.options, shapes };
  } catch {
    return undefined;
  }
};
