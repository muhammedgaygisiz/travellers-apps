import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

interface MulticastRequest {
  tokens: string[];
  notification: { title: string; body: string };
  data: Record<string, string>;
}

const sendEachForMulticast = jest.fn(async ({ tokens }: MulticastRequest) => ({
  successCount: tokens.length,
  failureCount: 0,
  responses: tokens.map(() => ({ success: true })),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: (): { sendEachForMulticast: typeof sendEachForMulticast } => ({
    sendEachForMulticast,
  }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/**
 * The send path reaches Firestore through modules that grab their handle at
 * import time, so the trigger is re-imported per test against a freshly seeded
 * store.
 */
const notifyOnNewCountryBadge = (
  userId: string,
  countryCode: string,
): Promise<void> =>
  (
    require('../notify-on-new-country-badge') as typeof import('../notify-on-new-country-badge')
  ).notifyOnNewCountryBadge(userId, countryCode);

const seedUser = (
  uid: string,
  user: { displayName?: string; public?: boolean } = {},
): void => {
  db.seed(`users/${uid}`, { userId: uid, public: true, ...user });
};

const seedInstallation = (
  uid: string,
  token: string,
  language?: string,
): void => {
  db.seed(`users/${uid}/pushTokens/${token}`, { enabled: true });

  if (language) {
    db.seed(`settings/${uid}`, { language });
  }
};

const seedFollower = (followedUid: string, followerUid: string): void => {
  db.seed(`users/${followedUid}/followers/${followerUid}`, {
    followerUid,
    followedUid,
  });
};

/** The sends that went out, in the order the trigger dispatched them. */
const sentNotifications = (): MulticastRequest[] =>
  sendEachForMulticast.mock.calls.map(([request]) => request);

describe('notifyOnNewCountryBadge', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    db = createFakeFirestore();
  });

  it('congratulates the user who earned the badge', async () => {
    seedUser('user-1', { displayName: 'Mo' });
    seedInstallation('user-1', 'token-1');

    await notifyOnNewCountryBadge('user-1', 'IT');

    expect(sentNotifications()).toEqual([
      {
        tokens: ['token-1'],
        notification: {
          title: '🎉 New country badge!',
          body: 'Congrats! You just unlocked the badge for 🇮🇹 Italy',
        },
        data: {
          type: 'NEW_COUNTRY_BADGE',
          userId: 'user-1',
          countryCode: 'IT',
        },
        android: { notification: { tag: 'NEW_COUNTRY_BADGE:user-1:IT' } },
        apns: {
          headers: { 'apns-collapse-id': 'NEW_COUNTRY_BADGE:user-1:IT' },
          payload: { aps: { threadId: 'user-1' } },
        },
      },
    ]);
  });

  it('announces the achievement to the followers of a public profile', async () => {
    seedUser('user-1', { displayName: 'Mo' });
    seedInstallation('user-1', 'token-1');
    seedUser('follower-1');
    seedInstallation('follower-1', 'token-2');
    seedFollower('user-1', 'follower-1');

    await notifyOnNewCountryBadge('user-1', 'IT');

    expect(sentNotifications()[1]).toEqual({
      tokens: ['token-2'],
      notification: {
        title: '🌍 New country badge',
        body: 'Mo just unlocked the badge for 🇮🇹 Italy',
      },
      data: { type: 'NEW_COUNTRY_BADGE', userId: 'user-1', countryCode: 'IT' },
      android: { notification: { tag: 'NEW_COUNTRY_BADGE:user-1:IT' } },
      apns: {
        headers: { 'apns-collapse-id': 'NEW_COUNTRY_BADGE:user-1:IT' },
        payload: { aps: { threadId: 'user-1' } },
      },
    });
  });

  it('names the country in the language each recipient chose', async () => {
    // The OS renders the copy before the app runs, so both the sentence and the
    // country behind the badge are worded here (issues #1200 and #1212).
    seedUser('user-1', { displayName: 'Mo' });
    seedInstallation('user-1', 'token-1', 'de');
    seedUser('follower-1');
    seedInstallation('follower-1', 'token-2', 'fr');
    seedFollower('user-1', 'follower-1');

    await notifyOnNewCountryBadge('user-1', 'IT');

    expect(sentNotifications().map(({ notification }) => notification)).toEqual(
      [
        {
          title: '🎉 Neues Länder-Badge!',
          body: 'Glückwunsch! Du hast das Badge für 🇮🇹 Italien freigeschaltet',
        },
        {
          title: '🌍 Nouveau badge pays',
          body: 'Mo vient de débloquer le badge pour 🇮🇹 Italie',
        },
      ],
    );
  });

  it('keeps a private profile out of its followers feeds', async () => {
    seedUser('user-1', { displayName: 'Mo', public: false });
    seedInstallation('user-1', 'token-1');
    seedUser('follower-1');
    seedInstallation('follower-1', 'token-2');
    seedFollower('user-1', 'follower-1');

    await notifyOnNewCountryBadge('user-1', 'IT');

    expect(sentNotifications()).toEqual([
      expect.objectContaining({ tokens: ['token-1'] }),
    ]);
  });

  it('congratulates a public profile that has no followers yet', async () => {
    seedUser('user-1', { displayName: 'Mo' });
    seedInstallation('user-1', 'token-1');

    await notifyOnNewCountryBadge('user-1', 'IT');

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic name for a user without a display name', async () => {
    seedUser('user-1', { displayName: undefined });
    seedUser('follower-1');
    seedInstallation('follower-1', 'token-2');
    seedFollower('user-1', 'follower-1');

    await notifyOnNewCountryBadge('user-1', 'IT');

    expect(sentNotifications()[0].notification.body).toBe(
      'Someone just unlocked the badge for 🇮🇹 Italy',
    );
  });

  it('sends nothing when the user does not exist', async () => {
    await notifyOnNewCountryBadge('ghost', 'IT');

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('still names a country ICU cannot resolve', async () => {
    // An unusual territory must degrade to its code rather than break the send.
    seedUser('user-1', { displayName: 'Mo', public: false });
    seedInstallation('user-1', 'token-1');

    await notifyOnNewCountryBadge('user-1', 'XX');

    expect(sentNotifications()[0].notification.body).toBe(
      'Congrats! You just unlocked the badge for 🇽🇽 XX',
    );
  });
});
