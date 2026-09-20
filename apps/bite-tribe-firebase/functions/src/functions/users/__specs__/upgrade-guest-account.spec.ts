import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore } from './fake-firestore';

let db: FakeFirestore;

const getUserMock = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): unknown => ({ getUser: getUserMock }),
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

import { upgradeGuestAccountHandler } from '../upgrade-guest-account';

const GUEST_UID = 'guest-uid';

/**
 * The profile a guest who registers at a table gets (GitHub issue #1657).
 *
 * The account is *linked* rather than created, so `createUserOnAuthCreate` -
 * a `beforeUserCreated` trigger - never runs for it. Without this callable the
 * guest is a member everywhere except in `/users`, which is the collection
 * every count, every search and every follower list reads.
 */
interface TestRequest {
  auth?: { uid: string; token: Record<string, unknown> };
  data: void;
}

type Handler = typeof upgradeGuestAccountHandler;

const handle = (request: TestRequest): ReturnType<Handler> =>
  upgradeGuestAccountHandler(request as Parameters<Handler>[0]);

/** A caller whose token still says `anonymous`, which is the normal case. */
const guest = (): TestRequest => ({
  auth: {
    uid: GUEST_UID,
    token: { firebase: { sign_in_provider: 'anonymous' } },
  },
  data: undefined,
});

const authRecord = (
  providerData: Array<{ providerId: string; photoURL?: string }>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  uid: GUEST_UID,
  email: 'guest@test.com',
  displayName: '',
  photoURL: '',
  emailVerified: false,
  providerData,
  ...extra,
});

const codeOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected the handler to reject, but it resolved.');
};

const profile = (): Record<string, unknown> | undefined =>
  db.read(`users/${GUEST_UID}`);

describe('upgradeGuestAccount', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    getUserMock.mockReset();
  });

  it('rejects a caller with no session', async () => {
    expect(await codeOf(handle({ data: undefined }))).toBe('unauthenticated');
  });

  /**
   * A scan with no registration behind it. Writing a profile here would put a
   * member with no name and no email into `/users` once per scan, including
   * the scans that are somebody's script.
   */
  it('refuses an account with no provider linked to it', async () => {
    getUserMock.mockResolvedValue(authRecord([]));

    expect(await codeOf(handle(guest()))).toBe('failed-precondition');
    expect(profile()).toBeUndefined();
  });

  /**
   * The caller's token is not the signal. It still says `anonymous` until it
   * refreshes (`RD-TS-40`), so reading the kind of session off the request
   * would refuse exactly the caller this exists for.
   */
  it('writes the profile for a linked account despite an anonymous token', async () => {
    getUserMock.mockResolvedValue(
      authRecord([{ providerId: 'password' }], { displayName: 'Mo' }),
    );

    await expect(handle(guest())).resolves.toEqual({ created: true });
    expect(profile()).toMatchObject({
      userId: GUEST_UID,
      displayName: 'Mo',
      fullName: 'Mo',
      email: 'guest@test.com',
      countryCodes: [],
      public: false,
      subscriptionTier: 0,
      emailVerificationRequired: true,
    });
  });

  it('takes the photo a provider carries when the account has none', async () => {
    getUserMock.mockResolvedValue(
      authRecord([
        { providerId: 'google.com', photoURL: 'https://photos/guest.jpg' },
      ]),
    );

    await handle(guest());

    expect(profile()).toMatchObject({
      photoUrl: 'https://photos/guest.jpg',
      // Google and Apple are trusted providers: the address is theirs to
      // verify, so the guest is not asked to verify it again.
      emailVerificationRequired: false,
    });
  });

  /**
   * A retry, or a second link on one account. Not an upsert: a guest who
   * registered and then set a display name must not have it written back to
   * the empty string by a call that arrives late.
   */
  it('leaves an existing profile untouched and says it wrote nothing', async () => {
    getUserMock.mockResolvedValue(authRecord([{ providerId: 'password' }]));
    await db.collection('users').doc(GUEST_UID).set({
      userId: GUEST_UID,
      displayName: 'Chosen Later',
      biteCount: 3,
    });

    await expect(handle(guest())).resolves.toEqual({ created: false });
    expect(profile()).toMatchObject({
      displayName: 'Chosen Later',
      biteCount: 3,
    });
  });
});
