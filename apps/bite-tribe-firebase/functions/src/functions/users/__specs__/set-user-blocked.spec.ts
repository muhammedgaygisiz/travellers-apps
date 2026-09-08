const getUserMock = jest.fn();
const updateUserMock = jest.fn();
const revokeRefreshTokensMock = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): unknown => ({
    getUser: getUserMock,
    updateUser: updateUserMock,
    revokeRefreshTokens: revokeRefreshTokensMock,
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

import { logger } from 'firebase-functions';
import { setUserBlockedHandler } from '../set-user-blocked';

const ADMIN_UID = 'admin-uid';
const TARGET_UID = 'target-uid';

/**
 * The parts of `CallableRequest` the handler reads. Building the real thing
 * would mean constructing an App Check token and a raw request the handler
 * never touches.
 */
interface TestRequest {
  auth?: { uid: string; token: { roles?: unknown } };
  data: unknown;
}

type Handler = typeof setUserBlockedHandler;

const handle = (request: TestRequest): ReturnType<Handler> =>
  setUserBlockedHandler(request as Parameters<Handler>[0]);

const callerWith = (roles: unknown, uid = ADMIN_UID): TestRequest => ({
  auth: { uid, token: { roles } },
  data: {},
});

const request = (
  data: unknown,
  caller = callerWith(['admin']),
): TestRequest => ({ ...caller, data });

const codeOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected the handler to reject, but it resolved.');
};

const validData = (over: Record<string, unknown> = {}): unknown => ({
  uid: TARGET_UID,
  blocked: true,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  getUserMock.mockResolvedValue({ uid: TARGET_UID, disabled: false });
  updateUserMock.mockResolvedValue({ uid: TARGET_UID, disabled: true });
  revokeRefreshTokensMock.mockResolvedValue(undefined);
});

describe('setUserBlocked authorization', () => {
  it('rejects an unauthenticated caller', async () => {
    expect(await codeOf(handle({ data: validData() }))).toBe('unauthenticated');
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it('rejects a signed-in caller holding no roles', async () => {
    const code = await codeOf(
      handle(request(validData(), callerWith(undefined))),
    );

    expect(code).toBe('permission-denied');
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  // A restaurant holds `business`. Blocking the account that reported it is
  // exactly the thing this gate exists to refuse.
  it('rejects a caller holding only the business role', async () => {
    const code = await codeOf(
      handle(request(validData(), callerWith(['business']))),
    );

    expect(code).toBe('permission-denied');
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it('accepts a caller holding the admin role', async () => {
    await expect(handle(request(validData()))).resolves.toEqual({
      uid: TARGET_UID,
      blocked: true,
      previouslyBlocked: false,
    });
  });
});

describe('setUserBlocked input', () => {
  it.each([[undefined], [''], ['   '], [42]])(
    'rejects the uid %p',
    async (uid) => {
      expect(await codeOf(handle(request(validData({ uid }))))).toBe(
        'invalid-argument',
      );
    },
  );

  // Not defaulted to blocking: a malformed payload that silently means "block"
  // is the wrong way round for the destructive half of the pair.
  it.each([[undefined], [null], ['true'], [1], [0]])(
    'rejects the blocked flag %p',
    async (blocked) => {
      expect(await codeOf(handle(request(validData({ blocked }))))).toBe(
        'invalid-argument',
      );
      expect(updateUserMock).not.toHaveBeenCalled();
    },
  );

  it('trims the uid before resolving the account', async () => {
    await handle(request(validData({ uid: `  ${TARGET_UID}  ` })));

    expect(updateUserMock).toHaveBeenCalledWith(TARGET_UID, {
      disabled: true,
    });
  });

  it('reports an unknown account as not-found rather than as a backend error', async () => {
    getUserMock.mockRejectedValue(
      Object.assign(new Error('no user'), { code: 'auth/user-not-found' }),
    );

    expect(await codeOf(handle(request(validData({ uid: 'ghost' }))))).toBe(
      'not-found',
    );
    expect(updateUserMock).not.toHaveBeenCalled();
  });
});

describe('setUserBlocked self-lockout', () => {
  // Only an admin can unblock, so an operator who blocks themselves takes the
  // tool that would let them back in with them. Same shape as `setUserRoles`
  // refusing an admin self-demotion.
  it('refuses to block the calling operator', async () => {
    const code = await codeOf(
      handle(request(validData({ uid: ADMIN_UID }), callerWith(['admin']))),
    );

    expect(code).toBe('failed-precondition');
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it('refuses it before touching Firebase Auth at all', async () => {
    await codeOf(handle(request(validData({ uid: `  ${ADMIN_UID}  ` }))));

    expect(getUserMock).not.toHaveBeenCalled();
  });

  // An operator account can be abusive too, and any other admin can undo it.
  it('allows blocking a different operator', async () => {
    await expect(
      handle(request(validData({ uid: 'other-admin' }))),
    ).resolves.toMatchObject({ uid: 'other-admin', blocked: true });
  });

  // Unblocking oneself is unreachable — a blocked account cannot sign in — and
  // it locks nobody out, so it is not worth a second rule to refuse.
  it('does not refuse unblocking the caller', async () => {
    getUserMock.mockResolvedValue({ uid: ADMIN_UID, disabled: true });

    await expect(
      handle(request(validData({ uid: ADMIN_UID, blocked: false }))),
    ).resolves.toMatchObject({ blocked: false });
  });
});

describe('setUserBlocked writes', () => {
  it('sets the Firebase Auth disabled flag', async () => {
    await handle(request(validData()));

    expect(updateUserMock).toHaveBeenCalledWith(TARGET_UID, {
      disabled: true,
    });
  });

  // A live session survives a block for as long as the ID token it already
  // holds. Revoking is what closes the refresh path deliberately rather than
  // leaving it to the disabled flag alone.
  it('revokes the refresh tokens when blocking', async () => {
    await handle(request(validData()));

    expect(revokeRefreshTokensMock).toHaveBeenCalledWith(TARGET_UID);
  });

  it('unblocks by clearing the same flag', async () => {
    getUserMock.mockResolvedValue({ uid: TARGET_UID, disabled: true });

    const result = await handle(request(validData({ blocked: false })));

    expect(updateUserMock).toHaveBeenCalledWith(TARGET_UID, {
      disabled: false,
    });
    expect(result).toEqual({
      uid: TARGET_UID,
      blocked: false,
      previouslyBlocked: true,
    });
  });

  // Signing the account out of a session it does not have, on the one action
  // whose point is to let it sign in again.
  it('does not revoke anything when unblocking', async () => {
    getUserMock.mockResolvedValue({ uid: TARGET_UID, disabled: true });

    await handle(request(validData({ blocked: false })));

    expect(revokeRefreshTokensMock).not.toHaveBeenCalled();
  });

  // Blocking and content removal are separate actions by decision (#1475).
  it('touches nothing but the account record', async () => {
    await handle(request(validData()));

    expect(updateUserMock).toHaveBeenCalledTimes(1);
    expect(updateUserMock).toHaveBeenCalledWith(TARGET_UID, {
      disabled: true,
    });
  });

  it('accepts blocking an account that is already blocked', async () => {
    getUserMock.mockResolvedValue({ uid: TARGET_UID, disabled: true });

    await expect(handle(request(validData()))).resolves.toEqual({
      uid: TARGET_UID,
      blocked: true,
      previouslyBlocked: true,
    });
  });
});

describe('setUserBlocked logging', () => {
  // Cloud Logging is the audit trail for every operator action in epic #1471,
  // so one query has to answer what was done to an account.
  it('logs actor, target and outcome in the shared shape', async () => {
    await handle(request(validData()));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('setUserBlocked'),
      expect.objectContaining({
        operatorAction: 'setUserBlocked',
        callerUid: ADMIN_UID,
        callerRoles: ['admin'],
        targetType: 'user',
        targetId: TARGET_UID,
        outcome: 'succeeded',
        details: { blocked: true, previouslyBlocked: false },
      }),
    );
  });

  // Blocking and unblocking are two entries, not one toggle, so the trail
  // reads as a sequence of decisions.
  it('logs an unblock as its own entry', async () => {
    getUserMock.mockResolvedValue({ uid: TARGET_UID, disabled: true });

    await handle(request(validData({ blocked: false })));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('setUserBlocked'),
      expect.objectContaining({
        details: { blocked: false, previouslyBlocked: true },
      }),
    );
  });

  it('does not log a refused block', async () => {
    await codeOf(handle(request(validData({ uid: ADMIN_UID }))));

    expect(logger.info).not.toHaveBeenCalled();
  });
});
