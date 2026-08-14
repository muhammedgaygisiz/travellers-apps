import { inject, Injectable } from '@angular/core';
// The one file allowed to reach the controller; every other call site goes
// through the service below. See the rule's comment in `eslint.config.mjs`.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Whether the action the toast reports worked.
 *
 * Required on every request, so a call site cannot raise a toast that says
 * nothing about the outcome. Before this existed only the two Bite paths passed
 * a colour, which left a failed registration, settings save or bucket-list
 * write rendering in the same grey as a success — the outcome was not encoded
 * visually at all and had to be read out of the message text. See GitHub issue
 * #1305.
 */
export type ToastOutcome = 'success' | 'failure';

/** A follow-up the toast offers instead of the plain dismiss button. */
export interface ToastAction {
  /** Transloco key for the button label. */
  labelKey: string;
  handler: () => void;
}

/**
 * A translation key, or — for the one case where there is no key to look up —
 * text that has already been resolved.
 *
 * The two are mutually exclusive so the key form stays the default and the raw
 * form has to be chosen deliberately. Registration is the only caller of the
 * raw form: the message comes back from Firebase Auth rather than from the
 * app's own copy, so there is nothing to translate.
 */
type ToastMessage =
  | { messageKey: string; params?: Record<string, unknown>; message?: never }
  | { message: string; messageKey?: never; params?: never };

export type ToastRequest = ToastMessage & {
  outcome: ToastOutcome;
  /** Replaces the dismiss button when the toast leads somewhere. */
  action?: ToastAction;
};

/**
 * One position for every toast in both apps.
 *
 * `top` rather than `bottom` because the shared page chrome in
 * `libs/common/ui/page` renders a persistent `ion-footer` carrying the menu
 * entries and the add button, and a bottom toast lands directly on it. See
 * GitHub issue #1305.
 */
const TOAST_POSITION = 'top';

/** How long a successful toast stays on screen. */
export const TOAST_DURATION_MS = 5_000;

/**
 * Failures stay up twice as long.
 *
 * A success confirms something the user just did and already expects, so it
 * only has to be noticed. A failure carries a recovery instruction that has to
 * be read and acted on, and it arrives when the user has usually already moved
 * on to the next thing.
 */
export const TOAST_FAILURE_DURATION_MS = TOAST_DURATION_MS * 2;

/**
 * Upper bound for the overlay calls.
 *
 * A toast is decoration on top of an outcome the caller has already handled, so
 * it must never be what a flow waits on. In the standalone Ionic build
 * `create()` awaits `customElements.whenDefined()` and resolves never rather
 * than rejecting when the element was not defined, which silently blocked
 * registration for a whole release (issue #1219).
 */
const OVERLAY_TIMEOUT_MS = 2_000;

/**
 * Rejects when `operation` outlives `timeoutMs`. The timer is always cleared so
 * a settled operation cannot keep the app awake.
 */
const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // A rejection that lands after the race was lost still needs a handler.
  operation.catch(() => undefined);

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('toast-timeout')), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * The single way to raise a toast in either app.
 *
 * It owns position, colour, duration and the translation lookup, so those are
 * decided once instead of at each of the fourteen call sites that used to build
 * their own `toastController.create` options. No other file may inject
 * `ToastController`; the lint rule in `eslint.config.mjs` enforces that.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastController = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  /** The toast currently on screen, so a newer one can replace it. */
  private currentToast: HTMLIonToastElement | null = null;

  /**
   * Presents a toast.
   *
   * **Never rejects and always settles.** Every overlay call is bounded and
   * every failure swallowed, so a caller can `await` this in the middle of a
   * flow without the toast becoming the thing that flow depends on. Callers
   * rely on that contract instead of guarding each call themselves.
   *
   * A toast still on screen is dismissed first. Ionic stacks toasts at the same
   * position, so without this a second one covers the first and the user reads
   * whichever happens to be on top.
   */
  async present({
    messageKey,
    message,
    outcome,
    params,
    action,
  }: ToastRequest): Promise<void> {
    await this.dismissCurrent();

    try {
      const toast = await withTimeout(
        this.toastController.create({
          message: messageKey
            ? this.transloco.translate(messageKey, params)
            : message,
          position: TOAST_POSITION,
          color: outcome === 'success' ? 'success' : 'danger',
          duration:
            outcome === 'success'
              ? TOAST_DURATION_MS
              : TOAST_FAILURE_DURATION_MS,
          buttons: [
            action
              ? {
                  text: this.transloco.translate(action.labelKey),
                  handler: action.handler,
                }
              : {
                  text: this.transloco.translate('ok'),
                  role: 'confirm',
                },
          ],
        }),
        OVERLAY_TIMEOUT_MS,
      );

      this.currentToast = toast;
      void toast.onDidDismiss().then(() => {
        if (this.currentToast === toast) {
          this.currentToast = null;
        }
      });

      await withTimeout(toast.present(), OVERLAY_TIMEOUT_MS);
    } catch {
      // Nothing left to fall back to; the caller already handled the outcome.
      this.currentToast = null;
    }
  }

  private async dismissCurrent(): Promise<void> {
    const toast = this.currentToast;

    if (!toast) {
      return;
    }

    this.currentToast = null;

    try {
      await withTimeout(toast.dismiss(), OVERLAY_TIMEOUT_MS);
    } catch {
      // A stuck overlay must not hold back the toast replacing it.
    }
  }
}
