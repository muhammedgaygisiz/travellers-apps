import { Injectable, signal } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * The local native plugin that plays each sound through the platform's own
 * UI-sound path (issue #1843).
 *
 * It is part of the bite-tribe native wrappers rather than an npm dependency,
 * like `BiteHaptics`: `BiteSoundsPlugin.swift` plays a `SystemSoundID` through
 * System Sound Services, and `BiteSoundsPlugin.java` plays from a `SoundPool`
 * on the system stream. Both follow the phone's silent mode and mix with other
 * audio. One method per intent, so the mapping from intent to file lives on the
 * native side, next to the file.
 */
export interface BiteSoundsPlugin {
  posted(): Promise<void>;
  celebration(): Promise<void>;
}

const BITE_SOUNDS = 'BiteSounds';

const BiteSounds = registerPlugin<BiteSoundsPlugin>(BITE_SOUNDS);

/**
 * The device preference that switches every sound off. Only `'false'` turns
 * sounds off, so a fresh install has them on and the phone's silent mode is
 * what keeps them quiet.
 */
export const SOUNDS_ENABLED_KEY = 'sounds-enabled';

/**
 * How long a play holds the sound path. The bundled files are at most 300 ms
 * long (issue #1842), so a play started within this window of the last one
 * would overlap it and is dropped.
 */
export const SOUND_LENGTH_MS = 300;

/**
 * The single way bite-tribe plays a sound.
 *
 * It exposes the two intents of epic #1742 and nothing else. There is
 * deliberately no `play(file)` passthrough, so one intent keeps one meaning at
 * every call site.
 *
 * Each intent plays through the local `BiteSounds` plugin. Unlike haptics there
 * is no `@capacitor/*` fallback: a build without the plugin is silent, which is
 * the safe default for sound.
 *
 * **Switchable per device.** {@link enabled} is read once from device
 * `Preferences` and cached; while it is off, every intent returns without
 * reaching the plugin.
 *
 * **Never stacked.** A play that starts while the previous sound is still
 * playing is dropped, so two moments landing together sound once.
 *
 * **Never rejects.** A sound decorates an action the caller has already
 * handled, so every intent resolves without playing off a native build, with
 * the setting off or without the plugin, and swallows any native failure.
 */
@Injectable({ providedIn: 'root' })
export class SoundsService {
  private readonly enabledState = signal(true);

  /** Whether this device plays sounds. On unless the user switched it off. */
  readonly enabled = this.enabledState.asReadonly();

  /** Set once the user has chosen in this session, so a late read cannot undo it. */
  private chosen = false;

  /** When the sound playing now ends, as a `Date.now()` timestamp. */
  private playingUntil = 0;

  private readonly loaded = this.loadEnabled();

  /**
   * Switches every sound on or off for this device. Applies immediately, and
   * is persisted so it survives a restart. A failed write leaves the choice in
   * place for this session rather than undoing what the user just did.
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.chosen = true;
    this.enabledState.set(enabled);

    try {
      await Preferences.set({
        key: SOUNDS_ENABLED_KEY,
        value: String(enabled),
      });
    } catch (error) {
      console.warn('Failed to persist the sounds setting:', error);
    }
  }

  /** A Bite being posted. */
  posted(): Promise<void> {
    return this.play(() => BiteSounds.posted());
  }

  /** A celebrated first. Never louder than {@link posted}. */
  celebration(): Promise<void> {
    return this.play(() => BiteSounds.celebration());
  }

  private async play(native: () => Promise<void>): Promise<void> {
    // Web Audio in a WebView plays on the media stream at media volume, which
    // epic #1742 rules out, so nothing plays off a native build.
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Settled after the first read, so this only ever waits at start-up.
    await this.loaded;

    if (!this.enabledState() || !Capacitor.isPluginAvailable(BITE_SOUNDS)) {
      return;
    }

    const now = Date.now();

    if (now < this.playingUntil) {
      return;
    }

    this.playingUntil = now + SOUND_LENGTH_MS;

    try {
      await native();
    } catch {
      // Nothing played, so nothing holds the path; the action stands.
      this.playingUntil = 0;
    }
  }

  private async loadEnabled(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: SOUNDS_ENABLED_KEY });

      // A choice made before the read settled wins over what was stored.
      if (!this.chosen) {
        this.enabledState.set(value !== 'false');
      }
    } catch (error) {
      console.warn('Failed to read the sounds setting:', error);
    }
  }
}
