import {
  DestroyRef,
  DOCUMENT,
  EnvironmentProviders,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { HapticsService } from 'haptics';

/** The class a pressable surface carries while a finger is down on it. */
export const PRESSED_CLASS = 'bt-pressed';

/**
 * The class a surface carries for a moment after a press ends inside it, so
 * the spring back can overshoot. A cancelled press never gets it and returns
 * to rest without one (issue #1745).
 */
export const RELEASED_CLASS = 'bt-released';

/**
 * How long {@link RELEASED_CLASS} stays on: the spring-back transition in
 * `_globals.scss`, with a margin.
 */
export const RELEASED_MS = 300;

/**
 * The class on the document element that opts it into the pressed-state
 * styles. The styles live in a stylesheet the business and admin apps share,
 * and Ionic's own `.ion-activated` tint is only neutralised under it, so those
 * apps keep Ionic's pressed state unchanged.
 */
export const PRESS_FEEDBACK_ROOT_CLASS = 'bt-press-feedback';

/**
 * Surfaces that play `press` on touch-down and `release` on touch-up.
 *
 * `.alert-button` is the native button `ion-alert` renders for each entry of
 * its `buttons`, in the light DOM, so it is matched like any other control
 * (issue #1747). `release-off` is a modifier rather than an opt-in, so an
 * element carrying it is not a surface on its own account.
 */
const PRESS_AND_RELEASE =
  'ion-button, ion-fab-button, ion-chip, ion-tab-button, ion-back-button, ion-menu-button, .alert-button, [btPressable]:not([btPressable="release-off"])';

/**
 * Tappable list rows, which play `press` only: they are tapped in quick
 * succession while scrolling, and a second tick per row would turn that into a
 * stream of buzzes.
 */
const ROW = 'ion-item';

const SURFACE = `${PRESS_AND_RELEASE}, ${ROW}`;

const OPT_OUT = '[btPressable="off"]';

/**
 * Where a semantic intent replaces `release`: the surface, or an ancestor,
 * carries `btPressable="release-off"`. The surface still gives way and still
 * plays `press`; the call site plays its own intent - `warning` on a
 * destructive alert's confirming button, `selection` on a reaction - and one
 * tap plays one intent on release, never two (issue #1747).
 */
const RELEASE_OFF = '[btPressable="release-off"]';

interface Press {
  readonly surface: HTMLElement;
  readonly pointerId: number;
  readonly release: boolean;
}

/**
 * Drives the visible pressed state and the press/release haptics of every
 * pressable surface in bite-tribe from one delegated listener (epic #1740,
 * issue #1744).
 *
 * Delegation is what keeps the 52 templates that hold the app's `ion-button`s
 * from each needing an import, and it is what puts the class and the haptic in
 * the same handler invocation, so what the user sees and what they feel start
 * on the same frame.
 *
 * - **Press:** a `pointerdown` on a surface adds {@link PRESSED_CLASS} and
 *   plays `press`.
 * - **Release:** a `pointerup` that lands inside the same surface swaps the
 *   class for {@link RELEASED_CLASS}, which lets the surface spring back with
 *   an overshoot, and plays `release`, except on list rows and under
 *   `[btPressable="release-off"]`, where the call site's own intent takes its
 *   place.
 * - **Cancel:** `pointercancel` - which is also how the browser reports a
 *   scroll taking the gesture over - or the pointer leaving the surface
 *   removes the class and plays nothing. A cancelled press commits nothing,
 *   so it must not feel like one that does (the rule #1636 set for alerts).
 *
 * Disabled surfaces, and anything under `[btPressable="off"]`, get neither the
 * class nor a haptic. Every listener is passive and none calls
 * `preventDefault`, so scrolling and Ionic's own gestures are untouched.
 *
 * Registered only by the bite-tribe shell; the business and admin apps do not
 * get it.
 */
export const providePressFeedback = (): EnvironmentProviders =>
  provideAppInitializer(() => {
    const document = inject(DOCUMENT);
    const haptics = inject(HapticsService);
    const releaseTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    let active: Press | undefined;

    document.documentElement.classList.add(PRESS_FEEDBACK_ROOT_CLASS);

    const clearReleased = (surface: HTMLElement): void => {
      clearTimeout(releaseTimers.get(surface));
      releaseTimers.delete(surface);
      surface.classList.remove(RELEASED_CLASS);
    };

    const end = (inside: boolean): void => {
      if (!active) {
        return;
      }

      const { surface, release } = active;
      active = undefined;
      surface.classList.remove(PRESSED_CLASS);

      if (!inside) {
        return;
      }

      // Rows spring back in full; only their second tick is left out.
      surface.classList.add(RELEASED_CLASS);
      releaseTimers.set(
        surface,
        setTimeout(() => clearReleased(surface), RELEASED_MS),
      );

      if (release) {
        void haptics.release();
      }
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (
        !event.isPrimary ||
        (event.pointerType === 'mouse' && event.button !== 0)
      ) {
        return;
      }

      // A press whose end never arrived is dropped silently.
      end(false);

      const surface = pressableSurface(event.target);

      if (!surface) {
        return;
      }

      active = {
        surface,
        pointerId: event.pointerId,
        release:
          surface.matches(PRESS_AND_RELEASE) && !surface.closest(RELEASE_OFF),
      };
      clearReleased(surface);
      surface.classList.add(PRESSED_CLASS);
      void haptics.press();
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (active?.pointerId !== event.pointerId) {
        return;
      }

      // Touch pointers are implicitly captured by the element they went down
      // on, so the event target cannot tell whether the finger was lifted
      // inside the surface. Where it was lifted can.
      end(isInside(active.surface, event));
    };

    const onPointerCancel = (event: PointerEvent): void => {
      if (active?.pointerId === event.pointerId) {
        end(false);
      }
    };

    // `pointerleave` does not bubble, so it is caught on the way down and only
    // counts when it is the surface itself the pointer left.
    const onPointerLeave = (event: PointerEvent): void => {
      if (
        active?.pointerId === event.pointerId &&
        event.target === active.surface
      ) {
        end(false);
      }
    };

    const listeners: [string, (event: PointerEvent) => void][] = [
      ['pointerdown', onPointerDown],
      ['pointerup', onPointerUp],
      ['pointercancel', onPointerCancel],
      ['pointerleave', onPointerLeave],
    ];
    const options: AddEventListenerOptions = { capture: true, passive: true };

    listeners.forEach(([type, listener]) =>
      document.addEventListener(type, listener as EventListener, options),
    );

    inject(DestroyRef).onDestroy(() => {
      listeners.forEach(([type, listener]) =>
        document.removeEventListener(type, listener as EventListener, options),
      );
      [...releaseTimers.keys()].forEach(clearReleased);
      document.documentElement.classList.remove(PRESS_FEEDBACK_ROOT_CLASS);
    });
  });

/**
 * The nearest pressable surface the event landed on, or `undefined` when
 * there is none, it is disabled, or it sits under an opt-out.
 *
 * Shadow DOM retargets the event to the Ionic host element, which is the
 * surface itself, so `closest()` from the target finds it.
 */
const pressableSurface = (
  target: EventTarget | null,
): HTMLElement | undefined => {
  let candidate =
    target instanceof Element ? target.closest<HTMLElement>(SURFACE) : null;

  // An `ion-item` that is not tappable is not a surface, but it may sit inside
  // one, such as a pressable card.
  while (candidate && candidate.matches(ROW) && !isTappableRow(candidate)) {
    candidate = candidate.parentElement?.closest<HTMLElement>(SURFACE) ?? null;
  }

  if (!candidate || candidate.closest(OPT_OUT) || isDisabled(candidate)) {
    return undefined;
  }

  return candidate;
};

/**
 * Whether an `ion-item` is a tappable row: the same test Ionic uses to render
 * it as a button or a link.
 *
 * Ionic does not reflect `button` to an attribute, and a bound
 * `[routerLink]` leaves none either, so the attribute alone misses most rows;
 * the `button` and `href` properties do not. Ionic's router-link directive
 * sets `href` on the item.
 */
const isTappableRow = (item: HTMLElement): boolean => {
  const { button, href } = item as HTMLElement & {
    button?: boolean;
    href?: string;
  };

  return (
    button === true ||
    href !== undefined ||
    item.hasAttribute('button') ||
    item.hasAttribute('routerLink')
  );
};

const isDisabled = (surface: HTMLElement): boolean =>
  surface.hasAttribute('disabled') ||
  surface.getAttribute('aria-disabled') === 'true' ||
  surface.classList.contains('button-disabled') ||
  surface.classList.contains('item-disabled');

const isInside = (surface: HTMLElement, event: PointerEvent): boolean => {
  const { left, right, top, bottom } = surface.getBoundingClientRect();

  return (
    event.clientX >= left &&
    event.clientX <= right &&
    event.clientY >= top &&
    event.clientY <= bottom
  );
};
