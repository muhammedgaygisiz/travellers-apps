import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * The single way either app plays haptic feedback.
 *
 * It exposes the five intents of the feedback vocabulary in epic #1633 and
 * nothing else. There is deliberately no `vibrate({ duration })` passthrough:
 * Apple's and Android's haptics guidelines both steer away from an arbitrary
 * buzz in favour of a small set of named, reusable patterns, and one intent
 * must keep one meaning at every call site.
 *
 * **Never rejects.** Haptics are decoration on top of an action the caller has
 * already handled, so every intent resolves without touching the plugin off a
 * native build and swallows any failure from the native call. A caller can fire
 * and forget it without a try/catch — the same posture `ToastService.present()`
 * holds.
 */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  /** A frequent, low-stakes tap. */
  selection(): Promise<void> {
    return this.play(() => Haptics.impact({ style: ImpactStyle.Light }));
  }

  /** A deliberate, less frequent action completing. */
  confirm(): Promise<void> {
    return this.play(() => Haptics.impact({ style: ImpactStyle.Medium }));
  }

  /**
   * The confirming tap on an irreversible action. Reserved for that and never
   * reused for anything else.
   */
  warning(): Promise<void> {
    return this.play(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  }

  /** The successful outcome of an action, never a plain tap. */
  success(): Promise<void> {
    return this.play(() =>
      Haptics.notification({ type: NotificationType.Success }),
    );
  }

  /** The failed outcome of an action, never a plain tap. */
  error(): Promise<void> {
    return this.play(() =>
      Haptics.notification({ type: NotificationType.Error }),
    );
  }

  private async play(feedback: () => Promise<void>): Promise<void> {
    // The web implementation falls back to `navigator.vibrate`, which is not
    // the vocabulary, so the plugin is only reached on a native build.
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await feedback();
    } catch {
      // Nothing to fall back to; the action the feedback decorates stands.
    }
  }
}
