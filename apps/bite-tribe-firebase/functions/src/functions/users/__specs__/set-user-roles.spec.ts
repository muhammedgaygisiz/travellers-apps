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

const restaurantsGetMock = jest.fn();
const whereMock = jest.fn(() => ({ get: restaurantsGetMock }));
const collectionMock = jest.fn(() => ({ where: whereMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): { collection: jest.Mock } => ({
    collection: collectionMock,
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
      public details?: unknown,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

import { logger } from 'firebase-functions';
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
  restaurantsGetMock.mockResolvedValue({ docs: [] });
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

  /**
   * `tableGuest` is a role and the one nobody hands out (issue #1629): a table
   * scan writes it on the anonymous account it admits. Granted here it would
   * make an account that reads as a guest at no table.
   */
  it('rejects the table guest role, which a scan writes', async () => {
    expect(
      await codeOf(handle(request({ uid: TARGET_UID, roles: ['tableGuest'] }))),
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

describe('setUserRoles mutually exclusive roles', () => {
  // `business` operates a restaurant and `staff` is the narrowed set of what
  // can be done on one. Refusing the pair here is what saves a precedence rule
  // that would otherwise have to be honoured identically in the route guards,
  // the rules of #1078 and the dashboard of #1079.
  it('refuses business and staff on one account', async () => {
    const code = await codeOf(
      handle(request({ uid: TARGET_UID, roles: ['business', 'staff'] })),
    );

    expect(code).toBe('failed-precondition');
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });

  it('refuses the pair whichever order it arrives in', async () => {
    const code = await codeOf(
      handle(request({ uid: TARGET_UID, roles: ['staff', 'business'] })),
    );

    expect(code).toBe('failed-precondition');
  });

  it('refuses the pair even alongside admin', async () => {
    const code = await codeOf(
      handle(
        request({ uid: TARGET_UID, roles: ['admin', 'business', 'staff'] }),
      ),
    );

    expect(code).toBe('failed-precondition');
  });

  // Refused before the target is resolved, so a conflicting payload cannot
  // cost an Auth lookup — and an operator who also mistyped the email is told
  // about the conflict rather than about the address.
  it('refuses it before resolving the target account', async () => {
    await codeOf(
      handle(
        request({ email: 'ghost@test.com', roles: ['business', 'staff'] }),
      ),
    );

    expect(getUserByEmailMock).not.toHaveBeenCalled();
  });

  it('does not log a refused write', async () => {
    await codeOf(
      handle(request({ uid: TARGET_UID, roles: ['business', 'staff'] })),
    );

    expect(logger.info).not.toHaveBeenCalled();
  });

  it.each([
    [['business']],
    [['staff']],
    [['admin', 'staff']],
    [['admin', 'business']],
  ])('accepts the role set %p', async (roles) => {
    await expect(
      handle(request({ uid: TARGET_UID, roles })),
    ).resolves.toMatchObject({ roles });
  });

  // The role has to be grantable before anything gates on it, so a restaurant's
  // staff can be recorded ahead of #1078 and #1079.
  it('accepts staff as a known role', async () => {
    await expect(
      handle(request({ uid: TARGET_UID, roles: ['staff'] })),
    ).resolves.toEqual({ uid: TARGET_UID, roles: ['staff'] });
  });
});

describe('setUserRoles and the restaurants an account owns', () => {
  /** A restaurant document as the query returns it. */
  const restaurantDoc = (id: string, name?: string): unknown => ({
    id,
    get: (field: string): unknown => (field === 'name' ? name : undefined),
  });

  const targetHolding = (roles: string[]): void => {
    getUserMock.mockResolvedValue({
      uid: TARGET_UID,
      customClaims: { roles },
    });
  };

  const messageOf = async (promise: Promise<unknown>): Promise<string> => {
    try {
      await promise;
    } catch (error) {
      return (error as Error).message;
    }

    throw new Error('Expected the handler to reject, but it resolved.');
  };

  it('refuses to drop business while the account owns a restaurant', async () => {
    targetHolding(['business']);
    restaurantsGetMock.mockResolvedValue({
      docs: [restaurantDoc('resto-1', "Sam's")],
    });

    await expect(
      codeOf(handle(request({ uid: TARGET_UID, roles: [] }))),
    ).resolves.toBe('failed-precondition');
    expect(collectionMock).toHaveBeenCalledWith('restaurants');
    expect(whereMock).toHaveBeenCalledWith(
      'ownerUserIds',
      'array-contains',
      TARGET_UID,
    );
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('names every restaurant that blocks the revocation', async () => {
    targetHolding(['business']);
    restaurantsGetMock.mockResolvedValue({
      docs: [restaurantDoc('resto-1', "Sam's"), restaurantDoc('resto-2')],
    });

    const message = await messageOf(
      handle(request({ uid: TARGET_UID, roles: [] })),
    );

    expect(message).toContain("Sam's (resto-1)");
    await expect(
      handle(request({ uid: TARGET_UID, roles: [] })),
    ).rejects.toMatchObject({
      details: {
        reason: 'role-holdings',
        role: 'business',
        holdings: ["Sam's (resto-1)", 'resto-2'],
      },
    });
    expect(message).toContain('resto-2');
    expect(message).toContain('Restaurant ownership');
  });

  it('removes business from an account that owns no restaurant', async () => {
    targetHolding(['business']);

    await expect(
      handle(request({ uid: TARGET_UID, roles: [] })),
    ).resolves.toEqual({ uid: TARGET_UID, roles: [] });
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith(TARGET_UID, {
      roles: [],
    });
  });

  it('reads nothing from Firestore when granting business', async () => {
    targetHolding([]);

    await handle(request({ uid: TARGET_UID, roles: ['business'] }));

    expect(collectionMock).not.toHaveBeenCalled();
  });

  it('reads nothing from Firestore when the write keeps business', async () => {
    targetHolding(['business']);

    await handle(request({ uid: TARGET_UID, roles: ['business', 'admin'] }));

    expect(collectionMock).not.toHaveBeenCalled();
  });

  it('reads nothing from Firestore when dropping a role other than business', async () => {
    targetHolding(['admin', 'business']);

    await handle(request({ uid: TARGET_UID, roles: ['business'] }));

    expect(collectionMock).not.toHaveBeenCalled();
  });

  it('ignores claims that are not a role list', async () => {
    getUserMock.mockResolvedValue({
      uid: TARGET_UID,
      customClaims: { roles: 'business' },
    });

    await handle(request({ uid: TARGET_UID, roles: [] }));

    expect(collectionMock).not.toHaveBeenCalled();
  });

  it('keeps the self-demotion refusal distinct from the ownership one', async () => {
    const selfDemotion = await messageOf(
      handle(request({ uid: ADMIN_UID, roles: [] })),
    );

    targetHolding(['business']);
    restaurantsGetMock.mockResolvedValue({
      docs: [restaurantDoc('resto-1', "Sam's")],
    });
    const ownership = await messageOf(
      handle(request({ uid: TARGET_UID, roles: [] })),
    );

    expect(selfDemotion).toBe('You cannot remove your own admin role.');
    expect(ownership).not.toBe(selfDemotion);
  });
});
