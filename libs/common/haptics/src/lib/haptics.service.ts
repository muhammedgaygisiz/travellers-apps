import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * The local native plugin that plays each intent through the platform's own
 * haptic primitive (issue #1743).
 *
 * It is part of the bite-tribe native wrappers rather than an npm dependency:
 * `BiteHapticsPlugin.java` in the Android wrapper plays a
 * `HapticFeedbackConstants` value through the WebView, and
 * `BiteHapticsPlugin.swift` in the iOS wrapper holds one prepared feedback
 * generator per style for the app's lifetime. One method per intent, so the
 * mapping from intent to primitive lives on the native side, next to the API
 * level it depends on.
 */
export interface BiteHapticsPlugin {
  press(): Promise<void>;
  release(): Promise<void>;
  tick(): Promise<void>;
  selection(): Promise<void>;
  confirm(): Promise<void>;
  warning(): Promise<void>;
  success(): Promise<void>;
  error(): Promise<void>;
}

const BITE_HAPTICS = 'BiteHaptics';

const BiteHaptics = registerPlugin<BiteHapticsPlugin>(BITE_HAPTICS);

/**
 * The single way either app plays haptic feedback.
 *
 * It exposes the named intents of the feedback vocabulary in epics #1633 and
 * #1740 and nothing else. There is deliberately no `vibrate({ duration })`
 * passthrough: Apple's and Android's haptics guidelines both steer away from an
 * arbitrary buzz in favour of a small set of named, reusable patterns, and one
 * intent must keep one meaning at every call site.
 *
 * Each intent plays through the local `BiteHaptics` plugin. A build without it
 * falls back to `@capacitor/haptics`, so nothing goes silent.
 *
 * **Never rejects.** Haptics are decoration on top of an action the caller has
 * already handled, so every intent resolves without touching a plugin off a
 * native build and swallows any failure from the native call. A caller can fire
 * and forget it without a try/catch — the same posture `ToastService.present()`
 * holds.
 */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  /** A finger landing on a pressable control. */
  press(): Promise<void> {
    return this.play(
      () => BiteHaptics.press(),
      () => Haptics.impact({ style: ImpactStyle.Light }),
    );
  }

  /** A finger lifting off a pressable control, completing the press. */
  release(): Promise<void> {
    return this.play(
      () => BiteHaptics.release(),
      () => Haptics.impact({ style: ImpactStyle.Light }),
    );
  }

  /** One discrete step of a continuous gesture, such as a detent. */
  tick(): Promise<void> {
    return this.play(
      () => BiteHaptics.tick(),
      () => Haptics.impact({ style: ImpactStyle.Light }),
    );
  }

  /** A frequent, low-stakes tap. */
  selection(): Promise<void> {
    return this.play(
      () => BiteHaptics.selection(),
      () => Haptics.impact({ style: ImpactStyle.Light }),
    );
  }

  /** A deliberate, less frequent action completing. */
  confirm(): Promise<void> {
    return this.play(
      () => BiteHaptics.confirm(),
      () => Haptics.impact({ style: ImpactStyle.Medium }),
    );
  }

  /**
   * The confirming tap on an irreversible action. Reserved for that and never
   * reused for anything else.
   */
  warning(): Promise<void> {
    return this.play(
      () => BiteHaptics.warning(),
      () => Haptics.impact({ style: ImpactStyle.Heavy }),
    );
  }

  /** The successful outcome of an action, never a plain tap. */
  success(): Promise<void> {
    return this.play(
      () => BiteHaptics.success(),
      () => Haptics.notification({ type: NotificationType.Success }),
    );
  }

  /** The failed outcome of an action, never a plain tap. */
  error(): Promise<void> {
    return this.play(
      () => BiteHaptics.error(),
      () => Haptics.notification({ type: NotificationType.Error }),
    );
  }

  private async play(
    native: () => Promise<void>,
    fallback: () => Promise<void>,
  ): Promise<void> {
    // The `@capacitor/haptics` web implementation falls back to
    // `navigator.vibrate`, which is not the vocabulary, so no plugin is reached
    // off a native build.
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await (Capacitor.isPluginAvailable(BITE_HAPTICS) ? native : fallback)();
    } catch {
      // Nothing to fall back to; the action the feedback decorates stands.
    }
  }
}
