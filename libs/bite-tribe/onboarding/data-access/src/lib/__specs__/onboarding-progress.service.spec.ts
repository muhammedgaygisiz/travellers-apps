import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { Preferences } from '@capacitor/preferences';
import { OnboardingProgressService } from '../onboarding-progress.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
}));

const get = Preferences.get as jest.Mock;
const set = Preferences.set as jest.Mock;
const remove = Preferences.remove as jest.Mock;

describe('OnboardingProgressService', () => {
  let service: OnboardingProgressService;

  const setup = (uid: string | null = 'user-1'): void => {
    TestBed.configureTestingModule({
      providers: [
        OnboardingProgressService,
        {
          provide: AuthService,
          useValue: {
            getUser: (): { uid: string } | null => (uid ? { uid } : null),
          },
        },
      ],
    });

    service = TestBed.inject(OnboardingProgressService);
  };

  afterEach(() => jest.clearAllMocks());

  describe('loadCompletedSteps', () => {
    it('returns an empty list when there is no authenticated user', async () => {
      setup(null);

      await expect(service.loadCompletedSteps()).resolves.toEqual([]);
      expect(get).not.toHaveBeenCalled();
    });

    it('returns an empty list when nothing is stored', async () => {
      setup();
      get.mockResolvedValue({ value: null });

      await expect(service.loadCompletedSteps()).resolves.toEqual([]);
      expect(get).toHaveBeenCalledWith({ key: 'onboarding-progress:user-1' });
    });

    it('parses the persisted completed steps', async () => {
      setup();
      get.mockResolvedValue({
        value: JSON.stringify(['identity', 'currency']),
      });

      await expect(service.loadCompletedSteps()).resolves.toEqual([
        'identity',
        'currency',
      ]);
    });

    it('returns an empty list when the stored value is not an array', async () => {
      setup();
      get.mockResolvedValue({ value: JSON.stringify({ identity: true }) });

      await expect(service.loadCompletedSteps()).resolves.toEqual([]);
    });

    it('returns an empty list when progress cannot be read', async () => {
      setup();
      get.mockRejectedValue(new Error('storage unavailable'));

      await expect(service.loadCompletedSteps()).resolves.toEqual([]);
    });
  });

  describe('saveCompletedSteps', () => {
    it('persists the completed steps for the user', async () => {
      setup();
      set.mockResolvedValue(undefined);

      await service.saveCompletedSteps(['identity', 'visibility']);

      expect(set).toHaveBeenCalledWith({
        key: 'onboarding-progress:user-1',
        value: JSON.stringify(['identity', 'visibility']),
      });
    });

    it('does nothing when there is no authenticated user', async () => {
      setup(null);

      await service.saveCompletedSteps(['identity']);

      expect(set).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('removes the persisted progress for the user', async () => {
      setup();
      remove.mockResolvedValue(undefined);

      await service.clear();

      expect(remove).toHaveBeenCalledWith({
        key: 'onboarding-progress:user-1',
      });
    });
  });
});
