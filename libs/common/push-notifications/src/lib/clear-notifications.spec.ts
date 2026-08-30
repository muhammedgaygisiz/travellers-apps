import { PushNotifications } from '@capacitor/push-notifications';
import type { Platform } from '@ionic/angular';
import { clearNotificationsForSurface } from './clear-notifications';

// Automocking yields undefined members and pulls Angular in through the `utils`
// barrel, so the package is stubbed outright — as in `init-push.spec.ts`.
jest.mock('utils', () => ({
  PATH: {
    BITE: 'bite',
    PROFILE: 'profile',
    MY_PROFILE: 'my-profile',
    LEADERBOARD: 'leaderboard',
    WEEKLY_BITES: 'weekly-bites',
  },
}));
jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    getDeliveredNotifications: jest.fn(),
    removeDeliveredNotifications: jest.fn(),
  },
}));

const platformStub = (isCapacitor: boolean): Platform =>
  ({ is: jest.fn(() => isCapacitor) }) as unknown as Platform;

const delivered = (notifications: { id: string; tag?: string }[]): void => {
  (PushNotifications.getDeliveredNotifications as jest.Mock).mockResolvedValue({
    notifications,
  });
};

describe(clearNotificationsForSurface.name, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation();

    (
      PushNotifications.removeDeliveredNotifications as jest.Mock
    ).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing off a device build', async () => {
    await clearNotificationsForSurface(platformStub(false), 'bite1');

    expect(PushNotifications.getDeliveredNotifications).not.toHaveBeenCalled();
  });

  it('clears every delivered notification about the surface', async () => {
    const like = { id: '1', tag: 'NEW_BITE_LIKE:bite1' };
    const reply = { id: '2', tag: 'NEW_REVIEW_REPLY:bite1:thread1' };

    delivered([like, reply]);

    await clearNotificationsForSurface(platformStub(true), 'bite1');

    expect(PushNotifications.removeDeliveredNotifications).toHaveBeenCalledWith(
      {
        notifications: [like, reply],
      },
    );
  });

  it('leaves the notifications about another surface alone', async () => {
    const mine = { id: '1', tag: 'NEW_BITE_LIKE:bite1' };

    delivered([mine, { id: '2', tag: 'NEW_BITE_LIKE:bite2' }]);

    await clearNotificationsForSurface(platformStub(true), 'bite1');

    expect(PushNotifications.removeDeliveredNotifications).toHaveBeenCalledWith(
      {
        notifications: [mine],
      },
    );
  });

  it('matches on the id where the platform reports no tag', async () => {
    // iOS carries the collapse key as the notification id, which is the
    // `apns-collapse-id` it was sent with.
    const badge = { id: 'NEW_COUNTRY_BADGE:user1:CH' };

    delivered([badge]);

    await clearNotificationsForSurface(platformStub(true), 'user1');

    expect(PushNotifications.removeDeliveredNotifications).toHaveBeenCalledWith(
      {
        notifications: [badge],
      },
    );
  });

  it('leaves a notification carrying no key in the drawer', async () => {
    // It predates this contract, so what it is about cannot be established.
    delivered([{ id: '1234567890' }]);

    await clearNotificationsForSurface(platformStub(true), 'bite1');

    expect(
      PushNotifications.removeDeliveredNotifications,
    ).not.toHaveBeenCalled();
  });

  it('removes nothing when no delivered notification matches', async () => {
    delivered([]);

    await clearNotificationsForSurface(platformStub(true), 'bite1');

    expect(
      PushNotifications.removeDeliveredNotifications,
    ).not.toHaveBeenCalled();
  });

  it('swallows a failure so the navigation behind it still stands', async () => {
    (
      PushNotifications.getDeliveredNotifications as jest.Mock
    ).mockRejectedValue(new Error('no notification access'));

    await expect(
      clearNotificationsForSurface(platformStub(true), 'bite1'),
    ).resolves.toBeUndefined();
  });
});
