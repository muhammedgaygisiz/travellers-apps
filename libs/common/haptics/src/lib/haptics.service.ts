import { Injectable, signal } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

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
 * The device preference that switches every intent off (issue #1746). Only
 * `'false'` turns haptics off, so an absent key - every device before the
 * setting existed - keeps them on.
 */
export const HAPTICS_ENABLED_KEY = 'haptics-enabled';

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
 * **Switchable per device.** {@link enabled} is read once from device
 * `Preferences` and cached; while it is off, every intent returns without
 * reaching any plugin. It lives here, in a common library, but only
 * bite-tribe's settings page exposes a control for it, so the other apps keep
 * it on. Ionic's own component haptics (`ion-toggle`, `ion-segment`,
 * `ion-picker`, pull-to-refresh) play through `@capacitor/haptics` directly,
 * so the switch does not reach them.
 *
 * **Never rejects.** Haptics are decoration on top of an action the caller has
 * already handled, so every intent resolves without touching a plugin off a
 * native build and swallows any failure from the native call. A caller can fire
 * and forget it without a try/catch — the same posture `ToastService.present()`
 * holds.
 */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  private readonly enabledState = signal(true);

  /** Whether this device plays haptics. On unless the user switched it off. */
  readonly enabled = this.enabledState.asReadonly();

  /** Set once the user has chosen in this session, so a late read cannot undo it. */
  private chosen = false;

  private readonly loaded = this.loadEnabled();

  /**
   * Switches every intent on or off for this device. Applies immediately, and
   * is persisted so it survives a restart. A failed write leaves the choice in
   * place for this session rather than undoing what the user just did.
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.chosen = true;
    this.enabledState.set(enabled);

    try {
      await Preferences.set({
        key: HAPTICS_ENABLED_KEY,
        value: String(enabled),
      });
    } catch (error) {
      console.warn('Failed to persist the haptics setting:', error);
    }
  }

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

    // Settled after the first read, so this only ever waits at start-up.
    await this.loaded;

    if (!this.enabledState()) {
      return;
    }

    try {
      await (Capacitor.isPluginAvailable(BITE_HAPTICS) ? native : fallback)();
    } catch {
      // Nothing to fall back to; the action the feedback decorates stands.
    }
  }

  private async loadEnabled(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: HAPTICS_ENABLED_KEY });

      // A choice made before the read settled wins over what was stored.
      if (!this.chosen) {
        this.enabledState.set(value !== 'false');
      }
    } catch (error) {
      console.warn('Failed to read the haptics setting:', error);
    }
  }
}
