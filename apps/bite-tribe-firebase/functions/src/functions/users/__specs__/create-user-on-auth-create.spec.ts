import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore } from './fake-firestore';

let db: FakeFirestore;

/**
 * The handler `beforeUserCreated` was given, captured at import time.
 *
 * The real decorator registers a Cloud Function, which a unit spec has nothing
 * to do with; what it needs is the function body. So the mock hands the handler
 * straight back, and the spec calls it with an event of its own making.
 */
let handler: (event: unknown) => Promise<void>;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-functions/v2/identity', () => ({
  beforeUserCreated: (
    given: (event: unknown) => Promise<void>,
  ): ((event: unknown) => Promise<void>) => {
    handler = given;

    return given;
  },
}));

/**
 * Who gets a `/users` profile when they sign up (GitHub issue #1101).
 *
 * This spec exists because of a defect rather than in anticipation of one. The
 * first cut of the anonymous-guest guard read `event.data.providerData` and
 * skipped an account with none - which looks exactly right and is exactly
 * wrong, because the event fires *before* the account exists and that array is
 * empty for every provider. The result was that no sign-up of any kind wrote a
 * profile, and nothing in this project noticed: the failure surfaced two suites
 * away, in the consumer end-to-end run, as an account-deletion test that could
 * not find the account it had just made.
 *
 * The last case below is the one that would have caught it.
 */

 
require('../create-user-on-auth-create');

interface EventOptions {
  uid?: string;
  email?: string;
  providerId?: string;
  eventType?: string;
  providerData?: unknown[];
}

const signUp = ({
  uid = 'new-uid',
  email = 'member@test.com',
  providerId = 'password',
  eventType = 'providers/cloud.auth/eventTypes/user.beforeCreate:password',
  providerData = [],
}: EventOptions = {}): unknown => ({
  eventType,
  additionalUserInfo: { providerId, isNewUser: true },
  data: {
    uid,
    email,
    displayName: '',
    photoURL: '',
    emailVerified: false,
    providerData,
  },
});

describe('createUserOnAuthCreate', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  const profileOf = (uid = 'new-uid'): Record<string, unknown> | undefined =>
    db.read(`users/${uid}`);

  it('writes a profile for an email and password sign-up', async () => {
    await handler(signUp());

    expect(profileOf()).toMatchObject({
      userId: 'new-uid',
      email: 'member@test.com',
      countryCodes: [],
      public: false,
      subscriptionTier: 0,
    });
  });

  /**
   * A guest who scanned a table code. Belt and braces: anonymous sign-in does
   * not deliver this event at all today, verified against the Auth emulator, so
   * the guarantee holds without the check - and keeps holding if that changes.
   */
  it('writes nothing for an anonymous sign-up', async () => {
    await handler(
      signUp({
        providerId: 'anonymous',
        email: '',
        eventType:
          'providers/cloud.auth/eventTypes/user.beforeCreate:anonymous',
      }),
    );

    expect(profileOf()).toBeUndefined();
  });

  it('reads the event type when the provider is not named', async () => {
    await handler(
      signUp({
        providerId: undefined,
        email: '',
        eventType:
          'providers/cloud.auth/eventTypes/user.beforeCreate:anonymous',
      }),
    );

    expect(profileOf()).toBeUndefined();
  });

  /**
   * **The regression this spec was written for.**
   *
   * `providerData` is empty on every sign-up, because the account does not
   * exist yet. Skipping on it denied a profile to every member who ever
   * registered, which is a silent and total break of registration - the account
   * works, and nothing in the product knows who they are.
   */
  it('still writes a profile when providerData is empty, as it always is', async () => {
    await handler(signUp({ providerData: [] }));

    expect(profileOf()).toBeDefined();
  });

  /**
   * The guard identifies anonymity **positively**, so anything it cannot read
   * gets a profile. The failure left is a guest handed a profile they did not
   * ask for; the failure removed is a member denied one they did.
   */
  it('writes a profile when the event says nothing about the provider', async () => {
    await handler({ data: { uid: 'new-uid', providerData: [] } });

    expect(profileOf()).toBeDefined();
  });

  it('writes nothing when the event carries no account at all', async () => {
    await handler({ data: undefined });

    expect(db.exists('users/new-uid')).toBe(false);
  });
});
