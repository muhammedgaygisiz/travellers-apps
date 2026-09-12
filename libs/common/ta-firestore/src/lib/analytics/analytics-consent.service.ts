import { computed, Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Preferences } from '@capacitor/preferences';

/**
 * A consent answer. `unset` is a real third state rather than a missing
 * boolean: it is the window between first launch and the user answering, and
 * collection has to be **off** during it. Modelling it as `false` would make
 * "has not been asked" indistinguishable from "said no", and the gate could
 * then never tell whether it still owed the user a question.
 */
export type ConsentDecision = 'unset' | 'granted' | 'denied';

/**
 * The two decisions are stored separately because they are not the same
 * question. Product analytics is optional by any reading; crash reporting is
 * what makes a broken release diagnosable, and folding it into one switch means
 * a user declining analytics also silently takes away the ability to see that
 * the app is crashing for them.
 */
export type ConsentState = {
  analytics: ConsentDecision;
  crashReporting: ConsentDecision;
};

export const UNSET_CONSENT: ConsentState = {
  analytics: 'unset',
  crashReporting: 'unset',
};

/**
 * Device-scoped, not user-scoped. The decision has to be readable before the
 * first Firebase Analytics call, which happens long before anyone signs in, so
 * keying it by uid the way {@link CoachMarkStateService} does would leave the
 * gate with nothing to read at the moment it matters.
 */
const CONSENT_KEY = 'analytics-consent';

@Injectable({ providedIn: 'root' })
export class AnalyticsConsentService {
  private readonly state = signal<ConsentState>(UNSET_CONSENT);

  readonly consent = this.state.asReadonly();

  /** Whether the user still owes an answer, which is what the gate renders on. */
  readonly needsDecision = computed(() => this.state().analytics === 'unset');

  readonly analyticsGranted = computed(
    () => this.state().analytics === 'granted',
  );

  readonly crashReportingGranted = computed(
    () => this.state().crashReporting === 'granted',
  );

  /**
   * Read the stored decision and put the SDKs into the matching state.
   *
   * Called from the startup initializer before anything logs an event, so the
   * window where collection could run un-consented is closed by construction
   * rather than by remembering to check at each call site.
   */
  async initialize(): Promise<ConsentState> {
    const stored = await this.read();
    this.state.set(stored);
    await this.applyToSdks(stored);

    return stored;
  }

  /** Record the user's answer and apply it immediately. */
  async decide(decision: ConsentState): Promise<void> {
    this.state.set(decision);
    await this.persist(decision);
    await this.applyToSdks(decision);
  }

  /** Flip one switch from the settings page, leaving the other untouched. */
  async update(partial: Partial<ConsentState>): Promise<void> {
    await this.decide({ ...this.state(), ...partial });
  }

  private async read(): Promise<ConsentState> {
    try {
      const { value } = await Preferences.get({ key: CONSENT_KEY });
      if (!value) {
        return UNSET_CONSENT;
      }

      const parsed: unknown = JSON.parse(value);

      return {
        analytics: asDecision(parsed, 'analytics'),
        crashReporting: asDecision(parsed, 'crashReporting'),
      };
    } catch (error) {
      // An unreadable decision is not a granted one. Failing closed costs a
      // second prompt; failing open collects from someone who may have said no.
      console.warn('Failed to read the analytics consent decision:', error);

      return UNSET_CONSENT;
    }
  }

  private async persist(decision: ConsentState): Promise<void> {
    try {
      await Preferences.set({
        key: CONSENT_KEY,
        value: JSON.stringify(decision),
      });
    } catch (error) {
      console.warn('Failed to persist the analytics consent decision:', error);
    }
  }

  /**
   * State the collection flags rather than trusting a default.
   *
   * On native the flag persists in the app's own storage - Android
   * SharedPreferences, iOS user defaults - and outlives the process, the build,
   * and the install that wrote it, which is what left dev-built devices
   * permanently silent in issue #1387. That fix is preserved here: production
   * still asserts the flag on every startup, it just now asserts the user's
   * answer instead of an unconditional `true`.
   *
   * The web is deliberately asymmetric. Disabling sets a per-page-load
   * `ga-disable-*` window flag, which is exactly the gate we want and costs
   * nothing to re-apply each load. Enabling is skipped because the plugin call
   * would eagerly initialize web analytics for apps that never asked for it -
   * the business app among them - and an un-set flag already means enabled.
   */
  private async applyToSdks(decision: ConsentState): Promise<void> {
    const native = Capacitor.isNativePlatform();
    const analyticsEnabled = decision.analytics === 'granted';

    if (native || !analyticsEnabled) {
      await settle(
        FirebaseAnalytics.setEnabled({ enabled: analyticsEnabled }),
        'analytics collection',
      );
    }

    if (native) {
      await settle(
        FirebaseCrashlytics.setEnabled({
          enabled: decision.crashReporting === 'granted',
        }),
        'crash reporting',
      );
    }
  }
}

const asDecision = (
  parsed: unknown,
  key: keyof ConsentState,
): ConsentDecision => {
  const value = (
    parsed as Partial<Record<keyof ConsentState, unknown>> | null
  )?.[key];

  return value === 'granted' || value === 'denied' ? value : 'unset';
};

/**
 * Consent is best-effort against the SDKs: a plugin that rejects must not take
 * startup down with it, and must not leave the caller believing the flag was
 * applied when it was not.
 */
const settle = async (call: Promise<void>, what: string): Promise<void> => {
  try {
    await call;
  } catch (error) {
    console.warn(`Failed to apply the consent decision for ${what}:`, error);
  }
};
