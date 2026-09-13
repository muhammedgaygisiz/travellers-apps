import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/** Where the alert preference of this device lives between sessions. */
export const ORDER_ALERT_KEY = 'table-order-alert';

/**
 * How loud the alert is, in gain. A tone at full scale on a tablet at the pass
 * is startling rather than useful; this is audible across a kitchen and not
 * across a dining room.
 */
const ALERT_GAIN = 0.2;

/** The two notes of the chime, in hertz, and how long each lasts in seconds. */
const ALERT_NOTES: readonly number[] = [880, 1320];
const ALERT_NOTE_SECONDS = 0.12;

/**
 * The busy-service alert, off until somebody turns it on
 * (GitHub issue #1105).
 *
 * ## Why it is a device preference and not an account setting
 *
 * Because it is a fact about *where a screen is standing*, which is the same
 * reasoning issue #1184 applied to push delivery. The tablet clamped to the
 * pass in a loud kitchen wants the chime; the one at the host stand two metres
 * from a table of four does not, and both are signed into by whoever is on
 * shift. An account setting would follow a waiter from one to the other and be
 * wrong at one end of it.
 *
 * So it is `Preferences`, which is per installation, and it is **off by
 * default** - the issue asks for that in as many words, and it is the only
 * defensible default for a sound a screen makes without being asked.
 *
 * ## Why the tone is synthesised rather than an asset
 *
 * A two-note chime is about twenty lines of `AudioContext` and no bytes at all,
 * against an audio file that has to be licensed, shipped, cached, and decoded
 * before the first order of the evening - and which would be silent the first
 * time it mattered if the fetch had not finished. Nothing here can fail in a
 * way that costs the queue anything: a browser that refuses to make a sound
 * leaves the visual flash, which is the channel that works in a kitchen loud
 * enough to need the sound in the first place.
 *
 * ## Why it cannot play before somebody has touched the screen
 *
 * Browsers refuse audio until the page has been interacted with, so the first
 * order after a cold load may arrive silently however this is written. The
 * toggle itself is that interaction - turning the alert on plays the chime
 * once, which both unlocks the context and tells the person who pressed it
 * exactly what they have signed up for.
 */
@Injectable({ providedIn: 'root' })
export class OrderAlertService {
  /**
   * Whether this device alerts on a new order.
   *
   * A signal rather than a promise, so the toggle renders immediately on a
   * screen that has not finished reading storage. It starts `false`, which is
   * both the default and the safe thing to show while the real value is being
   * loaded: a toggle that flickered on would be a screen promising a sound it
   * had not yet confirmed.
   */
  readonly enabled = signal(false);

  private context?: AudioContext;

  /** Reads the stored preference. Called once, when the queue opens. */
  async restore(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: ORDER_ALERT_KEY });

      this.enabled.set(value === 'true');
    } catch {
      // A device whose preference store refuses to read is a device with the
      // alert off, which is the default anyway. It must not stop the queue
      // from opening.
      this.enabled.set(false);
    }
  }

  /**
   * Turns the alert on or off, and remembers it.
   *
   * Turning it on plays the chime, for the two reasons above: it is the
   * gesture that unlocks audio, and a sound nobody has heard is a setting
   * nobody can judge.
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled.set(enabled);

    if (enabled) {
      this.play();
    }

    try {
      await Preferences.set({
        key: ORDER_ALERT_KEY,
        value: String(enabled),
      });
    } catch {
      // The setting still holds for this session; only its memory is lost.
    }
  }

  /** Sounds the chime, if this device is set to. */
  alert(): void {
    if (this.enabled()) {
      this.play();
    }
  }

  /**
   * Two short notes, rising.
   *
   * Rising rather than falling because a falling pair is the shape every
   * "something went wrong" sound has, and the one thing this must not be
   * mistaken for during service is a failure.
   */
  private play(): void {
    const context = this.audioContext();

    if (!context) {
      return;
    }

    try {
      ALERT_NOTES.forEach((frequency, index) => {
        const start = context.currentTime + index * ALERT_NOTE_SECONDS;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.frequency.value = frequency;
        gain.gain.value = ALERT_GAIN;

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + ALERT_NOTE_SECONDS);
      });
    } catch {
      // A suspended or closed context. The visual flash still happens.
    }
  }

  private audioContext(): AudioContext | undefined {
    if (this.context) {
      return this.context;
    }

    const constructor =
      typeof globalThis.AudioContext === 'function'
        ? globalThis.AudioContext
        : undefined;

    if (!constructor) {
      return undefined;
    }

    try {
      this.context = new constructor();

      return this.context;
    } catch {
      return undefined;
    }
  }
}
