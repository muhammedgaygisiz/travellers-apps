const getUserMock = jest.fn();
const generateEmailVerificationLinkMock = jest.fn();
const getMock = jest.fn();
const setMock = jest.fn();
const docMock = jest.fn(() => ({ get: getMock, set: setMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): any => ({
    getUser: getUserMock,
    generateEmailVerificationLink: generateEmailVerificationLinkMock,
  }),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): any => ({
    collection: collectionMock,
  }),
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn((name: string) => ({
    name,
    value: jest.fn(() => 'secret-value'),
  })),
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
  onCall: jest.fn((_options, handler) => handler),
}));

import { resendEmailVerificationForUser } from '../resend-email-verification';

const passwordUser = {
  uid: 'user-1',
  email: 'one@example.com',
  emailVerified: false,
  providerData: [{ providerId: 'password' }],
} as any;

describe('resendEmailVerificationForUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserMock.mockResolvedValue(passwordUser);
    getMock.mockResolvedValue({ exists: true, data: () => ({}) });
    setMock.mockResolvedValue(undefined);
    generateEmailVerificationLinkMock.mockResolvedValue(
      'https://example.com/verify',
    );
  });

  it('sends a manual verification email and stores manual sent metadata', async () => {
    const sender = jest.fn().mockResolvedValue(undefined);

    await resendEmailVerificationForUser(
      'user-1',
      sender,
      new Date('2026-07-01T08:00:00.000Z'),
    );

    expect(sender).toHaveBeenCalledWith({
      to: 'one@example.com',
      verificationLink: 'https://example.com/verify',
    });
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'one@example.com',
        emailVerificationManualLastSentAt: '2026-07-01T08:00:00.000Z',
      }),
      { merge: true },
    );
  });

  it('rate-limits manual resend for one hour', async () => {
    getMock.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        emailVerificationManualLastSentAtTimestamp: new Date(
          '2026-07-01T07:30:00.000Z',
        ).getTime(),
      }),
    });

    await expect(
      resendEmailVerificationForUser(
        'user-1',
        jest.fn(),
        new Date('2026-07-01T08:00:00.000Z'),
      ),
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  it('rejects trusted provider-linked users', async () => {
    getUserMock.mockResolvedValueOnce({
      ...passwordUser,
      providerData: [{ providerId: 'password' }, { providerId: 'google.com' }],
    });

    await expect(
      resendEmailVerificationForUser('user-1', jest.fn()),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('surfaces a typed internal error when the sender fails', async () => {
    const sender = jest
      .fn()
      .mockRejectedValue(
        new Error('Google Workspace email configuration is missing.'),
      );

    await expect(
      resendEmailVerificationForUser(
        'user-1',
        sender,
        new Date('2026-07-01T08:00:00.000Z'),
      ),
    ).rejects.toMatchObject({ code: 'internal', message: 'send_failed' });

    expect(setMock).not.toHaveBeenCalled();
  });
});
