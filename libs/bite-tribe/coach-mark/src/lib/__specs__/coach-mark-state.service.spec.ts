import { TestBed } from '@angular/core/testing';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { Preferences } from '@capacitor/preferences';
import { CoachMarkStateService } from '../coach-mark-state.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

const get = Preferences.get as jest.Mock;
const set = Preferences.set as jest.Mock;

describe('CoachMarkStateService', () => {
  let service: CoachMarkStateService;
  let logEvent: jest.Mock;

  const setup = (uid: string | null = 'user-1'): void => {
    logEvent = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        CoachMarkStateService,
        { provide: AnalyticsService, useValue: { logEvent } },
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
        value: JSON.stringify([
          'home-feed',
          'home-menu',
          'home-feed-controls',
          'bite-details',
          'bite-details-share',
          'bite-details-navigation',
          'bite-details-bucket-list',
          'map',
        ]),
      });

      await expect(service.hasSeen('bite-details')).resolves.toBe(true);
      await expect(service.hasSeen('bite-details-share')).resolves.toBe(true);
      await expect(service.hasSeen('bite-details-navigation')).resolves.toBe(
        true,
      );
      await expect(service.hasSeen('bite-details-bucket-list')).resolves.toBe(
        true,
      );
      await expect(service.hasSeen('home-menu')).resolves.toBe(true);
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

    it('logs a dismissal event with the surface on a first-time dismissal', async () => {
      setup();
      get.mockResolvedValue({ value: JSON.stringify(['home-feed']) });
      set.mockResolvedValue(undefined);

      await service.markSeen('map');

      expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.CoachMarkDismissed, {
        surface: 'map',
      });
    });

    it('logs the dismissal even when persisting the seen state fails', async () => {
      setup();
      get.mockResolvedValue({ value: null });
      set.mockRejectedValue(new Error('storage unavailable'));

      await service.markSeen('leaderboard');

      expect(logEvent).toHaveBeenCalledWith(AnalyticsEvent.CoachMarkDismissed, {
        surface: 'leaderboard',
      });
    });

    it('does not log again for a surface already seen', async () => {
      setup();
      get.mockResolvedValue({ value: JSON.stringify(['map']) });

      await service.markSeen('map');

      expect(logEvent).not.toHaveBeenCalled();
    });

    it('does not log without an authenticated user', async () => {
      setup(null);

      await service.markSeen('map');

      expect(logEvent).not.toHaveBeenCalled();
    });
  });
});
