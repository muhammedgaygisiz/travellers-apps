import type { FakeFirestore } from '../../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../../users/__specs__/fake-firestore';
import type { LocalizedNotificationRequest } from '../send-localized-notification';

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

type FakeMessaging = { sendEachForMulticast: typeof sendEachForMulticast };

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: (): FakeMessaging => ({ sendEachForMulticast }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/**
 * The send path reaches Firestore through modules that grab their handle at
 * import time, so it is re-imported per test against a freshly seeded store.
 */
const sendLocalizedNotification = (
  request: LocalizedNotificationRequest,
): Promise<number> =>
  (
    require('../send-localized-notification') as typeof import('../send-localized-notification')
  ).sendLocalizedNotification(request);

const aFollowerNotification = (
  uids: string[],
): LocalizedNotificationRequest => ({
  uids,
  data: { type: 'NEW_FOLLOWER' },
  buildMessage: (translate) => ({
    title: translate('newFollower.title'),
    body: translate('newFollower.body', { follower: 'Mo' }),
  }),
});

describe('sendLocalizedNotification', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    db = createFakeFirestore();
  });

  it('sends the copy of the language the recipient chose', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });
    db.seed('settings/user-1', { language: 'de' });

    await expect(
      sendLocalizedNotification(aFollowerNotification(['user-1'])),
    ).resolves.toBe(1);

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['token-a'],
      notification: {
        title: 'Neuer Follower!',
        body: 'Mo folgt dir jetzt.',
      },
      data: { type: 'NEW_FOLLOWER' },
    });
  });

  it('sends one message per language when recipients differ', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });
    db.seed('settings/user-1', { language: 'de' });
    db.seed('users/user-2/pushTokens/token-b', { enabled: true });
    db.seed('settings/user-2', { language: 'en' });

    await expect(
      sendLocalizedNotification(aFollowerNotification(['user-1', 'user-2'])),
    ).resolves.toBe(2);

    expect(sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(
      sendEachForMulticast.mock.calls.map(([request]) => [
        request.tokens,
        request.notification.body,
      ]),
    ).toEqual([
      [['token-a'], 'Mo folgt dir jetzt.'],
      [['token-b'], 'Mo is now following you.'],
    ]);
  });

  it('sends English to an account that never saved a language', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: true });

    await sendLocalizedNotification(aFollowerNotification(['user-1']));

    expect(sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: {
          title: 'New Follower!',
          body: 'Mo is now following you.',
        },
      }),
    );
  });

  it('sends nothing when no recipient has an enabled installation', async () => {
    db.seed('users/user-1/pushTokens/token-a', { enabled: false });
    db.seed('settings/user-1', { language: 'de' });

    await expect(
      sendLocalizedNotification(aFollowerNotification(['user-1'])),
    ).resolves.toBe(0);

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });
});
