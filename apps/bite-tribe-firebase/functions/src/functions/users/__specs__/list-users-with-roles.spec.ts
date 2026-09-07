const listUsersMock = jest.fn();
const getFirestoreMock = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): { listUsers: jest.Mock } => ({ listUsers: listUsersMock }),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): unknown => getFirestoreMock(),
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

import { listUsersWithRolesHandler } from '../list-users-with-roles';
import { createFakeFirestore, FakeFirestore } from './fake-firestore';

let firestore: FakeFirestore;

interface TestRequest {
  auth?: { uid: string; token: { roles?: unknown } };
  data?: unknown;
}

type Handler = typeof listUsersWithRolesHandler;

const handle = (request: TestRequest): ReturnType<Handler> =>
  listUsersWithRolesHandler(request as Parameters<Handler>[0]);

const asAdmin = (data: unknown = {}): TestRequest => ({
  auth: { uid: 'admin-uid', token: { roles: ['admin'] } },
  data,
});

const userRecord = (over: Record<string, unknown> = {}): unknown => ({
  uid: 'u1',
  email: 'a@b.c',
  displayName: 'Ada',
  customClaims: { roles: ['business'] },
  disabled: false,
  emailVerified: true,
  providerData: [{ providerId: 'password' }],
  metadata: { creationTime: 'then', lastSignInTime: 'now' },
  ...over,
});

const codeOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected the handler to reject, but it resolved.');
};

beforeEach(() => {
  jest.clearAllMocks();
  firestore = createFakeFirestore();
  getFirestoreMock.mockImplementation(() => firestore);
  firestore.seed('users/u1', { userId: 'u1', subscriptionTier: 0 });
  listUsersMock.mockResolvedValue({ users: [userRecord()] });
});

describe('listUsersWithRoles authorization', () => {
  it('rejects an unauthenticated caller', async () => {
    expect(await codeOf(handle({ data: {} }))).toBe('unauthenticated');
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it('rejects a signed-in caller holding no roles', async () => {
    const request: TestRequest = { auth: { uid: 'x', token: {} }, data: {} };

    expect(await codeOf(handle(request))).toBe('permission-denied');
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  // Listing every account with its access level is the inventory an attacker
  // would want first, so a business account must not get it either.
  it('rejects a caller holding only the business role', async () => {
    const request: TestRequest = {
      auth: { uid: 'x', token: { roles: ['business'] } },
      data: {},
    };

    expect(await codeOf(handle(request))).toBe('permission-denied');
    expect(listUsersMock).not.toHaveBeenCalled();
  });

  it('allows an admin', async () => {
    const result = await handle(asAdmin());

    expect(result.users).toHaveLength(1);
  });
});

describe('listUsersWithRoles mapping', () => {
  it('reports the roles an account holds', async () => {
    const { users } = await handle(asAdmin());

    expect(users[0]).toMatchObject({
      uid: 'u1',
      email: 'a@b.c',
      displayName: 'Ada',
      roles: ['business'],
      providerIds: ['password'],
    });
  });

  it.each([
    ['no custom claims at all', undefined],
    ['claims without a roles key', {}],
    ['a roles value that is not an array', { roles: 'admin' }],
  ])('reports no roles for an account with %s', async (_case, customClaims) => {
    listUsersMock.mockResolvedValue({ users: [userRecord({ customClaims })] });

    const { users } = await handle(asAdmin());

    expect(users[0].roles).toEqual([]);
  });

  it('drops values that are not known roles', async () => {
    listUsersMock.mockResolvedValue({
      users: [userRecord({ customClaims: { roles: ['admin', 'root', 7] } })],
    });

    const { users } = await handle(asAdmin());

    expect(users[0].roles).toEqual(['admin']);
  });

  // A federated account can carry no email and no display name.
  it('reports absent identity fields as empty strings, not undefined', async () => {
    listUsersMock.mockResolvedValue({
      users: [
        userRecord({
          email: undefined,
          displayName: undefined,
          metadata: {},
        }),
      ],
    });

    const { users } = await handle(asAdmin());

    expect(users[0]).toMatchObject({
      email: '',
      displayName: '',
      createdAt: '',
      lastSignInAt: '',
    });
  });
});

// The tier is the one field here that does not come from Firebase Auth: it is
// a `/users` document field, so listing accounts and showing their tier read
// two different sources (issue #1485).
describe('listUsersWithRoles subscription tier', () => {
  it('joins the tier from the user document', async () => {
    firestore.seed('users/u1', { userId: 'u1', subscriptionTier: 1 });

    const { users } = await handle(asAdmin());

    expect(users[0].subscriptionTier).toBe(1);
  });

  // A federated account that never completed profile creation is exactly this
  // case, and showing it as Free would present an absence as a decision.
  it('reports an account with no user document as having no tier', async () => {
    listUsersMock.mockResolvedValue({ users: [userRecord({ uid: 'ghost' })] });

    const { users } = await handle(asAdmin());

    expect(users[0].subscriptionTier).toBeNull();
  });

  it('reports a document with no tier field as having no tier', async () => {
    firestore.seed('users/u1', { userId: 'u1' });

    expect((await handle(asAdmin())).users[0].subscriptionTier).toBeNull();
  });

  it('reports a stored tier that is not a tier as having no tier', async () => {
    firestore.seed('users/u1', { subscriptionTier: 7 });

    expect((await handle(asAdmin())).users[0].subscriptionTier).toBeNull();
  });

  it('keeps the tier with the account it belongs to', async () => {
    listUsersMock.mockResolvedValue({
      users: [userRecord({ uid: 'u1' }), userRecord({ uid: 'u2' })],
    });
    firestore.seed('users/u1', { subscriptionTier: 0 });
    firestore.seed('users/u2', { subscriptionTier: 1 });

    const { users } = await handle(asAdmin());

    expect(users.map((user) => [user.uid, user.subscriptionTier])).toEqual([
      ['u1', 0],
      ['u2', 1],
    ]);
  });

  // `getAll` rejects an empty argument list, so an empty page must not reach it.
  it('survives a page with no accounts', async () => {
    listUsersMock.mockResolvedValue({ users: [] });

    await expect(handle(asAdmin())).resolves.toEqual({ users: [] });
  });
});

describe('listUsersWithRoles paging', () => {
  it('defaults to a bounded page size', async () => {
    await handle(asAdmin());

    expect(listUsersMock).toHaveBeenCalledWith(200, undefined);
  });

  it('caps an oversized limit rather than passing it through', async () => {
    await handle(asAdmin({ limit: 100_000 }));

    expect(listUsersMock).toHaveBeenCalledWith(1000, undefined);
  });

  it.each([[0], [-1], [1.5], ['20']])('rejects the limit %p', async (limit) => {
    expect(await codeOf(handle(asAdmin({ limit })))).toBe('invalid-argument');
  });

  it('passes a page token through', async () => {
    await handle(asAdmin({ pageToken: 'next-page' }));

    expect(listUsersMock).toHaveBeenCalledWith(200, 'next-page');
  });

  // Returning the token rather than looping keeps one call bounded.
  it('returns the next page token when there is another page', async () => {
    listUsersMock.mockResolvedValue({
      users: [userRecord()],
      pageToken: 'more',
    });

    expect((await handle(asAdmin())).nextPageToken).toBe('more');
  });

  it('omits the token on the last page', async () => {
    expect((await handle(asAdmin())).nextPageToken).toBeUndefined();
  });
});

// The display name is the second field that does not come from Firebase Auth.
// BiteTribe writes it only to `/users` and `/displayNames`, never back to the
// Auth record, so an operator filtering this list by the name they were given
// depends entirely on this join (issue #1476).
describe('listUsersWithRoles display name', () => {
  it('joins the display name from the user document', async () => {
    firestore.seed('users/u1', { userId: 'u1', displayName: 'ada-lovelace' });

    const { users } = await handle(asAdmin());

    expect(users[0].displayName).toBe('ada-lovelace');
  });

  // Firebase copies the provider's name into the Auth record at creation, and
  // the account may have chosen a different BiteTribe name since. The stored
  // one is what it is called everywhere in the product.
  it('prefers the stored name over the one Firebase Auth holds', async () => {
    firestore.seed('users/u1', { displayName: 'chosen-name' });
    listUsersMock.mockResolvedValue({
      users: [userRecord({ displayName: 'Provider Name' })],
    });

    expect((await handle(asAdmin())).users[0].displayName).toBe('chosen-name');
  });

  // An account that never completed profile creation has no document to read,
  // and dropping to the Auth name keeps it findable rather than nameless.
  it('falls back to the Auth name for an account with no user document', async () => {
    listUsersMock.mockResolvedValue({
      users: [userRecord({ uid: 'ghost', displayName: 'Provider Name' })],
    });

    expect((await handle(asAdmin())).users[0].displayName).toBe(
      'Provider Name',
    );
  });

  it.each([[undefined], [42], [null]])(
    'falls back to the Auth name for a stored displayName of %p',
    async (displayName) => {
      firestore.seed('users/u1', { displayName });

      expect((await handle(asAdmin())).users[0].displayName).toBe('Ada');
    },
  );

  it('keeps the name with the account it belongs to', async () => {
    listUsersMock.mockResolvedValue({
      users: [userRecord({ uid: 'u1' }), userRecord({ uid: 'u2' })],
    });
    firestore.seed('users/u1', { displayName: 'first' });
    firestore.seed('users/u2', { displayName: 'second' });

    const { users } = await handle(asAdmin());

    expect(users.map((user) => [user.uid, user.displayName])).toEqual([
      ['u1', 'first'],
      ['u2', 'second'],
    ]);
  });
});
