import { computed, inject, Injectable, signal } from '@angular/core';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import {
  AnalyticsEvent,
  AnalyticsService,
  RequestedUrlService,
} from 'ta-firestore';
import { getCurrencyForDevice, getDisplayNameFailureReason, PATH } from 'utils';
import {
  OnboardingDataAccessService,
  OnboardingProgressService,
  OnboardingStepId,
} from 'bite-tribe/onboarding-data-access';
import type { PublicUser, Settings } from 'model';
import { ONBOARDING_STEPS } from '../steps/onboarding-steps';
import type {
  DisplayNameAvailabilityState,
  OnboardingIdentityDraft,
} from '../components/identity-step/identity-step.component';
import { ONBOARDING_LANGUAGES } from '../components/language-step/language-step.component';
import type { LocationPermissionState } from '../components/location-step/location-step.component';
import type { NotificationPermissionState } from '../components/notification-step/notification-step.component';

const DEFAULT_LANGUAGE = 'en';

/**
 * Owns onboarding assistant navigation: the ordered step registry, per-step
 * validity, and progress persistence.
 *
 * Steps render in order and cannot be skipped. A step can only be left once its
 * mandatory inputs are valid and acknowledged, and there is no exit before the
 * final step. Completed steps are persisted so a restart resumes at the first
 * incomplete step (epic #850, issue #1013).
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly dataAccess = inject(OnboardingDataAccessService);
  private readonly progress = inject(OnboardingProgressService);
  private readonly navController = inject(NavController);
  private readonly loadingController = inject(LoadingController);
  private readonly transloco = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly requestedUrlService = inject(RequestedUrlService);

  readonly steps = ONBOARDING_STEPS;

  readonly profile = signal<PublicUser | undefined>(undefined);
  readonly identityDraft = signal<OnboardingIdentityDraft>({
    displayName: '',
    photoUrl: '',
  });
  readonly displayNameAvailability =
    signal<DisplayNameAvailabilityState>('idle');
  private readonly availableDisplayName = signal<string | null>(null);
  readonly selectedVisibility = signal<boolean | null>(false);

  readonly settings = signal<Settings | undefined>(undefined);
  readonly selectedCurrency = signal<string>('EUR');
  readonly favoriteCurrencies = signal<readonly string[]>([]);
  readonly selectedLanguage = signal<string>(DEFAULT_LANGUAGE);
  readonly locationPermission = signal<LocationPermissionState>('idle');
  /**
   * Home city shown on the profile next to the display name. Optional, so it
   * never takes part in step validity: an empty value is a decline, and the
   * profile deliberately shows no location line for it (issues #1270, #1271).
   */
  readonly homeCity = signal<string>('');
  readonly notificationPermission = signal<NotificationPermissionState>('idle');

  private readonly completedSteps = signal<ReadonlySet<OnboardingStepId>>(
    new Set(),
  );
  private readonly validSteps = signal<ReadonlySet<OnboardingStepId>>(
    new Set(),
  );

  readonly currentIndex = signal(0);

  readonly currentStep = computed(() => this.steps[this.currentIndex()]);

  readonly isCurrentStepValid = computed(() =>
    this.validSteps().has(this.currentStep().id),
  );

  /** Whether the shell may advance from the current step. */
  readonly canAdvance = this.isCurrentStepValid;

  private initialized = false;

  /** Guards {@link next} against re-entry while a step is being persisted. */
  private advancing = false;

  /** Display name of the most recent availability check still awaiting a result. */
  private pendingDisplayNameCheck = '';

  /**
   * Language switch still loading its translations, if any. The page fires the
   * language change without awaiting it, so anything that translates
   * synchronously has to wait for this first (issue #1186).
   */
  private languageApplication: Promise<void> = Promise.resolve();

  /**
   * Loads persisted progress and positions the assistant at the first
   * incomplete step. Runs once per app session; re-entering the route does not
   * reset the user's place in the flow.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // Funnel entry: emitted once per session, when the assistant first loads.
    this.analytics.logEvent(AnalyticsEvent.OnboardingAssistantStarted);

    const completed = (await this.progress.loadCompletedSteps()).filter((id) =>
      this.isKnownStep(id),
    );
    const completedSet = new Set(completed);

    this.completedSteps.set(completedSet);
    // Already-completed steps stay valid so a returning user can move forward.
    this.validSteps.set(new Set(completedSet));
    this.currentIndex.set(this.firstIncompleteIndex(completedSet));

    const profile = await this.dataAccess.loadCurrentProfile();
    this.profile.set(profile);
    this.identityDraft.set({
      displayName: profile?.displayName || '',
      photoUrl: profile?.photoUrl || '',
    });
    // The step arrives with a visible default — the profile's own setting, or
    // private for a new account — and that default is a real answer, so the
    // step is satisfiable on arrival. Requiring an extra tap on an option that
    // already looks selected only produced a dead Next button for the users
    // accepting the privacy-preserving default (issue #1326).
    this.selectedVisibility.set(profile?.public ?? false);
    this.setStepValid('visibility', true);
    this.homeCity.set(profile?.city || '');

    // The finish step only confirms and completes; it gathers nothing, so it is
    // valid the moment the user reaches it and the Finish button is enabled.
    this.setStepValid('finish', true);

    await this.initializePreferences();

    const displayName = this.identityDraft().displayName.trim();
    if (this.currentStep().id === 'identity' && displayName) {
      await this.checkDisplayNameAvailability(displayName);
    }
  }

  /**
   * Prefills the currency, language, location, and notification steps.
   * Persisted settings win so a returning user sees their own choices; a
   * first-time user gets the device's best guess, which already makes both
   * preference steps satisfiable. Currency reads the device's region and
   * language reads its interface language: they are separate questions, and a
   * device set to Switzerland while reading English has to answer both
   * correctly (issue #1262).
   */
  private async initializePreferences(): Promise<void> {
    const settings = await this.dataAccess.loadSettings();
    this.settings.set(settings);

    const locale = this.deviceLocale();

    this.selectedCurrency.set(
      settings?.currency ||
        getCurrencyForDevice({ locale, timeZone: this.deviceTimeZone() }),
    );
    this.favoriteCurrencies.set(settings?.favoriteCurrencies ?? []);
    this.setStepValid('currency', true);

    const language = settings?.language || this.languageForLocale(locale);
    this.selectedLanguage.set(language);
    this.setStepValid('language', true);
    await this.dataAccess.applyLanguage(language);

    // Only a stored grant is treated as decided. A stored `false` is
    // indistinguishable from "never asked" on a fresh settings document, so the
    // step still offers the choice rather than recording a refusal the user
    // never gave.
    //
    // The stored flag alone is not proof the OS still allows reads: it lives in
    // Firestore and survives a reinstall or a revoke in system settings, which
    // both reset the OS grant. Trusting it on its own showed a "granted" step
    // that never prompted, leaving the app with no position at all — so the
    // live permission has to agree before the step counts as decided.
    if (settings?.location && (await this.dataAccess.hasLocationPermission())) {
      this.locationPermission.set('granted');
      this.setStepValid('location', true);
    }

    // Notifications have no stored account-level flag to reconcile any more
    // (issue #1184): delivery lives on this installation's push token, so the
    // live OS grant is the only thing that says the step was already decided
    // here. A reinstall or a turn-off in system settings puts the step back.
    if ((await this.dataAccess.getPushPermissionState()) === 'granted') {
      this.notificationPermission.set('granted');
      this.setStepValid('notifications', true);
    }
  }

  private deviceLocale(): string {
    return navigator.language || navigator.languages?.[0] || DEFAULT_LANGUAGE;
  }

  /**
   * IANA zone the device is set to, which is the closest thing to the device
   * region a web view can read. A runtime without a resolvable zone leaves the
   * currency suggestion to the locale.
   */
  private deviceTimeZone(): string | undefined {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  }

  private languageForLocale(locale: string): string {
    const language = locale.replace(/_/g, '-').split('-')[0].toLowerCase();

    return ONBOARDING_LANGUAGES.some((option) => option.code === language)
      ? language
      : DEFAULT_LANGUAGE;
  }

  setCurrentStepValid(valid: boolean): void {
    const id = this.currentStep().id;
    this.setStepValid(id, valid);
  }

  updateIdentity(draft: OnboardingIdentityDraft): void {
    const previousDisplayName = this.identityDraft().displayName.trim();
    this.identityDraft.set(draft);

    const displayName = draft.displayName.trim();
    if (!displayName) {
      this.pendingDisplayNameCheck = '';
      this.displayNameAvailability.set('idle');
      this.availableDisplayName.set(null);
      this.setStepValid('identity', false);
      return;
    }

    // The step re-emits the whole draft on any edit, so a photo change lands
    // here with an untouched name. Only a changed name may invalidate the name:
    // availability is confirmed by a check that runs on a name change or on
    // entering the step, so re-deriving validity from it on every edit would
    // invalidate a step that is valid from persisted completion — where no
    // check ran this session and no later edit would repair it.
    if (displayName === previousDisplayName) {
      return;
    }

    this.setStepValid('identity', this.availableDisplayName() === displayName);
  }

  async checkDisplayNameAvailability(displayName: string): Promise<void> {
    const requestedDisplayName = displayName.trim();
    if (!requestedDisplayName) {
      this.pendingDisplayNameCheck = '';
      this.displayNameAvailability.set('idle');
      this.availableDisplayName.set(null);
      this.setStepValid('identity', false);
      return;
    }

    this.pendingDisplayNameCheck = requestedDisplayName;
    this.displayNameAvailability.set('checking');

    try {
      const result =
        await this.dataAccess.checkDisplayNameAvailability(
          requestedDisplayName,
        );

      if (this.isSupersededCheck(requestedDisplayName)) {
        return;
      }

      this.displayNameAvailability.set(
        result.available ? 'available' : 'taken',
      );
      this.availableDisplayName.set(
        result.available ? requestedDisplayName : null,
      );
      this.setStepValid('identity', result.available);
    } catch (error) {
      if (this.isSupersededCheck(requestedDisplayName)) {
        return;
      }

      const reason = getDisplayNameFailureReason(error);
      this.availableDisplayName.set(null);
      this.displayNameAvailability.set(
        reason === 'invalid' ? 'invalid' : 'error',
      );
      this.setStepValid('identity', false);
    }
  }

  /**
   * A response only counts as stale once a newer check has started. The step
   * emits the identity draft and the availability check on two independent
   * debounced streams, so comparing against the draft would discard fresh
   * results and leave the step stuck on "checking" forever.
   */
  private isSupersededCheck(requestedDisplayName: string): boolean {
    return this.pendingDisplayNameCheck !== requestedDisplayName;
  }

  updateVisibility(isPublic: boolean): void {
    this.selectedVisibility.set(isPublic);
    this.setStepValid('visibility', true);
  }

  updateCurrency(currency: string): void {
    if (!currency) {
      return;
    }

    this.selectedCurrency.set(currency);
    this.setStepValid('currency', true);
  }

  toggleFavoriteCurrency(currency: string): void {
    this.favoriteCurrencies.update((currencies) =>
      currencies.includes(currency)
        ? currencies.filter((code) => code !== currency)
        : [...currencies, currency],
    );
  }

  /**
   * Applies the language the moment it is picked, so the rest of the assistant
   * is already translated when the user reads it. The settings write happens on
   * advance, together with the other preference steps.
   */
  async updateLanguage(language: string): Promise<void> {
    if (!language || language === this.selectedLanguage()) {
      return;
    }

    this.selectedLanguage.set(language);
    this.setStepValid('language', true);
    const application = this.dataAccess.applyLanguage(language);
    // The waiters only care that the switch has settled; a failed switch is
    // reported to this caller alone, not to every later step transition.
    this.languageApplication = application.catch(() => undefined);
    await application;
  }

  /**
   * Asks the OS for location permission after the step has explained what the
   * position is used for. The answer — grant or denial — completes the step
   * either way; only the request still being in flight blocks advancing.
   */
  async requestLocation(): Promise<void> {
    if (this.locationPermission() === 'requesting') {
      return;
    }

    this.locationPermission.set('requesting');

    const result = await this.dataAccess.requestLocationPermission();

    this.locationPermission.set(result);
    this.setStepValid('location', true);
  }

  /** Declining without opening the OS prompt is an explicit "no". */
  skipLocation(): void {
    this.locationPermission.set('denied');
    this.setStepValid('location', true);
  }

  /**
   * Records the home city. It never touches step validity: the field is
   * optional, so leaving it empty must not block the step, and filling it in
   * must not unblock a step whose permission question is still unanswered.
   */
  updateHomeCity(city: string): void {
    this.homeCity.set(city.trim());
  }

  /**
   * Asks the OS for push permission after the step has explained why, and
   * registers this installation on a grant. The answer — grant or denial —
   * completes the step either way; only the request still being in flight
   * blocks advancing.
   */
  async requestNotifications(): Promise<void> {
    if (this.notificationPermission() === 'requesting') {
      return;
    }

    this.notificationPermission.set('requesting');

    const result = await this.dataAccess.requestPushPermission();

    this.notificationPermission.set(result);
    this.setStepValid('notifications', true);
  }

  /** Declining without opening the OS prompt is an explicit "no". */
  skipNotifications(): void {
    this.notificationPermission.set('denied');
    this.setStepValid('notifications', true);
  }

  private setStepValid(id: OnboardingStepId, valid: boolean): void {
    this.validSteps.update((set) => {
      const next = new Set(set);
      if (valid) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  /**
   * Persists the current step and moves to the next one.
   *
   * The persist is a Firestore round-trip that can take a second or two, so a
   * full-screen loading overlay covers the wait — otherwise the step just sits
   * there looking frozen. The overlay's blocking backdrop and the re-entry guard
   * together stop a second tap from completing the step, and logging its
   * analytics event, twice.
   */
  async next(): Promise<void> {
    if (!this.canAdvance() || this.advancing) {
      return;
    }

    this.advancing = true;
    let advanceToNextStep = false;
    // The guard is released in an outer finally so a failure to even create or
    // present the overlay can never leave `advancing` stuck true — which would
    // silently no-op every later tap on Next.
    try {
      // The overlay message is translated synchronously, so a language picked
      // a moment ago has to have finished loading first. Leaving the step is
      // the very next tap after choosing one, and translating into a language
      // whose file is still in flight renders the raw key (issue #1186).
      await this.languageApplication;

      const loading = await this.loadingController.create({
        message: this.transloco.translate('onboarding-advancing'),
        backdropDismiss: false,
      });
      await loading.present();

      try {
        if (!(await this.persistCurrentStep())) {
          return;
        }

        const completedStep = this.currentStep().id;
        await this.markComplete(completedStep);
        this.analytics.logEvent(AnalyticsEvent.OnboardingStepCompleted, {
          step: completedStep,
        });

        if (this.currentIndex() >= this.steps.length - 1) {
          await this.finish();
          return;
        }

        // Do not expose the next step while this call still owns the re-entry
        // guard. A fast click on the newly rendered Next button would otherwise
        // be ignored while the previous overlay was still dismissing.
        advanceToNextStep = true;
      } finally {
        await loading.dismiss();
      }
    } finally {
      this.advancing = false;
    }

    if (advanceToNextStep) {
      this.currentIndex.update((index) => index + 1);
    }
  }

  back(): void {
    this.currentIndex.update((index) => Math.max(0, index - 1));
  }

  /**
   * Writes the durable completion flag, then releases the session gate and
   * enters the app. A failed write keeps the user on the finish step so they can
   * retry, rather than dropping them into the app with the assistant unmarked
   * and set to reappear on the next start.
   */
  private async finish(): Promise<void> {
    try {
      await this.dataAccess.completeOnboarding();
    } catch (error) {
      console.warn('Failed to complete onboarding:', error);
      return;
    }

    // Funnel exit: only after the durable completion flag is written.
    this.analytics.logEvent(AnalyticsEvent.OnboardingAssistantCompleted);

    this.dataAccess.dismissForSession();

    // Someone who followed a shared Bite link into a first-run onboarding gets
    // that Bite now the assistant is done, not the feed (issue #1246).
    const requestedUrl = this.requestedUrlService.consume();
    void this.navController.navigateRoot(requestedUrl ?? `/${PATH.HOME}`);
  }

  private async markComplete(id: OnboardingStepId): Promise<void> {
    this.completedSteps.update((set) => new Set(set).add(id));
    await this.progress.saveCompletedSteps([...this.completedSteps()]);
  }

  private async persistCurrentStep(): Promise<boolean> {
    const id = this.currentStep().id;

    if (id === 'identity') {
      return this.persistIdentityStep();
    }

    if (id === 'visibility') {
      return this.persistVisibilityStep();
    }

    if (id === 'currency') {
      return this.persistSettings({
        currency: this.selectedCurrency(),
        favoriteCurrencies: [...new Set(this.favoriteCurrencies())],
      });
    }

    if (id === 'language') {
      return this.persistSettings({ language: this.selectedLanguage() });
    }

    if (id === 'location') {
      const persisted = await this.persistSettings({
        location: this.locationPermission() === 'granted',
      });

      return persisted ? this.persistHomeCity() : false;
    }

    // The notification step persists nothing account-level. A grant already
    // registered this installation's push token in `requestNotifications`, and
    // a denial is not a preference worth storing (issue #1184).
    return true;
  }

  /**
   * Writes the given preference changes on top of the full settings document.
   *
   * The settings API replaces the document instead of merging, so every write
   * has to carry the complete object; sending only the changed keys would drop
   * the rest of the user's settings.
   */
  private async persistSettings(changes: Partial<Settings>): Promise<boolean> {
    const settings = this.buildSettings(changes);

    try {
      await this.dataAccess.saveSettings(settings);
      this.settings.set(settings);
      return true;
    } catch (error) {
      console.warn('Failed to persist onboarding settings:', error);
      return false;
    }
  }

  private buildSettings(changes: Partial<Settings>): Settings {
    const current = this.settings();

    return {
      ...current,
      location: current?.location ?? false,
      emailUpdates: current?.emailUpdates ?? false,
      theme: current?.theme ?? this.systemTheme(),
      currency: current?.currency || 'EUR',
      favoriteCurrencies: current?.favoriteCurrencies ?? [],
      language: current?.language || DEFAULT_LANGUAGE,
      ...changes,
    };
  }

  /**
   * Theme for a user with no settings document yet. Onboarding has no theme
   * step, but it writes the first settings document, so it must not persist a
   * light default over a device that is in dark mode.
   */
  private systemTheme(): 'light' | 'dark' {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  private async persistIdentityStep(): Promise<boolean> {
    const profile = this.profile();
    const draft = this.identityDraft();
    const displayName = draft.displayName.trim();

    if (!profile || !displayName) {
      this.setStepValid('identity', false);
      return false;
    }

    try {
      const claim = await this.dataAccess.claimDisplayName(displayName);
      const updated = await this.dataAccess.saveProfile({
        ...profile,
        displayName: claim.displayName,
        normalizedDisplayName: claim.normalizedDisplayName,
        // The identity step collects a display name, not a real name, so it
        // has none to write. See GitHub issue #1270.
        fullName: profile.fullName || '',
        photoUrl: draft.photoUrl || '',
      });
      this.profile.set(updated);
      return true;
    } catch (error) {
      const reason = getDisplayNameFailureReason(error);
      this.displayNameAvailability.set(
        reason === 'taken'
          ? 'taken'
          : reason === 'invalid'
            ? 'invalid'
            : 'error',
      );
      this.availableDisplayName.set(null);
      this.setStepValid('identity', false);
      return false;
    }
  }

  /**
   * Writes the optional home city onto the profile, so the field the profile
   * header already displays finally has a value (issue #1271).
   *
   * An unchanged value writes nothing: most users leave the field alone, and
   * the location step should not cost a profile round-trip for a no-op. An
   * emptied value is still a change and is written, so clearing a city the user
   * set earlier actually removes it.
   *
   * A failed write keeps the user on the step to retry, matching the identity
   * and visibility steps. The settings write that ran first is idempotent, so
   * the retry costs nothing.
   */
  private async persistHomeCity(): Promise<boolean> {
    const profile = this.profile();
    const city = this.homeCity().trim();

    if (!profile || (profile.city ?? '') === city) {
      return true;
    }

    try {
      const updated = await this.dataAccess.saveProfile({ ...profile, city });
      this.profile.set(updated);
      return true;
    } catch (error) {
      console.warn('Failed to persist onboarding home city:', error);
      return false;
    }
  }

  private async persistVisibilityStep(): Promise<boolean> {
    const profile = this.profile();

    if (!profile) {
      this.setStepValid('visibility', false);
      return false;
    }

    try {
      const updated = await this.dataAccess.saveProfile({
        ...profile,
        public: this.selectedVisibility() === true,
      });
      this.profile.set(updated);
      return true;
    } catch (error) {
      // A failed write keeps the user on the visibility step to retry, instead
      // of throwing an unhandled rejection out of next() and advancing anyway.
      console.warn('Failed to persist onboarding visibility:', error);
      return false;
    }
  }

  private firstIncompleteIndex(
    completed: ReadonlySet<OnboardingStepId>,
  ): number {
    const index = this.steps.findIndex((step) => !completed.has(step.id));
    return index === -1 ? this.steps.length - 1 : index;
  }

  private isKnownStep(id: OnboardingStepId): boolean {
    return this.steps.some((step) => step.id === id);
  }
}
