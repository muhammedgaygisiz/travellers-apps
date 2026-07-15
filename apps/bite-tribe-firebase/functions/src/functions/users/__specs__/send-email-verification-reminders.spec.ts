const getUserMock = jest.fn();
const listUsersMock = jest.fn();
const generateEmailVerificationLinkMock = jest.fn();
const getMock = jest.fn();
const setMock = jest.fn();
const docMock = jest.fn(() => ({ get: getMock, set: setMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

jest.mock('firebase-admin', () => ({
  auth: (): any => ({
    getUser: getUserMock,
    listUsers: listUsersMock,
    generateEmailVerificationLink: generateEmailVerificationLinkMock,
  }),
  firestore: (): any => ({
    collection: collectionMock,
  }),
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('firebase-functions/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

import { sendEmailVerificationRemindersForUsers } from '../send-email-verification-reminders';

const authUser = (overrides: {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  providerIds?: string[];
}): any =>
  ({
    uid: overrides.uid,
    email: overrides.email,
    emailVerified: overrides.emailVerified ?? false,
    providerData: (overrides.providerIds ?? ['password']).map((providerId) => ({
      providerId,
    })),
  }) as any;

describe('sendEmailVerificationRemindersForUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({ exists: true, data: () => ({}) });
    setMock.mockResolvedValue(undefined);
    generateEmailVerificationLinkMock.mockResolvedValue(
      'https://example.com/verify',
    );
  });

  it('sends due reminders and increments only after successful delivery', async () => {
    listUsersMock.mockResolvedValueOnce({
      users: [
        authUser({ uid: 'user-1', email: 'one@example.com' }),
        authUser({ uid: 'user-2', email: 'two@example.com' }),
      ],
    });
    const sender = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('send failed'));

    const result = await sendEmailVerificationRemindersForUsers(
      sender,
      new Date('2026-07-01T08:00:00.000Z'),
    );

    expect(sender).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerificationReminderCount: 1,
        emailVerificationLastSentAt: '2026-07-01T08:00:00.000Z',
      }),
      { merge: true },
    );
    expect(setMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerificationReminderCount: 2,
      }),
      { merge: true },
    );
  });

  it('skips trusted provider and max-reminder users', async () => {
    listUsersMock.mockResolvedValueOnce({
      users: [
        authUser({
          uid: 'trusted-user',
          email: 'trusted@example.com',
          providerIds: ['password', 'google.com'],
        }),
        authUser({ uid: 'max-user', email: 'max@example.com' }),
      ],
    });
    // Only the eligible password user (max-user) triggers a Firestore read;
    // the trusted-provider user is skipped before touching Firestore.
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ emailVerificationReminderCount: 3 }),
    });
    const sender = jest.fn();

    const result = await sendEmailVerificationRemindersForUsers(sender);

    expect(sender).not.toHaveBeenCalled();
    expect(result.skippedTrustedProvider).toBe(1);
    expect(result.skippedMaxReminders).toBe(1);
  });
});
