import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { Preferences } from '@capacitor/preferences';
import { CoachMarkStateService } from '../coach-mark-state.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const get = Preferences.get as jest.Mock;
const set = Preferences.set as jest.Mock;

describe('CoachMarkStateService', () => {
  let service: CoachMarkStateService;

  const setup = (uid: string | null = 'user-1'): void => {
    TestBed.configureTestingModule({
      providers: [
        CoachMarkStateService,
        {
          provide: AuthService,
          useValue: {
            getUser: (): { uid: string } | null => (uid ? { uid } : null),
          },
        },
      ],
    });

    service = TestBed.inject(CoachMarkStateService);
  };

  afterEach(() => jest.clearAllMocks());

  describe('hasSeen', () => {
    it('is false when there is no authenticated user', async () => {
      setup(null);

      await expect(service.hasSeen('map')).resolves.toBe(false);
      expect(get).not.toHaveBeenCalled();
    });

    it('is false when nothing has been dismissed yet', async () => {
      setup();
      get.mockResolvedValue({ value: null });

      await expect(service.hasSeen('map')).resolves.toBe(false);
      expect(get).toHaveBeenCalledWith({ key: 'coach-marks-seen:user-1' });
    });

    it('is true only for a surface already recorded as seen', async () => {
      setup();
      get.mockResolvedValue({
        value: JSON.stringify(['home-feed', 'home-feed-controls', 'map']),
      });

      await expect(service.hasSeen('home-feed-controls')).resolves.toBe(true);
      await expect(service.hasSeen('map')).resolves.toBe(true);
      await expect(service.hasSeen('leaderboard')).resolves.toBe(false);
    });

    it('is false when the seen state cannot be read', async () => {
      setup();
      get.mockRejectedValue(new Error('storage unavailable'));

      await expect(service.hasSeen('map')).resolves.toBe(false);
    });
  });

  describe('markSeen', () => {
    it('appends the surface to the persisted seen set', async () => {
      setup();
      get.mockResolvedValue({ value: JSON.stringify(['home-feed']) });
      set.mockResolvedValue(undefined);

      await service.markSeen('map');

      expect(set).toHaveBeenCalledWith({
        key: 'coach-marks-seen:user-1',
        value: JSON.stringify(['home-feed', 'map']),
      });
    });

    it('does not write again for a surface already seen', async () => {
      setup();
      get.mockResolvedValue({ value: JSON.stringify(['map']) });

      await service.markSeen('map');

      expect(set).not.toHaveBeenCalled();
    });

    it('does nothing without an authenticated user', async () => {
      setup(null);

      await service.markSeen('map');

      expect(set).not.toHaveBeenCalled();
    });
  });
});
