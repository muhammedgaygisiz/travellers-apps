const getUserMock = jest.fn();
const getUserByEmailMock = jest.fn();
const setCustomUserClaimsMock = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): {
    getUser: jest.Mock;
    getUserByEmail: jest.Mock;
    setCustomUserClaims: jest.Mock;
  } => ({
    getUser: getUserMock,
    getUserByEmail: getUserByEmailMock,
    setCustomUserClaims: setCustomUserClaimsMock,
  }),
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

import { setUserRolesHandler } from '../set-user-roles';

const ADMIN_UID = 'admin-uid';
const TARGET_UID = 'target-uid';

/**
 * The parts of `CallableRequest` the handler reads. Building the real thing
 * would mean constructing an App Check token and a raw request the handler
 * never touches, so the spec passes the shape it does read and casts once.
 */
interface TestRequest {
  auth?: { uid: string; token: { roles?: unknown } };
  data: unknown;
}

type Handler = typeof setUserRolesHandler;

const handle = (request: TestRequest): ReturnType<Handler> =>
  setUserRolesHandler(request as Parameters<Handler>[0]);

/** A caller the verified ID token says holds `roles`. */
const callerWith = (roles: unknown, uid = ADMIN_UID): TestRequest => ({
  auth: { uid, token: { roles } },
  data: {},
});

const request = (
  data: unknown,
  caller = callerWith(['admin']),
): TestRequest => ({
  ...caller,
  data,
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
  getUserMock.mockResolvedValue({ uid: TARGET_UID, customClaims: undefined });
  getUserByEmailMock.mockResolvedValue({ uid: TARGET_UID });
  setCustomUserClaimsMock.mockResolvedValue(undefined);
});

describe('setUserRoles authorization', () => {
  it('rejects an unauthenticated caller', async () => {
    const code = await codeOf(
      handle({ data: { uid: TARGET_UID, roles: ['business'] } }),
    );

    expect(code).toBe('unauthenticated');
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });

  it('rejects a signed-in caller holding no roles', async () => {
    const code = await codeOf(
      handle(
        request(
          { uid: TARGET_UID, roles: ['business'] },
          callerWith(undefined),
        ),
      ),
    );

    expect(code).toBe('permission-denied');
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });

  // The account this gate exists to keep out: a restaurant that found the
  // callable and would otherwise grant itself the admin role.
  it('rejects a caller holding only the business role', async () => {
    const code = await codeOf(
      handle(
        request(
          { uid: TARGET_UID, roles: ['admin'] },
          callerWith(['business']),
        ),
      ),
    );

    expect(code).toBe('permission-denied');
  });

  it('rejects a caller whose token claims a role that does not exist', async () => {
    const code = await codeOf(
      handle(
        request(
          { uid: TARGET_UID, roles: ['business'] },
          callerWith(['superuser']),
        ),
      ),
    );

    expect(code).toBe('permission-denied');
  });

  it('accepts a caller holding the admin role', async () => {
    const result = await handle(
      request({ uid: TARGET_UID, roles: ['business'] }),
    );

    expect(result).toEqual({ uid: TARGET_UID, roles: ['business'] });
  });
});

describe('setUserRoles input', () => {
  it('rejects roles that are not an array', async () => {
    expect(
      await codeOf(handle(request({ uid: TARGET_UID, roles: 'admin' }))),
    ).toBe('invalid-argument');
  });

  it('rejects an unknown role', async () => {
    expect(
      await codeOf(handle(request({ uid: TARGET_UID, roles: ['owner'] }))),
    ).toBe('invalid-argument');
  });

  it('rejects a request naming neither a uid nor an email', async () => {
    expect(await codeOf(handle(request({ roles: ['business'] })))).toBe(
      'invalid-argument',
    );
  });

  it('resolves the target by email when no uid is given', async () => {
    await handle(
      request({ email: ' owner@example.com ', roles: ['business'] }),
    );

    expect(getUserByEmailMock).toHaveBeenCalledWith('owner@example.com');
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith(TARGET_UID, {
      roles: ['business'],
    });
  });

  it('reports an email with no account as not-found', async () => {
    getUserByEmailMock.mockRejectedValue(new Error('no such user'));

    expect(
      await codeOf(handle(request({ email: 'nobody@example.com', roles: [] }))),
    ).toBe('not-found');
  });
});

describe('setUserRoles writes', () => {
  it('preserves custom claims it does not own', async () => {
    getUserMock.mockResolvedValue({
      uid: TARGET_UID,
      customClaims: { roles: ['business'], somethingElse: 'keep me' },
    });

    await handle(request({ uid: TARGET_UID, roles: ['business', 'admin'] }));

    expect(setCustomUserClaimsMock).toHaveBeenCalledWith(TARGET_UID, {
      roles: ['business', 'admin'],
      somethingElse: 'keep me',
    });
  });

  it('replaces the role set rather than adding to it, so an empty list revokes', async () => {
    getUserMock.mockResolvedValue({
      uid: TARGET_UID,
      customClaims: { roles: ['business'] },
    });

    const result = await handle(request({ uid: TARGET_UID, roles: [] }));

    expect(result.roles).toEqual([]);
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith(TARGET_UID, {
      roles: [],
    });
  });

  it('deduplicates a repeated role', async () => {
    const result = await handle(
      request({ uid: TARGET_UID, roles: ['business', 'business'] }),
    );

    expect(result.roles).toEqual(['business']);
  });

  // Losing the last admin role would leave the admin app unreachable and the
  // bootstrap script the only way back.
  it('refuses to let an admin drop their own admin role', async () => {
    expect(
      await codeOf(handle(request({ uid: ADMIN_UID, roles: ['business'] }))),
    ).toBe('failed-precondition');
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });

  it('lets an admin change their own non-admin roles', async () => {
    getUserMock.mockResolvedValue({ uid: ADMIN_UID, customClaims: {} });

    const result = await handle(
      request({ uid: ADMIN_UID, roles: ['admin', 'business'] }),
    );

    expect(result.roles).toEqual(['admin', 'business']);
  });
});
