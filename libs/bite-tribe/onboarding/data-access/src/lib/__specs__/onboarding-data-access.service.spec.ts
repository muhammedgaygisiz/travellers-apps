import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeApiService } from 'bite-tribe/api';
import { OnboardingDataAccessService } from '../onboarding-data-access.service';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: { getDocument: jest.fn() },
}));

const getDocument = FirebaseFirestore.getDocument as jest.Mock;

describe('OnboardingDataAccessService', () => {
  let service: OnboardingDataAccessService;
  let getUser: jest.Mock;
  let apiMock: {
    checkDisplayNameAvailability: jest.Mock;
    claimDisplayName: jest.Mock;
    updateUser: jest.Mock;
  };

  const setup = (uid: string | null = 'user-1'): void => {
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
    };

    TestBed.configureTestingModule({
      providers: [
        OnboardingDataAccessService,
        { provide: AuthService, useValue: { getUser } },
        { provide: BiteTribeApiService, useValue: apiMock },
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
    const profile = {
      userId: 'user-1',
      displayName: 'Foodie',
      email: 'foodie@example.com',
      photoUrl: '',
    } as any;

    await expect(service.saveProfile(profile)).resolves.toBe(profile);
    expect(apiMock.updateUser).toHaveBeenCalledWith(profile);
  });
});
