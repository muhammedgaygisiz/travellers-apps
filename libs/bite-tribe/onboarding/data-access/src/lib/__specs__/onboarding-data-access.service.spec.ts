import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { OnboardingDataAccessService } from '../onboarding-data-access.service';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: { getDocument: jest.fn() },
}));

const getDocument = FirebaseFirestore.getDocument as jest.Mock;

describe('OnboardingDataAccessService', () => {
  let service: OnboardingDataAccessService;
  let getUser: jest.Mock;

  const setup = (uid: string | null = 'user-1'): void => {
    getUser = jest.fn(() => (uid ? { uid } : null));

    TestBed.configureTestingModule({
      providers: [
        OnboardingDataAccessService,
        { provide: AuthService, useValue: { getUser } },
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
});
