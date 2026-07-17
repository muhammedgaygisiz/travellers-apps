import { computed, inject, Injectable, signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import { getCurrencyForLocale, getDisplayNameFailureReason, PATH } from 'utils';
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
  readonly visibilitySelectionExplicit = signal(false);

  readonly settings = signal<Settings | undefined>(undefined);
  readonly selectedCurrency = signal<string>('EUR');
  readonly favoriteCurrencies = signal<readonly string[]>([]);
  readonly selectedLanguage = signal<string>(DEFAULT_LANGUAGE);
  readonly locationPermission = signal<LocationPermissionState>('idle');
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

  /** Display name of the most recent availability check still awaiting a result. */
  private pendingDisplayNameCheck = '';

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
    this.selectedVisibility.set(profile?.public ?? false);

    await this.initializePreferences();

    const displayName = this.identityDraft().displayName.trim();
    if (this.currentStep().id === 'identity' && displayName) {
      await this.checkDisplayNameAvailability(displayName);
    }
  }

  /**
   * Prefills the currency, language, location, and notification steps.
   * Persisted settings win so a returning user sees their own choices; a
   * first-time user gets the device locale's best guess, which already makes
   * both preference steps satisfiable.
   */
  private async initializePreferences(): Promise<void> {
    const settings = await this.dataAccess.loadSettings();
    this.settings.set(settings);

    const locale = this.deviceLocale();

    this.selectedCurrency.set(
      settings?.currency || getCurrencyForLocale(locale),
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
    // never gave. The location step follows the same rule.
    if (settings?.location) {
      this.locationPermission.set('granted');
      this.setStepValid('location', true);
    }

    if (settings?.pushNotifications) {
      this.notificationPermission.set('granted');
      this.setStepValid('notifications', true);
    }
  }

  private deviceLocale(): string {
    return navigator.language || navigator.languages?.[0] || DEFAULT_LANGUAGE;
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
    this.identityDraft.set(draft);

    const displayName = draft.displayName.trim();
    if (!displayName) {
      this.pendingDisplayNameCheck = '';
      this.displayNameAvailability.set('idle');
      this.availableDisplayName.set(null);
      this.setStepValid('identity', false);
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
    this.visibilitySelectionExplicit.set(true);
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
    await this.dataAccess.applyLanguage(language);
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
   * Asks the OS for push permission after the step has explained why. The
   * answer — grant or denial — completes the step either way; only the request
   * still being in flight blocks advancing.
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
    if (id === 'visibility' && !this.visibilitySelectionExplicit()) {
      valid = false;
    }

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

  async next(): Promise<void> {
    if (!this.canAdvance()) {
      return;
    }

    if (!(await this.persistCurrentStep())) {
      return;
    }

    await this.markComplete(this.currentStep().id);

    if (this.currentIndex() >= this.steps.length - 1) {
      this.finish();
      return;
    }

    this.currentIndex.update((index) => index + 1);
  }

  back(): void {
    this.currentIndex.update((index) => Math.max(0, index - 1));
  }

  private finish(): void {
    // The durable completion flag write lands with the finish step (#1016).
    // Until then, completing the flow releases the session gate and enters the
    // app so the shell is usable end to end.
    this.dataAccess.dismissForSession();
    void this.navController.navigateRoot([`/${PATH.HOME}`]);
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
      return this.persistSettings({
        location: this.locationPermission() === 'granted',
      });
    }

    if (id === 'notifications') {
      return this.persistSettings({
        pushNotifications: this.notificationPermission() === 'granted',
      });
    }

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
      pushNotifications: current?.pushNotifications ?? false,
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
        fullName: profile.fullName || claim.displayName,
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

  private async persistVisibilityStep(): Promise<boolean> {
    const profile = this.profile();

    if (!profile || !this.visibilitySelectionExplicit()) {
      this.setStepValid('visibility', false);
      return false;
    }

    const updated = await this.dataAccess.saveProfile({
      ...profile,
      public: this.selectedVisibility() === true,
    });
    this.profile.set(updated);
    return true;
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
