import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';
import type {
  SendNewVersionNotificationRequest,
  SendNewVersionNotificationResult,
} from '../send-new-version-notification';

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

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

interface CallableRequestLike {
  auth?: { uid: string };
  data?: SendNewVersionNotificationRequest;
}

/**
 * The send path reaches Firestore through modules that grab their handle at
 * import time, so the function is re-imported per test against a freshly seeded
 * store.
 */
const sendNewVersionNotification = (
  request: CallableRequestLike,
): Promise<SendNewVersionNotificationResult> => {
  const handler = (
    require('../send-new-version-notification') as typeof import('../send-new-version-notification')
  ).sendNewVersionNotification as unknown as (
    request: CallableRequestLike,
  ) => Promise<SendNewVersionNotificationResult>;

  return handler(request);
};

const anOperator = { uid: 'operator-1' };

const seedInstallation = (
  uid: string,
  token: string,
  platform: string,
  language?: string,
): void => {
  db.seed(`users/${uid}`, {});
  db.seed(`users/${uid}/pushTokens/${token}`, { enabled: true, platform });

  if (language) {
    db.seed(`settings/${uid}`, { language });
  }
};

describe('sendNewVersionNotification', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    db = createFakeFirestore();
  });

  it('announces the release to the installations of the requested store', async () => {
    seedInstallation('user-1', 'token-ios', 'ios');

    await expect(
      sendNewVersionNotification({
        auth: anOperator,
        data: { platform: 'ios' },
      }),
    ).resolves.toEqual({ platform: 'ios', tokenCount: 1, userCount: 1 });

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['token-ios'],
      notification: {
        title: '🚀 New version available',
        body: 'A new BiteTribe version is ready in the App Store. Update now to get the latest.',
      },
      data: { type: 'NEW_VERSION_AVAILABLE', platform: 'ios' },
    });
  });

  it('names the store the recipient can actually update from', async () => {
    seedInstallation('user-1', 'token-android', 'android');

    await sendNewVersionNotification({
      auth: anOperator,
      data: { platform: 'android' },
    });

    expect(sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: {
          title: '🚀 New version available',
          body: 'A new BiteTribe version is ready on Google Play. Update now to get the latest.',
        },
      }),
    );
  });

  it('leaves the other store untouched', async () => {
    // The stores clear their review at different times, which is the whole
    // reason the announcement is split in two (issue #1194).
    seedInstallation('user-1', 'token-ios', 'ios');
    seedInstallation('user-2', 'token-android', 'android');

    await expect(
      sendNewVersionNotification({
        auth: anOperator,
        data: { platform: 'ios' },
      }),
    ).resolves.toEqual({ platform: 'ios', tokenCount: 1, userCount: 2 });

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({ tokens: ['token-ios'] }),
    );
  });

  it('announces in the language each recipient chose', async () => {
    seedInstallation('user-1', 'token-a', 'ios', 'de');
    seedInstallation('user-2', 'token-b', 'ios', 'en');

    await expect(
      sendNewVersionNotification({
        auth: anOperator,
        data: { platform: 'ios' },
      }),
    ).resolves.toEqual({ platform: 'ios', tokenCount: 2, userCount: 2 });

    expect(
      sendEachForMulticast.mock.calls.map(
        ([request]) => request.notification.title,
      ),
    ).toEqual(['🚀 Neue Version verfügbar', '🚀 New version available']);
  });

  it('reports a reach of zero when nobody is on that store', async () => {
    seedInstallation('user-1', 'token-android', 'android');

    await expect(
      sendNewVersionNotification({
        auth: anOperator,
        data: { platform: 'ios' },
      }),
    ).resolves.toEqual({ platform: 'ios', tokenCount: 0, userCount: 1 });

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('reports a reach of zero when there are no users at all', async () => {
    await expect(
      sendNewVersionNotification({
        auth: anOperator,
        data: { platform: 'ios' },
      }),
    ).resolves.toEqual({ platform: 'ios', tokenCount: 0, userCount: 0 });

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated caller', async () => {
    seedInstallation('user-1', 'token-ios', 'ios');

    await expect(
      sendNewVersionNotification({ data: { platform: 'ios' } }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('rejects a platform the announcement cannot address', async () => {
    seedInstallation('user-1', 'token-web', 'web');

    await expect(
      sendNewVersionNotification({
        auth: anOperator,
        data: { platform: 'web' },
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('rejects a request without a platform', async () => {
    await expect(
      sendNewVersionNotification({ auth: anOperator, data: {} }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });
});
