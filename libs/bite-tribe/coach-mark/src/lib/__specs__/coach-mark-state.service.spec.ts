import { TestBed } from '@angular/core/testing';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { Preferences } from '@capacitor/preferences';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { CoachMarkStateService } from '../coach-mark-state.service';

jest.mock('@capacitor/preferences', () => ({
  Preferences: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: { getDocument: jest.fn(), updateDocument: jest.fn() },
}));

const get = Preferences.get as jest.Mock;
const set = Preferences.set as jest.Mock;
const getDocument = FirebaseFirestore.getDocument as jest.Mock;
const updateDocument = FirebaseFirestore.updateDocument as jest.Mock;

/** The account's seen set, as the user document holds it. */
const accountHolds = (coachMarksSeen?: string[]): void => {
  getDocument.mockResolvedValue({
    snapshot: { id: 'user-1', data: coachMarksSeen ? { coachMarksSeen } : {} },
  });
};

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

  beforeEach(() => {
    accountHolds();
    updateDocument.mockResolvedValue(undefined);
  });

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

  // The seen set belongs to the account, so a reinstall or a new phone keeps
  // it; the device copy covers an unreadable account and the marks dismissed
  // before the account held them (issue #1851).
  describe('on the account', () => {
    it('treats a surface the account has seen as seen on a fresh install', async () => {
      setup();
      get.mockResolvedValue({ value: null });
      accountHolds(['home-feed']);

      await expect(service.hasSeen('home-feed')).resolves.toBe(true);
      expect(getDocument).toHaveBeenCalledWith({ reference: 'users/user-1' });
    });

    it('treats a surface seen only on this device as seen', async () => {
      setup();
      get.mockResolvedValue({ value: JSON.stringify(['map']) });
      accountHolds([]);

      await expect(service.hasSeen('map')).resolves.toBe(true);
    });

    it('writes the union of device and account to both on a dismissal', async () => {
      setup();
      get.mockResolvedValue({ value: JSON.stringify(['map']) });
      accountHolds(['home-feed']);
      set.mockResolvedValue(undefined);

      await service.markSeen('leaderboard');

      expect(updateDocument).toHaveBeenCalledWith({
        reference: 'users/user-1',
        data: { coachMarksSeen: ['home-feed', 'map', 'leaderboard'] },
      });
      expect(set).toHaveBeenCalledWith({
        key: 'coach-marks-seen:user-1',
        value: JSON.stringify(['home-feed', 'map', 'leaderboard']),
      });
    });

    it('does not write to the account for a surface already seen there', async () => {
      setup();
      get.mockResolvedValue({ value: null });
      accountHolds(['map']);

      await service.markSeen('map');

      expect(updateDocument).not.toHaveBeenCalled();
      expect(logEvent).not.toHaveBeenCalled();
    });

    it('reads the account once per user, not once per coach mark', async () => {
      setup();
      get.mockResolvedValue({ value: null });
      accountHolds(['home-feed']);

      await service.hasSeen('home-feed');
      await service.hasSeen('map');
      await service.hasSeen('leaderboard');

      expect(getDocument).toHaveBeenCalledTimes(1);
    });

    it('answers from what a dismissal wrote, without reading the account again', async () => {
      setup();
      get.mockResolvedValue({ value: null });
      set.mockResolvedValue(undefined);

      await service.markSeen('map');
      get.mockResolvedValue({ value: null });

      await expect(service.hasSeen('map')).resolves.toBe(true);
      expect(getDocument).toHaveBeenCalledTimes(1);
    });

    it('falls back to the device when the account cannot be read, and retries later', async () => {
      setup();
      get.mockResolvedValue({ value: JSON.stringify(['map']) });
      getDocument.mockRejectedValueOnce(new Error('offline'));

      await expect(service.hasSeen('map')).resolves.toBe(true);
      await expect(service.hasSeen('home-feed')).resolves.toBe(false);
      expect(getDocument).toHaveBeenCalledTimes(2);
    });

    it('keeps the device write when the account write fails', async () => {
      setup();
      get.mockResolvedValue({ value: null });
      set.mockResolvedValue(undefined);
      updateDocument.mockRejectedValue(new Error('permission-denied'));

      await expect(service.markSeen('map')).resolves.toBeUndefined();
      expect(set).toHaveBeenCalledWith({
        key: 'coach-marks-seen:user-1',
        value: JSON.stringify(['map']),
      });
    });

    it('does not read the account without an authenticated user', async () => {
      setup(null);

      await service.hasSeen('map');

      expect(getDocument).not.toHaveBeenCalled();
    });
  });
});
