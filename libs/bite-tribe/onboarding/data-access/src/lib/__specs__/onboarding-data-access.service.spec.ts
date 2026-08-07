import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { TranslocoService, Translation } from '@jsverse/transloco';
import { Observable, of, throwError } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { PublicUser, Settings } from 'model';
import {
  enablePushOnThisDevice,
  getPushPermissionState,
} from 'push-notifications';
import { requestLocationPermission } from 'geolocation';
import {
  ONBOARDING_VERSION,
  OnboardingDataAccessService,
} from '../onboarding-data-access.service';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: { getDocument: jest.fn() },
}));

jest.mock('@capacitor/preferences', () => ({
  Preferences: { set: jest.fn() },
}));

jest.mock('push-notifications', () => ({
  enablePushOnThisDevice: jest.fn(),
  getPushPermissionState: jest.fn(),
}));

jest.mock('geolocation', () => ({
  requestLocationPermission: jest.fn(),
}));

const getDocument = FirebaseFirestore.getDocument as jest.Mock;
const preferencesSet = Preferences.set as jest.Mock;
const enablePushOnThisDeviceMock = enablePushOnThisDevice as jest.Mock;
const getPushPermissionStateMock = getPushPermissionState as jest.Mock;
const requestLocationPermissionMock = requestLocationPermission as jest.Mock;

describe('OnboardingDataAccessService', () => {
  let service: OnboardingDataAccessService;
  let getUser: jest.Mock;
  let whenAuthStateRestored: jest.Mock;
  let setActiveLang: jest.Mock;
  let load: jest.Mock;
  let notifySavedSettings: jest.Mock;
  let notifySavedProfile: jest.Mock;
  let platformMock: Platform;
  let apiMock: {
    checkDisplayNameAvailability: jest.Mock;
    claimDisplayName: jest.Mock;
    updateUser: jest.Mock;
    loadSettings: jest.Mock;
    saveSettings: jest.Mock;
    markOnboardingComplete: jest.Mock;
  };

  const setup = (uid: string | null = 'user-1'): void => {
    whenAuthStateRestored = jest.fn(() => Promise.resolve());
    getUser = jest.fn(() =>
      uid
        ? {
            uid,
            displayName: 'Auth Name',
            email: 'auth@example.com',
            photoUrl: 'auth-photo',
          }
        : null,
    );
    apiMock = {
      checkDisplayNameAvailability: jest.fn().mockResolvedValue({
        available: true,
        normalizedDisplayName: 'foodie',
      }),
      claimDisplayName: jest.fn().mockResolvedValue({
        displayName: 'Foodie',
        normalizedDisplayName: 'foodie',
      }),
      updateUser: jest.fn(async (profile) => profile),
      loadSettings: jest.fn().mockResolvedValue({}),
      saveSettings: jest.fn().mockResolvedValue(undefined),
      markOnboardingComplete: jest.fn().mockResolvedValue(undefined),
    };
    setActiveLang = jest.fn();
    load = jest.fn(() => of({} as Translation));
    notifySavedSettings = jest.fn();
    notifySavedProfile = jest.fn();
    platformMock = { is: jest.fn(() => true) } as unknown as Platform;

    TestBed.configureTestingModule({
      providers: [
        OnboardingDataAccessService,
        {
          provide: AuthService,
          useValue: { getUser, whenAuthStateRestored },
        },
        { provide: BiteTribeApiService, useValue: apiMock },
        {
          provide: BiteTribeStoreService,
          useValue: { notifySavedSettings, notifySavedProfile },
        },
        { provide: TranslocoService, useValue: { setActiveLang, load } },
        { provide: Platform, useValue: platformMock },
      ],
    });

    service = TestBed.inject(OnboardingDataAccessService);
  };

  afterEach(() => jest.clearAllMocks());

  it('returns false when there is no authenticated user', async () => {
    setup(null);

    await expect(service.isOnboardingComplete()).resolves.toBe(false);
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('returns false when the user document has no completion flag', async () => {
    setup();
    getDocument.mockResolvedValue({ snapshot: { data: { userId: 'user-1' } } });

    await expect(service.isOnboardingComplete()).resolves.toBe(false);
  });

  it('returns true when onboardingCompletedAt is set', async () => {
    setup();
    getDocument.mockResolvedValue({
      snapshot: { data: { onboardingCompletedAt: '2026-07-15T00:00:00.000Z' } },
    });

    await expect(service.isOnboardingComplete()).resolves.toBe(true);
  });

  it('caches completion for the session and stops reading the document', async () => {
    setup();
    getDocument.mockResolvedValue({
      snapshot: { data: { onboardingCompletedAt: '2026-07-15T00:00:00.000Z' } },
    });

    await service.isOnboardingComplete();
    await service.isOnboardingComplete();

    expect(getDocument).toHaveBeenCalledTimes(1);
  });

  it('waits for the auth state before deciding on a cold start', async () => {
    // The entry gate runs alongside authGuard, so on a cold deep link the user
    // arrives while this is already being asked (issue #1246).
    setup(null);
    getDocument.mockResolvedValue({
      snapshot: { data: { onboardingCompletedAt: '2026-07-15T00:00:00.000Z' } },
    });
    whenAuthStateRestored.mockImplementation(() => {
      getUser.mockReturnValue({ uid: 'user-1' });
      return Promise.resolve();
    });

    await expect(service.isOnboardingComplete()).resolves.toBe(true);
    expect(getDocument).toHaveBeenCalledWith({ reference: 'users/user-1' });
  });

  it('treats a read failure as not complete', async () => {
    setup();
    getDocument.mockRejectedValue(new Error('offline'));

    await expect(service.isOnboardingComplete()).resolves.toBe(false);
  });

  it('tracks a session-scoped dismissal', () => {
    setup();

    expect(service.dismissedForSession()).toBe(false);

    service.dismissForSession();

    expect(service.dismissedForSession()).toBe(true);
  });

  describe('completeOnboarding', () => {
    it('writes the completion flag through the API with the current version', async () => {
      setup();

      await service.completeOnboarding();

      expect(apiMock.markOnboardingComplete).toHaveBeenCalledWith(
        ONBOARDING_VERSION,
      );
    });

    it('caches completion for the session once the write succeeds', async () => {
      setup();

      await service.completeOnboarding();

      // A cached completion answers the gate without re-reading the document.
      await expect(service.isOnboardingComplete()).resolves.toBe(true);
      expect(getDocument).not.toHaveBeenCalled();
    });

    it('does not cache completion when the write fails', async () => {
      setup();
      apiMock.markOnboardingComplete.mockRejectedValue(new Error('offline'));

      await expect(service.completeOnboarding()).rejects.toThrow('offline');

      getDocument.mockResolvedValue({ snapshot: { data: {} } });
      await expect(service.isOnboardingComplete()).resolves.toBe(false);
    });
  });

  it('loads the current profile from the user document', async () => {
    setup();
    getDocument.mockResolvedValue({
      snapshot: {
        data: {
          userId: 'user-1',
          displayName: 'Stored Name',
          email: 'stored@example.com',
          photoUrl: 'stored-photo',
          public: true,
        },
      },
    });

    await expect(service.loadCurrentProfile()).resolves.toEqual(
      expect.objectContaining({
        userId: 'user-1',
        displayName: 'Stored Name',
        email: 'stored@example.com',
        photoUrl: 'stored-photo',
        public: true,
      }),
    );
  });

  it('falls back to auth provider profile fields when the document read fails', async () => {
    setup();
    getDocument.mockRejectedValue(new Error('offline'));

    await expect(service.loadCurrentProfile()).resolves.toEqual(
      expect.objectContaining({
        userId: 'user-1',
        displayName: 'Auth Name',
        fullName: 'Auth Name',
        email: 'auth@example.com',
        photoUrl: 'auth-photo',
        public: false,
      }),
    );
  });

  it('returns undefined when loading a profile without an authenticated user', async () => {
    setup(null);

    await expect(service.loadCurrentProfile()).resolves.toBeUndefined();
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('maps all stored fields when the document is fully populated', async () => {
    setup();
    getDocument.mockResolvedValue({
      snapshot: {
        data: {
          userId: 'user-1',
          displayName: 'Stored Name',
          normalizedDisplayName: 'stored name',
          fullName: 'Stored Full Name',
          email: 'stored@example.com',
          photoUrl: 'stored-photo',
          city: 'Stored City',
          about: 'Stored bio',
          public: true,
        },
      },
    });

    await expect(service.loadCurrentProfile()).resolves.toEqual(
      expect.objectContaining({
        fullName: 'Stored Full Name',
        normalizedDisplayName: 'stored name',
        city: 'Stored City',
        about: 'Stored bio',
      }),
    );
  });

  it('uses the auth provider photo when the document has none', async () => {
    setup();
    getUser.mockReturnValue({
      uid: 'user-1',
      providerData: [{ photoURL: 'provider-photo' }],
    });
    getDocument.mockResolvedValue({ snapshot: { data: {} } });

    await expect(service.loadCurrentProfile()).resolves.toEqual(
      expect.objectContaining({
        userId: 'user-1',
        displayName: '',
        fullName: '',
        email: '',
        photoUrl: 'provider-photo',
      }),
    );
  });

  it('prefers a provider entry that exposes photoUrl', async () => {
    setup();
    getUser.mockReturnValue({
      uid: 'user-1',
      providerData: [{ photoUrl: 'lower-case-photo' }],
    });
    getDocument.mockResolvedValue({ snapshot: { data: {} } });

    await expect(service.loadCurrentProfile()).resolves.toEqual(
      expect.objectContaining({ photoUrl: 'lower-case-photo' }),
    );
  });

  it('falls back to empty strings when the provider entry has no photo', async () => {
    setup();
    getUser.mockReturnValue({
      uid: 'user-1',
      providerData: [{ label: 'no-photo-here' }],
    });
    getDocument.mockResolvedValue({ snapshot: { data: {} } });

    await expect(service.loadCurrentProfile()).resolves.toEqual(
      expect.objectContaining({ userId: 'user-1', photoUrl: '' }),
    );
  });

  it('checks display name availability through the profile API', async () => {
    setup();

    await expect(
      service.checkDisplayNameAvailability('Foodie'),
    ).resolves.toEqual({
      available: true,
      normalizedDisplayName: 'foodie',
    });
    expect(apiMock.checkDisplayNameAvailability).toHaveBeenCalledWith('Foodie');
  });

  it('claims display names through the profile API', async () => {
    setup();

    await expect(service.claimDisplayName('Foodie')).resolves.toEqual({
      displayName: 'Foodie',
      normalizedDisplayName: 'foodie',
    });
    expect(apiMock.claimDisplayName).toHaveBeenCalledWith('Foodie');
  });

  it('saves the profile through the profile API', async () => {
    setup();
    const profile: PublicUser = {
      userId: 'user-1',
      displayName: 'Foodie',
      email: 'foodie@example.com',
      photoUrl: '',
    };

    await expect(service.saveProfile(profile)).resolves.toBe(profile);
    expect(apiMock.updateUser).toHaveBeenCalledWith(profile);
  });

  it('syncs the saved profile into the store', async () => {
    setup();
    const profile: PublicUser = {
      userId: 'user-1',
      displayName: 'Foodie',
      email: 'foodie@example.com',
      photoUrl: 'data:image/png;base64,AAAA',
    };
    // The API resolves the uploaded photo to its storage URL, and that is what
    // the rest of the app has to read — not the base64 the step held.
    const persisted = { ...profile, photoUrl: 'https://storage/photo.jpg' };
    apiMock.updateUser.mockResolvedValue(persisted);

    await service.saveProfile(profile);

    // The store profile is only loaded at login, so without this the profile
    // page keeps showing the pre-onboarding avatar until a reload.
    expect(notifySavedProfile).toHaveBeenCalledWith(persisted);
  });

  describe('loadSettings', () => {
    it('returns the stored settings', async () => {
      setup();
      const settings = { currency: 'CHF', language: 'fr' };
      apiMock.loadSettings.mockResolvedValue(settings);

      await expect(service.loadSettings()).resolves.toBe(settings);
    });

    it('treats an empty document as no settings, so the locale prefill wins', async () => {
      setup();
      apiMock.loadSettings.mockResolvedValue({});

      await expect(service.loadSettings()).resolves.toBeUndefined();
    });

    it('treats a read failure as no settings rather than blocking the step', async () => {
      setup();
      apiMock.loadSettings.mockRejectedValue(new Error('offline'));

      await expect(service.loadSettings()).resolves.toBeUndefined();
    });
  });

  describe('saveSettings', () => {
    it('writes through the API and syncs the store', async () => {
      setup();
      const settings = {
        currency: 'EUR',
        language: 'en',
      } as unknown as Settings;

      await service.saveSettings(settings);

      expect(apiMock.saveSettings).toHaveBeenCalledWith(settings);
      expect(notifySavedSettings).toHaveBeenCalledWith(settings);
    });

    it('does not sync the store when the write fails', async () => {
      setup();
      apiMock.saveSettings.mockRejectedValue(new Error('offline'));

      await expect(
        service.saveSettings({} as unknown as Settings),
      ).rejects.toThrow('offline');
      expect(notifySavedSettings).not.toHaveBeenCalled();
    });
  });

  describe('applyLanguage', () => {
    it('switches the active language and persists it for the next start', async () => {
      setup();

      await service.applyLanguage('tr');

      expect(preferencesSet).toHaveBeenCalledWith({ key: 'lang', value: 'tr' });
      expect(load).toHaveBeenCalledWith('tr');
      expect(setActiveLang).toHaveBeenCalledWith('tr');
    });

    it('loads the translations before activating the language', async () => {
      // Activating first would leave a synchronous `translate` - the
      // onboarding loading overlay - reading a language with no translations
      // loaded yet, which renders the raw key (issue #1186).
      setup();
      const order: string[] = [];
      let resolveLoad: () => void = () => undefined;
      let signalLoadStarted: () => void = () => undefined;
      const loadStarted = new Promise<void>(
        (resolve) => (signalLoadStarted = resolve),
      );
      load.mockReturnValue(
        new Observable<Translation>((subscriber) => {
          order.push('load');
          signalLoadStarted();
          resolveLoad = (): void => {
            subscriber.next({});
            subscriber.complete();
          };
        }),
      );
      setActiveLang.mockImplementation(() => order.push('setActiveLang'));

      const applied = service.applyLanguage('de');
      await loadStarted;

      expect(order).toEqual(['load']);

      resolveLoad();
      await applied;

      expect(order).toEqual(['load', 'setActiveLang']);
    });

    it('still switches the language when the preference write fails', async () => {
      // The in-progress flow must stay translated even if the device storage
      // is unavailable; only the next cold start would lose the choice.
      setup();
      preferencesSet.mockRejectedValue(new Error('storage full'));

      await service.applyLanguage('de');

      expect(setActiveLang).toHaveBeenCalledWith('de');
    });

    it('still switches the language when the translations cannot be loaded', async () => {
      // Transloco falls back to the fallback language's translations, which
      // beats stranding the user on the language they just replaced.
      setup();
      load.mockReturnValue(throwError(() => new Error('offline')));

      await service.applyLanguage('de');

      expect(setActiveLang).toHaveBeenCalledWith('de');
    });
  });

  describe('requestPushPermission', () => {
    it('asks for permission and registers this installation on a grant', async () => {
      setup();
      enablePushOnThisDeviceMock.mockResolvedValue('granted');

      await expect(service.requestPushPermission()).resolves.toBe('granted');
      expect(enablePushOnThisDeviceMock).toHaveBeenCalledWith(
        platformMock,
        'user-1',
      );
    });

    it('asks nothing without a signed-in user to register a token against', () => {
      setup(null);

      return expect(service.requestPushPermission()).resolves.toBe(
        'unsupported',
      );
    });
  });

  describe('getPushPermissionState', () => {
    it("reads this device's OS grant without prompting", async () => {
      setup();
      getPushPermissionStateMock.mockResolvedValue('denied');

      await expect(service.getPushPermissionState()).resolves.toBe('denied');
      expect(getPushPermissionStateMock).toHaveBeenCalledWith(platformMock);
    });
  });

  describe('requestLocationPermission', () => {
    it('delegates to the shared geolocation permission ask', async () => {
      setup();
      requestLocationPermissionMock.mockResolvedValue('denied');

      await expect(service.requestLocationPermission()).resolves.toBe('denied');
      expect(requestLocationPermissionMock).toHaveBeenCalled();
    });
  });
});
