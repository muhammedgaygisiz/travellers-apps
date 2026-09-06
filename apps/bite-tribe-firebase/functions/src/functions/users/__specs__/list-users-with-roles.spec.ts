const listUsersMock = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): { listUsers: jest.Mock } => ({ listUsers: listUsersMock }),
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
