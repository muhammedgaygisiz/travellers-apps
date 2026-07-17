import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import {
  OnboardingDataAccessService,
  OnboardingProgressService,
  OnboardingStepId,
} from 'bite-tribe/onboarding-data-access';
import type { Settings } from 'model';
import { PATH } from 'utils';
import { OnboardingService } from '../onboarding.service';
import { ONBOARDING_STEPS } from '../../steps/onboarding-steps';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let loadCompletedSteps: jest.Mock;
  let saveCompletedSteps: jest.Mock;
  let dismissForSession: jest.Mock;
  let loadCurrentProfile: jest.Mock;
  let checkDisplayNameAvailability: jest.Mock;
  let claimDisplayName: jest.Mock;
  let saveProfile: jest.Mock;
  let loadSettings: jest.Mock;
  let saveSettings: jest.Mock;
  let applyLanguage: jest.Mock;
  let requestPushPermission: jest.Mock;
  let requestLocationPermission: jest.Mock;
  let completeOnboarding: jest.Mock;
  let navigateRoot: jest.Mock;

  /** Device locale backing the currency and language prefill. */
  const mockDeviceLocale = (locale: string): void => {
    Object.defineProperty(navigator, 'language', {
      value: locale,
      configurable: true,
    });
  };

  const setup = (
    completed: OnboardingStepId[] = [],
    profile: Record<string, unknown> = {},
    settings: Settings | undefined = undefined,
  ): void => {
    mockDeviceLocale('en-US');
    loadCompletedSteps = jest.fn().mockResolvedValue(completed);
    saveCompletedSteps = jest.fn().mockResolvedValue(undefined);
    dismissForSession = jest.fn();
    loadCurrentProfile = jest.fn().mockResolvedValue({
      userId: 'user-1',
      displayName: 'CurrentName',
      normalizedDisplayName: 'currentname',
      fullName: 'Current Name',
      email: 'current@example.com',
      photoUrl: 'current-photo',
      public: false,
      ...profile,
    });
    checkDisplayNameAvailability = jest.fn().mockResolvedValue({
      available: true,
      normalizedDisplayName: 'newname',
    });
    claimDisplayName = jest.fn().mockResolvedValue({
      displayName: 'NewName',
      normalizedDisplayName: 'newname',
    });
    saveProfile = jest.fn(async (profile) => profile);
    loadSettings = jest.fn().mockResolvedValue(settings);
    saveSettings = jest.fn().mockResolvedValue(undefined);
    applyLanguage = jest.fn().mockResolvedValue(undefined);
    requestPushPermission = jest.fn().mockResolvedValue('granted');
    requestLocationPermission = jest.fn().mockResolvedValue('granted');
    completeOnboarding = jest.fn().mockResolvedValue(undefined);
    navigateRoot = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        OnboardingService,
        {
          provide: OnboardingDataAccessService,
          useValue: {
            dismissForSession,
            loadCurrentProfile,
            checkDisplayNameAvailability,
            claimDisplayName,
            saveProfile,
            loadSettings,
            saveSettings,
            applyLanguage,
            requestPushPermission,
            requestLocationPermission,
            completeOnboarding,
          },
        },
        {
          provide: OnboardingProgressService,
          useValue: { loadCompletedSteps, saveCompletedSteps },
        },
        { provide: NavController, useValue: { navigateRoot } },
      ],
    });

    service = TestBed.inject(OnboardingService);
  };

  afterEach(() => jest.clearAllMocks());

  it('exposes the steps in the configured order', () => {
    setup();

    expect(service.steps.map((step) => step.id)).toEqual([
      'identity',
      'visibility',
      'currency',
      'language',
      'location',
      'notifications',
      'finish',
    ]);
  });

  describe('initialize', () => {
    it('starts at the first step when nothing is persisted', async () => {
      setup([]);

      await service.initialize();

      expect(service.currentIndex()).toBe(0);
      expect(service.canAdvance()).toBe(true);
      expect(loadCurrentProfile).toHaveBeenCalledTimes(1);
      expect(checkDisplayNameAvailability).toHaveBeenCalledWith('CurrentName');
    });

    it('resumes at the first incomplete step', async () => {
      setup(['identity', 'visibility']);

      await service.initialize();

      expect(service.currentStep().id).toBe('currency');
    });

    it('treats already completed steps as valid so the user can move on', async () => {
      setup(['identity']);

      await service.initialize();
      service.back();

      expect(service.currentStep().id).toBe('identity');
      expect(service.canAdvance()).toBe(true);
    });

    it('lands on the final step when every step is complete', async () => {
      setup(ONBOARDING_STEPS.map((step) => step.id));

      await service.initialize();

      expect(service.currentIndex()).toBe(ONBOARDING_STEPS.length - 1);
    });

    it('ignores unknown persisted step ids', async () => {
      setup(['identity', 'ghost-step' as OnboardingStepId]);

      await service.initialize();

      expect(service.currentStep().id).toBe('visibility');
    });

    it('does not reload progress on repeated calls', async () => {
      setup(['identity']);

      await service.initialize();
      await service.initialize();

      expect(loadCompletedSteps).toHaveBeenCalledTimes(1);
    });

    it('does not validate identity during initialization when no display name is available', async () => {
      setup([], { displayName: '' });

      await service.initialize();

      expect(service.canAdvance()).toBe(false);
      expect(checkDisplayNameAvailability).not.toHaveBeenCalled();
    });
  });

  describe('next', () => {
    it('does not advance while the current step is invalid', async () => {
      setup([], { displayName: '' });
      await service.initialize();

      await service.next();

      expect(service.currentIndex()).toBe(0);
      expect(saveCompletedSteps).not.toHaveBeenCalled();
    });

    it('advances and persists the completed step once valid', async () => {
      setup();
      await service.initialize();

      service.updateIdentity({ displayName: 'NewName', photoUrl: 'new-photo' });
      await service.checkDisplayNameAvailability('NewName');
      await service.next();

      expect(service.currentStep().id).toBe('visibility');
      expect(claimDisplayName).toHaveBeenCalledWith('NewName');
      expect(saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'NewName',
          normalizedDisplayName: 'newname',
          photoUrl: 'new-photo',
        }),
      );
      expect(saveCompletedSteps).toHaveBeenCalledWith(['identity']);
    });

    it('does not leave identity when the display name claim fails', async () => {
      setup();
      claimDisplayName.mockRejectedValue(
        Object.assign(new Error('display_name_taken'), {
          code: 'already-exists',
        }),
      );
      await service.initialize();

      service.updateIdentity({ displayName: 'Taken', photoUrl: '' });
      await service.checkDisplayNameAvailability('Taken');
      await service.next();

      expect(service.currentStep().id).toBe('identity');
      expect(service.displayNameAvailability()).toBe('taken');
      expect(saveCompletedSteps).not.toHaveBeenCalled();
    });

    it('persists visibility only after the user makes an explicit choice', async () => {
      setup(['identity']);
      await service.initialize();

      expect(service.currentStep().id).toBe('visibility');
      expect(service.canAdvance()).toBe(false);

      service.updateVisibility(true);
      await service.next();

      expect(saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({ public: true }),
      );
      expect(saveCompletedSteps).toHaveBeenCalledWith([
        'identity',
        'visibility',
      ]);
      expect(service.currentStep().id).toBe('currency');
    });

    it('lands on the finish step ready to complete without extra input', async () => {
      setup(ONBOARDING_STEPS.slice(0, -1).map((step) => step.id));

      await service.initialize();

      expect(service.currentStep().id).toBe('finish');
      // The finish step gathers nothing, so the Finish button is enabled at once.
      expect(service.canAdvance()).toBe(true);
    });

    it('finishes on the last step by writing the flag and entering the app', async () => {
      setup(ONBOARDING_STEPS.slice(0, -1).map((step) => step.id));
      await service.initialize();

      expect(service.currentStep().id).toBe('finish');
      await service.next();

      expect(saveCompletedSteps).toHaveBeenCalledWith(
        ONBOARDING_STEPS.map((step) => step.id),
      );
      expect(completeOnboarding).toHaveBeenCalledTimes(1);
      expect(dismissForSession).toHaveBeenCalledTimes(1);
      expect(navigateRoot).toHaveBeenCalledWith([`/${PATH.HOME}`]);
    });

    it('keeps the user on the finish step when the completion write fails', async () => {
      setup(ONBOARDING_STEPS.slice(0, -1).map((step) => step.id));
      completeOnboarding.mockRejectedValue(new Error('offline'));
      await service.initialize();

      await service.next();

      // Without a durable flag the assistant would reappear on next start, so
      // the flow must not drop the user into the app.
      expect(dismissForSession).not.toHaveBeenCalled();
      expect(navigateRoot).not.toHaveBeenCalled();
      expect(service.currentStep().id).toBe('finish');
    });
  });

  describe('back', () => {
    it('moves to the previous step', async () => {
      setup(['identity', 'visibility']);
      await service.initialize();

      expect(service.currentStep().id).toBe('currency');
      service.back();

      expect(service.currentStep().id).toBe('visibility');
    });

    it('never moves before the first step', async () => {
      setup();
      await service.initialize();

      service.back();

      expect(service.currentIndex()).toBe(0);
    });

    /**
     * A returning user resumes past the identity step, so no availability check
     * runs for their prefilled name. Stepping back to identity must not make the
     * step depend on a check that never happened: their own stored name is
     * already theirs, and a photo edit says nothing about it.
     */
    it('keeps a completed identity step valid when only the photo changes', async () => {
      setup(['identity'], { displayName: 'Super Mario' });
      await service.initialize();

      expect(service.currentStep().id).toBe('visibility');
      expect(checkDisplayNameAvailability).not.toHaveBeenCalled();

      service.back();

      expect(service.currentStep().id).toBe('identity');
      expect(service.canAdvance()).toBe(true);

      // Adding a photo re-emits the whole draft; the name is untouched.
      service.updateIdentity({
        displayName: 'Super Mario',
        photoUrl: 'data:image/png;base64,AAAA',
      });

      expect(service.canAdvance()).toBe(true);
    });
  });

  describe('setCurrentStepValid', () => {
    it('toggles validity for the active step only', async () => {
      setup();
      await service.initialize();

      service.setCurrentStepValid(true);
      expect(service.canAdvance()).toBe(true);

      service.setCurrentStepValid(false);
      expect(service.canAdvance()).toBe(false);
    });
  });

  describe('updateIdentity', () => {
    it('resets availability and invalidates the step for a blank name', () => {
      setup();

      service.updateIdentity({ displayName: '   ', photoUrl: '' });

      expect(service.displayNameAvailability()).toBe('idle');
      expect(service.isCurrentStepValid()).toBe(false);
    });
  });

  describe('checkDisplayNameAvailability', () => {
    it('resets to idle without calling the backend for a blank name', async () => {
      setup();

      await service.checkDisplayNameAvailability('   ');

      expect(service.displayNameAvailability()).toBe('idle');
      expect(checkDisplayNameAvailability).not.toHaveBeenCalled();
    });

    it('reports invalid when the check rejects with an invalid-name error', async () => {
      setup();
      checkDisplayNameAvailability.mockRejectedValue(
        Object.assign(new Error('invalid_display_name'), {
          code: 'invalid-argument',
        }),
      );

      service.updateIdentity({ displayName: 'Bad Name', photoUrl: '' });
      await service.checkDisplayNameAvailability('Bad Name');

      expect(service.displayNameAvailability()).toBe('invalid');
      expect(service.isCurrentStepValid()).toBe(false);
    });

    it('reports a generic error when the check fails unexpectedly', async () => {
      setup();
      checkDisplayNameAvailability.mockRejectedValue(new Error('network down'));

      service.updateIdentity({ displayName: 'SomeName', photoUrl: '' });
      await service.checkDisplayNameAvailability('SomeName');

      expect(service.displayNameAvailability()).toBe('error');
      expect(service.isCurrentStepValid()).toBe(false);
    });

    it('marks identity valid when the current display name is available', async () => {
      setup();
      await service.initialize();

      service.updateIdentity({ displayName: 'NewName', photoUrl: '' });
      await service.checkDisplayNameAvailability('NewName');

      expect(service.displayNameAvailability()).toBe('available');
      expect(service.canAdvance()).toBe(true);
    });

    it('keeps identity valid when only the selected photo changes after the display name is available', async () => {
      setup();
      await service.initialize();

      service.updateIdentity({ displayName: 'NewName', photoUrl: '' });
      await service.checkDisplayNameAvailability('NewName');
      expect(service.canAdvance()).toBe(true);

      service.updateIdentity({
        displayName: 'NewName',
        photoUrl: 'data:image/jpeg;base64,new-photo',
      });

      expect(service.canAdvance()).toBe(true);
    });

    it('does not allow a changed display name to reuse an earlier available result', async () => {
      setup();
      await service.initialize();

      service.updateIdentity({ displayName: 'FirstName', photoUrl: '' });
      await service.checkDisplayNameAvailability('FirstName');
      expect(service.canAdvance()).toBe(true);

      service.updateIdentity({ displayName: 'SecondName', photoUrl: '' });

      expect(service.canAdvance()).toBe(false);
    });

    it('applies the result when the check resolves before the draft update', async () => {
      // The step emits the availability check and the identity draft on two
      // independent debounced streams, so the check can resolve before the
      // draft lands. The result must still be applied, otherwise the step
      // stays stuck on "checking" and can never be completed.
      setup();
      await service.initialize();

      await service.checkDisplayNameAvailability('NewName');
      service.updateIdentity({ displayName: 'NewName', photoUrl: '' });

      expect(service.displayNameAvailability()).toBe('available');
      expect(service.canAdvance()).toBe(true);
    });

    it('ignores stale availability responses', async () => {
      setup([], { displayName: '' });
      let resolveFirst!: (value: {
        available: boolean;
        normalizedDisplayName: string;
      }) => void;
      checkDisplayNameAvailability
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
        )
        .mockResolvedValueOnce({
          available: true,
          normalizedDisplayName: 'second',
        });
      await service.initialize();

      service.updateIdentity({ displayName: 'First', photoUrl: '' });
      const firstCheck = service.checkDisplayNameAvailability('First');
      service.updateIdentity({ displayName: 'Second', photoUrl: '' });
      await service.checkDisplayNameAvailability('Second');
      resolveFirst({ available: false, normalizedDisplayName: 'first' });
      await firstCheck;

      expect(service.displayNameAvailability()).toBe('available');
      expect(service.canAdvance()).toBe(true);
    });
  });

  const storedSettings = (overrides: Partial<Settings> = {}): Settings => ({
    pushNotifications: false,
    location: false,
    emailUpdates: true,
    theme: 'dark',
    currency: 'CHF',
    favoriteCurrencies: ['GBP'],
    nearby: 25,
    language: 'fr',
    ...overrides,
  });

  describe('currency step', () => {
    it('prefills the default currency from the device locale for a new user', async () => {
      setup(['identity', 'visibility']);
      mockDeviceLocale('de-AT');

      await service.initialize();

      expect(service.currentStep().id).toBe('currency');
      expect(service.selectedCurrency()).toBe('EUR');
      expect(service.favoriteCurrencies()).toEqual([]);
    });

    it('prefills from persisted settings when the user already has them', async () => {
      setup(['identity', 'visibility'], {}, storedSettings());
      mockDeviceLocale('de-AT');

      await service.initialize();

      expect(service.selectedCurrency()).toBe('CHF');
      expect(service.favoriteCurrencies()).toEqual(['GBP']);
    });

    it('is satisfiable straight from the prefill, with favorites left empty', async () => {
      setup(['identity', 'visibility']);
      await service.initialize();

      expect(service.canAdvance()).toBe(true);

      await service.next();

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD', favoriteCurrencies: [] }),
      );
      expect(service.currentStep().id).toBe('language');
    });

    it('persists the chosen currency and de-duplicated favorites', async () => {
      setup(['identity', 'visibility']);
      await service.initialize();

      service.updateCurrency('JPY');
      service.toggleFavoriteCurrency('USD');
      service.toggleFavoriteCurrency('EUR');
      await service.next();

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'JPY',
          favoriteCurrencies: ['USD', 'EUR'],
        }),
      );
    });

    it('toggles a favorite off again', async () => {
      setup(['identity', 'visibility']);
      await service.initialize();

      service.toggleFavoriteCurrency('USD');
      service.toggleFavoriteCurrency('EUR');
      service.toggleFavoriteCurrency('USD');

      expect(service.favoriteCurrencies()).toEqual(['EUR']);
    });

    it('ignores an empty currency rather than clearing a valid one', async () => {
      setup(['identity', 'visibility']);
      await service.initialize();

      service.updateCurrency('');

      expect(service.selectedCurrency()).toBe('USD');
      expect(service.canAdvance()).toBe(true);
    });

    it('does not advance when the settings write fails', async () => {
      setup(['identity', 'visibility']);
      saveSettings.mockRejectedValue(new Error('offline'));
      await service.initialize();

      await service.next();

      expect(service.currentStep().id).toBe('currency');
      expect(saveCompletedSteps).not.toHaveBeenCalled();
    });

    it('preserves settings it does not own, since the write replaces the document', async () => {
      setup(['identity', 'visibility'], {}, storedSettings());
      await service.initialize();

      service.updateCurrency('JPY');
      await service.next();

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'JPY',
          emailUpdates: true,
          theme: 'dark',
          nearby: 25,
          language: 'fr',
        }),
      );
    });
  });

  describe('language step', () => {
    it('prefills from the device locale, ignoring the region', async () => {
      setup(['identity', 'visibility', 'currency']);
      mockDeviceLocale('de-CH');

      await service.initialize();

      expect(service.currentStep().id).toBe('language');
      expect(service.selectedLanguage()).toBe('de');
    });

    it('falls back to English for a locale the app has no translations for', async () => {
      setup(['identity', 'visibility', 'currency']);
      mockDeviceLocale('ja-JP');

      await service.initialize();

      expect(service.selectedLanguage()).toBe('en');
    });

    it('prefills from persisted settings over the device locale', async () => {
      setup(['identity', 'visibility', 'currency'], {}, storedSettings());
      mockDeviceLocale('de-CH');

      await service.initialize();

      expect(service.selectedLanguage()).toBe('fr');
      expect(applyLanguage).toHaveBeenCalledWith('fr');
    });

    it('switches the app language immediately on selection', async () => {
      setup(['identity', 'visibility', 'currency']);
      await service.initialize();
      applyLanguage.mockClear();

      await service.updateLanguage('tr');

      expect(service.selectedLanguage()).toBe('tr');
      expect(applyLanguage).toHaveBeenCalledWith('tr');
      // Applying is immediate; the settings write waits for the step to be left.
      expect(saveSettings).not.toHaveBeenCalled();
    });

    it('persists the language when the step is left', async () => {
      setup(['identity', 'visibility', 'currency']);
      await service.initialize();

      await service.updateLanguage('tr');
      await service.next();

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'tr' }),
      );
      expect(service.currentStep().id).toBe('location');
    });

    it('does not re-apply the language already active', async () => {
      setup(['identity', 'visibility', 'currency']);
      await service.initialize();
      applyLanguage.mockClear();

      await service.updateLanguage('en');

      expect(applyLanguage).not.toHaveBeenCalled();
    });
  });

  describe('location step', () => {
    it('does not prompt before the user asks for it', async () => {
      setup(['identity', 'visibility', 'currency', 'language']);

      await service.initialize();

      expect(service.currentStep().id).toBe('location');
      expect(service.locationPermission()).toBe('idle');
      expect(requestLocationPermission).not.toHaveBeenCalled();
      // The explanation has to be acknowledged before the step can be left.
      expect(service.canAdvance()).toBe(false);
    });

    it('records a granted permission and continues', async () => {
      setup(['identity', 'visibility', 'currency', 'language']);
      await service.initialize();

      await service.requestLocation();

      expect(service.locationPermission()).toBe('granted');
      expect(service.canAdvance()).toBe(true);

      await service.next();

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ location: true }),
      );
      expect(service.currentStep().id).toBe('notifications');
    });

    it('accepts a denial and continues to the notification step', async () => {
      setup(['identity', 'visibility', 'currency', 'language']);
      requestLocationPermission.mockResolvedValue('denied');
      await service.initialize();

      await service.requestLocation();

      expect(service.locationPermission()).toBe('denied');
      expect(service.canAdvance()).toBe(true);

      await service.next();

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ location: false }),
      );
      expect(service.currentStep().id).toBe('notifications');
    });

    it('records no location for a surface without an OS prompt', async () => {
      setup(['identity', 'visibility', 'currency', 'language']);
      requestLocationPermission.mockResolvedValue('unsupported');
      await service.initialize();

      await service.requestLocation();
      await service.next();

      expect(service.locationPermission()).toBe('unsupported');
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ location: false }),
      );
    });

    it('treats skipping as an explicit no without opening the prompt', async () => {
      setup(['identity', 'visibility', 'currency', 'language']);
      await service.initialize();

      service.skipLocation();

      expect(service.locationPermission()).toBe('denied');
      expect(requestLocationPermission).not.toHaveBeenCalled();
      expect(service.canAdvance()).toBe(true);
    });

    it('ignores a second request while one is in flight', async () => {
      setup(['identity', 'visibility', 'currency', 'language']);
      let resolvePermission!: (value: string) => void;
      requestLocationPermission.mockReturnValue(
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
      );
      await service.initialize();

      const first = service.requestLocation();
      const second = service.requestLocation();
      resolvePermission('granted');
      await Promise.all([first, second]);

      expect(requestLocationPermission).toHaveBeenCalledTimes(1);
    });

    it('prefills a stored grant so a returning user is not asked again', async () => {
      setup(
        ['identity', 'visibility', 'currency', 'language'],
        {},
        storedSettings({ location: true }),
      );

      await service.initialize();

      expect(service.locationPermission()).toBe('granted');
      expect(service.canAdvance()).toBe(true);
      expect(requestLocationPermission).not.toHaveBeenCalled();
    });

    it('still offers the choice when nothing was ever recorded', async () => {
      // A stored `false` cannot be told apart from "never asked", so the step
      // asks rather than reporting a refusal the user never gave.
      setup(
        ['identity', 'visibility', 'currency', 'language'],
        {},
        storedSettings({ location: false }),
      );

      await service.initialize();

      expect(service.locationPermission()).toBe('idle');
      expect(service.canAdvance()).toBe(false);
    });

    it('carries the full settings document through the location write', async () => {
      setup(
        ['identity', 'visibility', 'currency', 'language'],
        {},
        storedSettings({ pushNotifications: true }),
      );
      await service.initialize();

      await service.requestLocation();
      await service.next();

      // The settings API replaces the document, so a partial write here would
      // drop the user's unrelated settings.
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          location: true,
          pushNotifications: true,
          emailUpdates: true,
          theme: 'dark',
          currency: 'CHF',
          favoriteCurrencies: ['GBP'],
          nearby: 25,
          language: 'fr',
        }),
      );
    });
  });

  describe('notification step', () => {
    it('does not prompt before the user asks for it', async () => {
      setup(['identity', 'visibility', 'currency', 'language', 'location']);

      await service.initialize();

      expect(service.currentStep().id).toBe('notifications');
      expect(service.notificationPermission()).toBe('idle');
      expect(requestPushPermission).not.toHaveBeenCalled();
      // The explanation has to be acknowledged before the step can be left.
      expect(service.canAdvance()).toBe(false);
    });

    it('records a granted permission and continues', async () => {
      setup(['identity', 'visibility', 'currency', 'language', 'location']);
      await service.initialize();

      await service.requestNotifications();

      expect(service.notificationPermission()).toBe('granted');
      expect(service.canAdvance()).toBe(true);

      await service.next();

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ pushNotifications: true }),
      );
      expect(service.currentStep().id).toBe('finish');
    });

    it('accepts a denial and continues the flow', async () => {
      setup(['identity', 'visibility', 'currency', 'language', 'location']);
      requestPushPermission.mockResolvedValue('denied');
      await service.initialize();

      await service.requestNotifications();

      expect(service.notificationPermission()).toBe('denied');
      expect(service.canAdvance()).toBe(true);

      await service.next();

      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ pushNotifications: false }),
      );
      expect(service.currentStep().id).toBe('finish');
    });

    it('records no push for a surface without an OS prompt', async () => {
      setup(['identity', 'visibility', 'currency', 'language', 'location']);
      requestPushPermission.mockResolvedValue('unsupported');
      await service.initialize();

      await service.requestNotifications();
      await service.next();

      expect(service.notificationPermission()).toBe('unsupported');
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ pushNotifications: false }),
      );
    });

    it('treats skipping as an explicit no without opening the prompt', async () => {
      setup(['identity', 'visibility', 'currency', 'language', 'location']);
      await service.initialize();

      service.skipNotifications();

      expect(service.notificationPermission()).toBe('denied');
      expect(requestPushPermission).not.toHaveBeenCalled();
      expect(service.canAdvance()).toBe(true);
    });

    it('ignores a second request while one is in flight', async () => {
      setup(['identity', 'visibility', 'currency', 'language', 'location']);
      let resolvePermission!: (value: string) => void;
      requestPushPermission.mockReturnValue(
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
      );
      await service.initialize();

      const first = service.requestNotifications();
      const second = service.requestNotifications();
      resolvePermission('granted');
      await Promise.all([first, second]);

      expect(requestPushPermission).toHaveBeenCalledTimes(1);
    });

    it('prefills a stored grant so a returning user is not asked again', async () => {
      setup(
        ['identity', 'visibility', 'currency', 'language', 'location'],
        {},
        storedSettings({ pushNotifications: true }),
      );

      await service.initialize();

      expect(service.notificationPermission()).toBe('granted');
      expect(service.canAdvance()).toBe(true);
    });
  });
});
