import { logger } from 'firebase-functions';
import {
  assignRestaurantOwner,
  revokeRestaurantOwner,
} from '../restaurant-ownership';

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
  },
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

const getUserMock = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({ getUser: getUserMock })),
}));

type DocRef = { id: string; path: string };

const updateMock = jest.fn();
const getMock = jest.fn();

const firestoreMock = {
  collection: jest.fn((collectionName: string) => ({
    doc: jest.fn((id: string) => ({ id, path: `${collectionName}/${id}` })),
  })),
  runTransaction: jest.fn(),
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestoreMock),
  FieldValue: { delete: jest.fn(() => 'DELETED') },
}));

/** A caller the verified ID token says holds `roles`. */
const callerWith = (roles: unknown): { uid: string; token: unknown } => ({
  uid: 'operator-1',
  token: { roles },
});

const request = (data: unknown, caller = callerWith(['admin'])): never =>
  ({ auth: caller, data }) as never;

const codeOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected the callable to reject, but it resolved.');
};

const messageOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as Error).message;
  }

  throw new Error('Expected the callable to reject, but it resolved.');
};

/** The restaurant document the transaction reads, or the absence of one. */
const restaurant = (data?: Record<string, unknown>): void => {
  getMock.mockImplementation(async (ref: DocRef) => ({
    exists: !!data,
    ref,
    data: (): Record<string, unknown> | undefined => data,
  }));
};

const assign = {
  restaurantId: 'restaurant-1',
  ownerUserId: 'owner-1',
  reason: 'Verified on the phone.',
};
const revoke = { restaurantId: 'restaurant-1', reason: 'Restaurant closed.' };

beforeEach(() => {
  jest.clearAllMocks();
  getUserMock.mockResolvedValue({ customClaims: { roles: ['business'] } });
  restaurant({ name: 'Pizza Palace' });
  firestoreMock.runTransaction.mockImplementation((handler) =>
    handler({ get: getMock, update: updateMock }),
  );
});

/**
 * The callables write who is accountable for a restaurant, so the gate on them
 * is the point: a consumer account reaching either one could hand itself a
 * restaurant, or take one from the account that holds it (issue #1472).
 */
describe('restaurant ownership authorization', () => {
  it('rejects an unauthenticated caller on assign', async () => {
    const code = await codeOf(
      assignRestaurantOwner({ data: assign } as never) as Promise<unknown>,
    );

    expect(code).toBe('unauthenticated');
  });

  it('rejects an unauthenticated caller on revoke', async () => {
    const code = await codeOf(
      revokeRestaurantOwner({ data: revoke } as never) as Promise<unknown>,
    );

    expect(code).toBe('unauthenticated');
  });

  it('rejects a consumer account holding no roles', async () => {
    const code = await codeOf(
      assignRestaurantOwner(
        request(assign, callerWith(undefined)),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });

  it('rejects a caller holding only the business role', async () => {
    const code = await codeOf(
      assignRestaurantOwner(
        request(assign, callerWith(['business'])),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });

  it('rejects a caller holding only the business role on revoke', async () => {
    const code = await codeOf(
      revokeRestaurantOwner(
        request(revoke, callerWith(['business'])),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });

  it('writes nothing when the caller is refused', async () => {
    await codeOf(
      assignRestaurantOwner(
        request(assign, callerWith(['business'])),
      ) as Promise<unknown>,
    );

    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('assignRestaurantOwner', () => {
  it('writes the owner, the claim state and the grant timestamps', async () => {
    const result = await assignRestaurantOwner(request(assign));

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'restaurants/restaurant-1' }),
      expect.objectContaining({
        ownerUserId: 'owner-1',
        claimStatus: 'claimed',
        claimedAt: expect.any(String),
        claimedAtTimestamp: expect.any(Number),
      }),
    );
    expect(result).toEqual({
      restaurantId: 'restaurant-1',
      ownerUserId: 'owner-1',
      claimStatus: 'claimed',
      status: 'assigned',
    });
  });

  // Repeating an assignment is the same decision, not a second one. It returns
  // the current state rather than writing a fresh timestamp over the grant.
  it('is idempotent when the restaurant already belongs to that account', async () => {
    restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' });

    const result = await assignRestaurantOwner(request(assign));

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.status).toBe('already-assigned');
  });

  it('refuses a restaurant that another account holds, and names that account', async () => {
    restaurant({ ownerUserId: 'owner-2', claimStatus: 'claimed' });

    const promise = assignRestaurantOwner(request(assign)) as Promise<unknown>;
    const message = await messageOf(promise);

    expect(message).toContain('owner-2');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('refuses a restaurant that another account holds with failed-precondition', async () => {
    restaurant({ ownerUserId: 'owner-2', claimStatus: 'claimed' });

    const code = await codeOf(
      assignRestaurantOwner(request(assign)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
  });

  it('refuses an account that does not hold the business role', async () => {
    getUserMock.mockResolvedValue({ customClaims: { roles: ['staff'] } });

    const code = await codeOf(
      assignRestaurantOwner(request(assign)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
    expect(firestoreMock.runTransaction).not.toHaveBeenCalled();
  });

  it('refuses an account that carries no custom claims at all', async () => {
    getUserMock.mockResolvedValue({});

    const code = await codeOf(
      assignRestaurantOwner(request(assign)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
  });

  it('reports an unknown account as not-found', async () => {
    getUserMock.mockRejectedValue(new Error('auth/user-not-found'));

    const code = await codeOf(
      assignRestaurantOwner(request(assign)) as Promise<unknown>,
    );

    expect(code).toBe('not-found');
  });

  it('reports an unknown restaurant as not-found', async () => {
    restaurant(undefined);

    const code = await codeOf(
      assignRestaurantOwner(request(assign)) as Promise<unknown>,
    );

    expect(code).toBe('not-found');
  });

  it('requires a reason', async () => {
    const code = await codeOf(
      assignRestaurantOwner(
        request({ ...assign, reason: '  ' }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('invalid-argument');
  });

  it('requires a restaurant and an account', async () => {
    const code = await codeOf(
      assignRestaurantOwner(
        request({ reason: 'Verified on the phone.' }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('invalid-argument');
  });

  it('records the operator, the target and the reason in the audit trail', async () => {
    await assignRestaurantOwner(request(assign));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('assignRestaurantOwner succeeded'),
      expect.objectContaining({
        operatorAction: 'assignRestaurantOwner',
        callerUid: 'operator-1',
        callerRoles: ['admin'],
        targetType: 'restaurant',
        targetId: 'restaurant-1',
        reason: 'Verified on the phone.',
        details: { ownerUserId: 'owner-1', status: 'assigned' },
      }),
    );
  });
});

describe('revokeRestaurantOwner', () => {
  it('deletes the owner and the grant timestamps and records the revocation', async () => {
    restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' });

    const result = await revokeRestaurantOwner(request(revoke));

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'restaurants/restaurant-1' }),
      expect.objectContaining({
        ownerUserId: 'DELETED',
        claimedAt: 'DELETED',
        claimedAtTimestamp: 'DELETED',
        claimStatus: 'revoked',
      }),
    );
    expect(result).toEqual({
      restaurantId: 'restaurant-1',
      previousOwnerUserId: 'owner-1',
      claimStatus: 'revoked',
    });
  });

  // `revoked` over `unclaimed` would record a decision nobody made, on the
  // field the ownership-scoped rules of issue #1078 will read.
  it('refuses a restaurant nobody holds', async () => {
    restaurant({ name: 'Pizza Palace' });

    const code = await codeOf(
      revokeRestaurantOwner(request(revoke)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('refuses a restaurant whose ownership was already revoked', async () => {
    restaurant({ claimStatus: 'revoked' });

    const code = await codeOf(
      revokeRestaurantOwner(request(revoke)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
  });

  it('reports an unknown restaurant as not-found', async () => {
    restaurant(undefined);

    const code = await codeOf(
      revokeRestaurantOwner(request(revoke)) as Promise<unknown>,
    );

    expect(code).toBe('not-found');
  });

  it('requires a reason', async () => {
    restaurant({ ownerUserId: 'owner-1' });

    const code = await codeOf(
      revokeRestaurantOwner(
        request({ restaurantId: 'restaurant-1' }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('invalid-argument');
  });

  it('records the operator, the target and the reason in the audit trail', async () => {
    restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' });

    await revokeRestaurantOwner(request(revoke));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('revokeRestaurantOwner succeeded'),
      expect.objectContaining({
        operatorAction: 'revokeRestaurantOwner',
        callerUid: 'operator-1',
        callerRoles: ['admin'],
        targetType: 'restaurant',
        targetId: 'restaurant-1',
        reason: 'Restaurant closed.',
        details: { previousOwnerUserId: 'owner-1' },
      }),
    );
  });
});
