const getFirestoreMock = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): unknown => getFirestoreMock(),
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
import { setUserSubscriptionTierHandler } from '../set-user-subscription-tier';
import { createFakeFirestore, FakeFirestore } from './fake-firestore';

const ADMIN_UID = 'admin-uid';
const TARGET_UID = 'target-uid';
const REASON = 'refund honoured, support ticket 412';

let firestore: FakeFirestore;

/**
 * The parts of `CallableRequest` the handler reads. Building the real thing
 * would mean constructing an App Check token and a raw request the handler
 * never touches.
 */
interface TestRequest {
  auth?: { uid: string; token: { roles?: unknown } };
  data: unknown;
}

type Handler = typeof setUserSubscriptionTierHandler;

const handle = (request: TestRequest): ReturnType<Handler> =>
  setUserSubscriptionTierHandler(request as Parameters<Handler>[0]);

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
  tier: 1,
  reason: REASON,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  firestore = createFakeFirestore();
  getFirestoreMock.mockImplementation(() => firestore);
  firestore.seed(`users/${TARGET_UID}`, {
    userId: TARGET_UID,
    displayName: 'Ada',
    email: 'ada@example.com',
    subscriptionTier: 0,
  });
});

describe('setUserSubscriptionTier authorization', () => {
  it('rejects an unauthenticated caller', async () => {
    expect(await codeOf(handle({ data: validData() }))).toBe('unauthenticated');
    expect(firestore.read(`users/${TARGET_UID}`)?.['subscriptionTier']).toBe(0);
  });

  it('rejects a signed-in caller holding no roles', async () => {
    const code = await codeOf(
      handle(request(validData(), callerWith(undefined))),
    );

    expect(code).toBe('permission-denied');
    expect(firestore.read(`users/${TARGET_UID}`)?.['subscriptionTier']).toBe(0);
  });

  // A restaurant holds `business`. Granting itself Pro is exactly the thing
  // this gate exists to refuse.
  it('rejects a caller holding only the business role', async () => {
    const code = await codeOf(
      handle(request(validData(), callerWith(['business']))),
    );

    expect(code).toBe('permission-denied');
  });

  it('accepts a caller holding the admin role', async () => {
    const result = await handle(request(validData()));

    expect(result).toEqual({ uid: TARGET_UID, tier: 1, previousTier: 0 });
  });
});

describe('setUserSubscriptionTier input', () => {
  it.each([[undefined], [''], ['   '], [42]])(
    'rejects the uid %p',
    async (uid) => {
      expect(await codeOf(handle(request(validData({ uid }))))).toBe(
        'invalid-argument',
      );
    },
  );

  // Free and Pro are the only tiers the domain defines. The profile badge
  // renders a case for 2, which is not a tier and is not adopted here.
  it.each([[2], [-1], [0.5], ['1'], [undefined], [null]])(
    'rejects the tier %p',
    async (tier) => {
      expect(await codeOf(handle(request(validData({ tier }))))).toBe(
        'invalid-argument',
      );
    },
  );

  it.each([[undefined], [''], ['   ']])(
    'rejects the reason %p, because the log is the only record',
    async (reason) => {
      expect(await codeOf(handle(request(validData({ reason }))))).toBe(
        'invalid-argument',
      );
    },
  );

  it('rejects a reason longer than the log line should carry', async () => {
    const code = await codeOf(
      handle(request(validData({ reason: 'x'.repeat(501) }))),
    );

    expect(code).toBe('invalid-argument');
  });

  it('accepts a reason at the limit', async () => {
    await expect(
      handle(request(validData({ reason: 'x'.repeat(500) }))),
    ).resolves.toMatchObject({ tier: 1 });
  });
});

describe('setUserSubscriptionTier writes', () => {
  it('writes the tier onto the user document', async () => {
    await handle(request(validData({ tier: 1 })));

    expect(firestore.read(`users/${TARGET_UID}`)?.['subscriptionTier']).toBe(1);
  });

  it('revokes Pro by writing Free', async () => {
    firestore.seed(`users/${TARGET_UID}`, { subscriptionTier: 1 });

    const result = await handle(request(validData({ tier: 0 })));

    expect(result).toEqual({ uid: TARGET_UID, tier: 0, previousTier: 1 });
    expect(firestore.read(`users/${TARGET_UID}`)?.['subscriptionTier']).toBe(0);
  });

  // Roles are custom claims and are untouched by a Firestore write, but every
  // other field on the document is one edit away from being clobbered.
  it('leaves every other field on the document alone', async () => {
    await handle(request(validData()));

    expect(firestore.read(`users/${TARGET_UID}`)).toEqual({
      userId: TARGET_UID,
      displayName: 'Ada',
      email: 'ada@example.com',
      subscriptionTier: 1,
    });
  });

  // An operator action is not a profile edit by the account's owner, and
  // `updatedAt` is what the product uses to mean the latter.
  it('does not stamp updatedAt', async () => {
    await handle(request(validData()));

    expect(firestore.read(`users/${TARGET_UID}`)).not.toHaveProperty(
      'updatedAt',
    );
  });

  it('reports an account with no user document as not-found', async () => {
    expect(await codeOf(handle(request(validData({ uid: 'ghost' }))))).toBe(
      'not-found',
    );
    expect(firestore.exists('users/ghost')).toBe(false);
  });

  // "Nobody ever set a tier" and "somebody chose Free" are different answers.
  it('reports a missing tier as null rather than as Free', async () => {
    firestore.seed(`users/${TARGET_UID}`, { userId: TARGET_UID });

    const result = await handle(request(validData()));

    expect(result.previousTier).toBeNull();
  });

  it('reports a malformed stored tier as null', async () => {
    firestore.seed(`users/${TARGET_UID}`, { subscriptionTier: 'pro' });

    expect((await handle(request(validData()))).previousTier).toBeNull();
  });

  it('accepts setting the tier it already holds', async () => {
    firestore.seed(`users/${TARGET_UID}`, { subscriptionTier: 1 });

    await expect(handle(request(validData({ tier: 1 })))).resolves.toEqual({
      uid: TARGET_UID,
      tier: 1,
      previousTier: 1,
    });
  });

  it('trims the uid before resolving the document', async () => {
    await handle(request(validData({ uid: `  ${TARGET_UID}  ` })));

    expect(firestore.read(`users/${TARGET_UID}`)?.['subscriptionTier']).toBe(1);
  });
});

describe('setUserSubscriptionTier logging', () => {
  // Cloud Logging is the audit trail for every operator action in epic #1471,
  // so one query has to answer what was done to an account and why.
  it('logs actor, target, both tiers and the reason', async () => {
    await handle(request(validData()));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('setUserSubscriptionTier'),
      expect.objectContaining({
        operatorAction: 'setUserSubscriptionTier',
        callerUid: ADMIN_UID,
        callerRoles: ['admin'],
        targetType: 'user',
        targetId: TARGET_UID,
        outcome: 'succeeded',
        reason: REASON,
        details: { previousTier: 0, tier: 1 },
      }),
    );
  });

  it('logs the trimmed reason', async () => {
    await handle(request(validData({ reason: `  ${REASON}  ` })));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('setUserSubscriptionTier'),
      expect.objectContaining({ reason: REASON }),
    );
  });

  it('does not log a rejected write', async () => {
    await codeOf(handle(request(validData({ tier: 2 }))));

    expect(logger.info).not.toHaveBeenCalled();
  });
});
