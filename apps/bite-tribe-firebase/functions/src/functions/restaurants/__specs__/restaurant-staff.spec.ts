import { logger } from 'firebase-functions';
import {
  addRestaurantStaff,
  listRestaurantStaff,
  removeRestaurantStaff,
} from '../restaurant-staff';

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
const getUserByEmailMock = jest.fn();
const getUsersMock = jest.fn();
const setCustomUserClaimsMock = jest.fn();

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    getUser: getUserMock,
    getUserByEmail: getUserByEmailMock,
    getUsers: getUsersMock,
    setCustomUserClaims: setCustomUserClaimsMock,
  })),
}));

/**
 * A document store rather than a per-call mock.
 *
 * The two write callables are a Firestore transaction and an Auth claim write
 * that have to agree, and half of what is worth asserting is the state left
 * behind when one of them fails. A store makes "the association is gone again"
 * something the test can read; a `jest.fn()` per operation only records that
 * something was called.
 */
const documents = new Map<string, Record<string, unknown>>();

interface DocRef {
  id: string;
  path: string;
  get: () => Promise<unknown>;
  delete: () => Promise<void>;
}

const snapshotOf = (
  path: string,
): { id: string; exists: boolean; data: () => unknown } => ({
  id: path.slice(path.lastIndexOf('/') + 1),
  exists: documents.has(path),
  data: (): unknown => documents.get(path),
});

const deleteFailsFor = new Set<string>();

const makeDocRef = (path: string): DocRef => ({
  id: path.slice(path.lastIndexOf('/') + 1),
  path,
  get: async () => snapshotOf(path),
  delete: async (): Promise<void> => {
    if (deleteFailsFor.has(path)) {
      throw new Error('delete failed');
    }

    documents.delete(path);
  },
});

let transactionFails = false;

const transaction = {
  get: async (ref: DocRef): Promise<Snapshot> => snapshotOf(ref.path),
  set: (ref: DocRef, data: Record<string, unknown>): void => {
    documents.set(ref.path, data);
  },
  delete: (ref: DocRef): void => {
    documents.delete(ref.path);
  },
};

type Snapshot = ReturnType<typeof snapshotOf>;

const firestoreMock = {
  collection: (
    name: string,
  ): {
    doc: (id: string) => DocRef;
    where: (
      field: string,
      operator: string,
      value: unknown,
    ) => { get: () => Promise<{ docs: Snapshot[] }> };
  } => ({
    doc: (id: string): DocRef => makeDocRef(`${name}/${id}`),
    where: (
      field: string,
      _operator: string,
      value: unknown,
    ): { get: () => Promise<{ docs: Snapshot[] }> } => ({
      get: async (): Promise<{ docs: Snapshot[] }> => ({
        docs: [...documents.entries()]
          .filter(([path]) => path.startsWith(`${name}/`))
          .filter(([, data]) => data[field] === value)
          .map(([path]) => snapshotOf(path)),
      }),
    }),
  }),
  getAll: async (...refs: DocRef[]): Promise<Snapshot[]> =>
    refs.map((ref) => snapshotOf(ref.path)),
  runTransaction: async (
    handler: (t: typeof transaction) => Promise<unknown>,
  ): Promise<unknown> => {
    const result = await handler(transaction);

    if (transactionFails) {
      throw new Error('commit failed');
    }

    return result;
  },
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestoreMock),
}));

const OWNER = 'owner-1';
const OPERATOR = 'operator-1';
const TARGET = 'waiter-1';
const RESTAURANT = 'restaurant-1';
const OTHER_RESTAURANT = 'restaurant-2';

const callerWith = (
  uid: string,
  roles: unknown,
): { uid: string; token: unknown } => ({ uid, token: { roles } });

const request = (
  data: unknown,
  caller = callerWith(OWNER, ['business']),
): never => ({ auth: caller, data }) as never;

const codeOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected the callable to reject, but it resolved.');
};

/** The roles the Auth record reports for an account. */
const account = (uid: string, roles: string[]): void => {
  accountRoles.set(uid, roles);
};

const accountRoles = new Map<string, string[]>();

const add = { restaurantId: RESTAURANT, uid: TARGET };

beforeEach(() => {
  jest.clearAllMocks();
  documents.clear();
  accountRoles.clear();
  deleteFailsFor.clear();
  transactionFails = false;

  documents.set(`restaurants/${RESTAURANT}`, {
    name: 'Pizza Palace',
    ownerUserId: OWNER,
  });
  documents.set(`restaurants/${OTHER_RESTAURANT}`, {
    name: 'Someone Else',
    ownerUserId: 'other-owner',
  });

  account(TARGET, []);
  account(OWNER, ['business']);
  account(OPERATOR, ['admin']);

  getUserMock.mockImplementation(async (uid: string) => {
    if (!accountRoles.has(uid)) {
      throw new Error('no such user');
    }

    return { uid, customClaims: { roles: accountRoles.get(uid) } };
  });
  getUserByEmailMock.mockImplementation(async (email: string) => {
    if (email !== 'waiter@example.com') {
      throw new Error('no such user');
    }

    return { uid: TARGET };
  });
  getUsersMock.mockImplementation(async (identifiers: { uid: string }[]) => ({
    users: identifiers.map(({ uid }) => ({
      uid,
      email: `${uid}@example.com`,
    })),
    notFound: [],
  }));
  setCustomUserClaimsMock.mockImplementation(
    async (uid: string, claims: { roles: string[] }) => {
      accountRoles.set(uid, claims.roles);
    },
  );
});

/**
 * The gate is the feature. A callable that lets any `business` caller grant
 * `staff` to any account is a privilege-escalation path dressed as a
 * convenience: `staff` is a business-app key, so granting it to an
 * attacker-controlled account puts that account inside the business app.
 */
describe('restaurant staff authorization', () => {
  it('rejects an unauthenticated caller on add', async () => {
    const code = await codeOf(
      addRestaurantStaff({ data: add } as never) as Promise<unknown>,
    );

    expect(code).toBe('unauthenticated');
  });

  it('rejects an unauthenticated caller on remove', async () => {
    const code = await codeOf(
      removeRestaurantStaff({ data: add } as never) as Promise<unknown>,
    );

    expect(code).toBe('unauthenticated');
  });

  it('rejects an unauthenticated caller on list', async () => {
    const code = await codeOf(
      listRestaurantStaff({
        data: { restaurantId: RESTAURANT },
      } as never) as Promise<unknown>,
    );

    expect(code).toBe('unauthenticated');
  });

  it('rejects a consumer account holding no roles', async () => {
    const code = await codeOf(
      addRestaurantStaff(
        request(add, callerWith('consumer-1', undefined)),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });

  it('rejects a caller holding only the staff role', async () => {
    const code = await codeOf(
      addRestaurantStaff(
        request(add, callerWith('waiter-2', ['staff'])),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });

  it('refuses a business caller acting on a restaurant it does not hold', async () => {
    const code = await codeOf(
      addRestaurantStaff(
        request({ restaurantId: OTHER_RESTAURANT, uid: TARGET }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });

  it('refuses a business caller listing a restaurant it does not hold', async () => {
    const code = await codeOf(
      listRestaurantStaff(
        request({ restaurantId: OTHER_RESTAURANT }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });

  /**
   * `RD-UR-6`: the operator maintains every restaurant, claimed or not. It is
   * the way back for a restaurant that removed its last account with access.
   */
  it('lets an operator act on a restaurant it does not hold', async () => {
    const result = await addRestaurantStaff(
      request(add, callerWith(OPERATOR, ['admin'])),
    );

    expect(result).toMatchObject({ status: 'added', uid: TARGET });
  });

  it('reports a restaurant that does not exist as not-found', async () => {
    const code = await codeOf(
      addRestaurantStaff(
        request({ restaurantId: 'nope', uid: TARGET }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('not-found');
  });

  it('requires a restaurant id', async () => {
    const code = await codeOf(
      addRestaurantStaff(request({ uid: TARGET })) as Promise<unknown>,
    );

    expect(code).toBe('invalid-argument');
  });
});

describe('adding staff', () => {
  it('writes the role and the association together', async () => {
    const result = await addRestaurantStaff(request(add));

    expect(result).toEqual({
      restaurantId: RESTAURANT,
      uid: TARGET,
      roles: ['staff'],
      status: 'added',
    });
    expect(documents.get(`restaurantStaff/${TARGET}`)).toMatchObject({
      userId: TARGET,
      restaurantId: RESTAURANT,
      addedBy: OWNER,
    });
    expect(accountRoles.get(TARGET)).toEqual(['staff']);
  });

  it('resolves the account by email', async () => {
    const result = await addRestaurantStaff(
      request({ restaurantId: RESTAURANT, email: 'waiter@example.com' }),
    );

    expect(result).toMatchObject({ uid: TARGET, status: 'added' });
  });

  it('reports an unknown email as not-found', async () => {
    const code = await codeOf(
      addRestaurantStaff(
        request({ restaurantId: RESTAURANT, email: 'nobody@example.com' }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('not-found');
  });

  /**
   * The whole role set is written, not just `staff`, because
   * `setCustomUserClaims` replaces the claim object. Everything else the
   * account held has to survive.
   */
  it('leaves every other claim the account carries alone', async () => {
    await addRestaurantStaff(request(add));

    expect(setCustomUserClaimsMock).toHaveBeenCalledWith(TARGET, {
      roles: ['staff'],
    });
  });

  /**
   * The escalation the callable exists to refuse. There is no payload that
   * reaches `admin` or `business`: the roles are not read from the request at
   * all, so a caller naming them changes nothing.
   */
  it('grants nothing but staff, whatever the payload says', async () => {
    await addRestaurantStaff(request({ ...add, roles: ['admin', 'business'] }));

    expect(accountRoles.get(TARGET)).toEqual(['staff']);
  });

  it('refuses an account holding admin', async () => {
    account(TARGET, ['admin']);

    const code = await codeOf(
      addRestaurantStaff(request(add)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
    expect(documents.has(`restaurantStaff/${TARGET}`)).toBe(false);
  });

  it('refuses an account holding business', async () => {
    account(TARGET, ['business']);

    const code = await codeOf(
      addRestaurantStaff(request(add)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
  });

  it('refuses the caller adding its own account', async () => {
    const code = await codeOf(
      addRestaurantStaff(
        request({ restaurantId: RESTAURANT, uid: OWNER }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
  });

  it('reports an account that does not exist as not-found', async () => {
    const code = await codeOf(
      addRestaurantStaff(
        request({ restaurantId: RESTAURANT, uid: 'ghost' }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('not-found');
  });

  it('repeats idempotently and repairs a lost claim', async () => {
    await addRestaurantStaff(request(add));
    account(TARGET, []);

    const result = await addRestaurantStaff(request(add));

    expect(result).toMatchObject({ status: 'already-staff' });
    expect(accountRoles.get(TARGET)).toEqual(['staff']);
  });

  /** One restaurant per staff account, enforced by the document's name. */
  it('refuses an account already staff on another restaurant', async () => {
    documents.set(`restaurantStaff/${TARGET}`, {
      userId: TARGET,
      restaurantId: OTHER_RESTAURANT,
    });

    const code = await codeOf(
      addRestaurantStaff(request(add)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
    expect(documents.get(`restaurantStaff/${TARGET}`)).toMatchObject({
      restaurantId: OTHER_RESTAURANT,
    });
  });

  /**
   * The acceptance criterion "a failure leaves neither" across two stores that
   * cannot share a transaction. The association is written first, so the
   * compensating write is the one that has to happen.
   */
  it('takes the association back when the claim write fails', async () => {
    setCustomUserClaimsMock.mockRejectedValueOnce(new Error('claim failed'));

    await expect(
      addRestaurantStaff(request(add)) as Promise<unknown>,
    ).rejects.toThrow('claim failed');
    expect(documents.has(`restaurantStaff/${TARGET}`)).toBe(false);
    expect(accountRoles.get(TARGET)).toEqual([]);
  });

  /**
   * The compensating write is best-effort. If it fails too, the caller still
   * sees the failure that actually happened rather than the failure of the
   * cleanup — an "association exists, role does not" state is the safe half,
   * and reporting the wrong error would send whoever is debugging it at the
   * wrong store.
   */
  it('reports the original failure when the compensating delete also fails', async () => {
    setCustomUserClaimsMock.mockRejectedValueOnce(new Error('claim failed'));
    deleteFailsFor.add(`restaurantStaff/${TARGET}`);

    await expect(
      addRestaurantStaff(request(add)) as Promise<unknown>,
    ).rejects.toThrow('claim failed');
    expect(documents.has(`restaurantStaff/${TARGET}`)).toBe(true);
    expect(accountRoles.get(TARGET)).toEqual([]);
  });

  it('writes no claim when the association cannot be written', async () => {
    transactionFails = true;

    await expect(
      addRestaurantStaff(request(add)) as Promise<unknown>,
    ).rejects.toThrow('commit failed');
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });
});

describe('removing staff', () => {
  const remove = { restaurantId: RESTAURANT, uid: TARGET };

  beforeEach(async () => {
    await addRestaurantStaff(request(add));
    jest.clearAllMocks();
  });

  it('removes the role and the association together', async () => {
    const result = await removeRestaurantStaff(request(remove));

    expect(result).toEqual({
      restaurantId: RESTAURANT,
      uid: TARGET,
      roles: [],
    });
    expect(documents.has(`restaurantStaff/${TARGET}`)).toBe(false);
    expect(accountRoles.get(TARGET)).toEqual([]);
  });

  it('refuses a business caller removing staff from another restaurant', async () => {
    const code = await codeOf(
      removeRestaurantStaff(
        request({ restaurantId: OTHER_RESTAURANT, uid: TARGET }),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
    expect(accountRoles.get(TARGET)).toEqual(['staff']);
  });

  it('refuses removing an account that is not staff here', async () => {
    documents.delete(`restaurantStaff/${TARGET}`);

    const code = await codeOf(
      removeRestaurantStaff(request(remove)) as Promise<unknown>,
    );

    expect(code).toBe('not-found');
  });

  /**
   * A restaurant owner may not strip an operator's `admin`, or another
   * restaurant's `business`, by naming them as staff to remove.
   */
  it('refuses an account holding admin', async () => {
    account(TARGET, ['admin']);

    const code = await codeOf(
      removeRestaurantStaff(request(remove)) as Promise<unknown>,
    );

    expect(code).toBe('failed-precondition');
    expect(accountRoles.get(TARGET)).toEqual(['admin']);
  });

  it('lets an operator remove staff from any restaurant', async () => {
    await removeRestaurantStaff(
      request(remove, callerWith(OPERATOR, ['admin'])),
    );

    expect(documents.has(`restaurantStaff/${TARGET}`)).toBe(false);
  });

  /**
   * The removal drops the role first, so the state a failure can leave is an
   * association with no role — which grants nothing. The claim is put back
   * rather than left stripped, so the account is exactly where it started.
   */
  it('puts the role back when the association cannot be deleted', async () => {
    transactionFails = true;

    await expect(
      removeRestaurantStaff(request(remove)) as Promise<unknown>,
    ).rejects.toThrow('commit failed');
    expect(accountRoles.get(TARGET)).toEqual(['staff']);
  });
});

describe('listing staff', () => {
  beforeEach(async () => {
    await addRestaurantStaff(request(add));
    documents.set('users/waiter-1', { displayName: 'Sam' });
    jest.clearAllMocks();
  });

  it('returns the accounts on the restaurant', async () => {
    const result = await listRestaurantStaff(
      request({ restaurantId: RESTAURANT }),
    );

    expect(result).toEqual({
      restaurantId: RESTAURANT,
      staff: [
        {
          uid: TARGET,
          email: 'waiter-1@example.com',
          displayName: 'Sam',
          addedBy: OWNER,
          addedAt: expect.any(String),
        },
      ],
    });
  });

  it('returns nothing for a restaurant with no staff', async () => {
    const result = await listRestaurantStaff(
      request({ restaurantId: RESTAURANT }, callerWith(OPERATOR, ['admin'])),
    );

    documents.delete(`restaurantStaff/${TARGET}`);

    const empty = await listRestaurantStaff(
      request({ restaurantId: RESTAURANT }, callerWith(OPERATOR, ['admin'])),
    );

    expect(result.staff).toHaveLength(1);
    expect(empty.staff).toEqual([]);
  });
});

/**
 * Every grant and removal is attributable to the caller, the target and the
 * restaurant. Cloud Logging is the audit trail at this scale, by the decision
 * on `Architecture - Auth`, so the entry is the record.
 */
describe('the audit trail', () => {
  it('records who added whom, to which restaurant', async () => {
    await addRestaurantStaff(request(add));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('addRestaurantStaff succeeded'),
      expect.objectContaining({
        operatorAction: 'addRestaurantStaff',
        callerUid: OWNER,
        callerRoles: ['business'],
        targetType: 'user',
        targetId: TARGET,
        outcome: 'succeeded',
        details: expect.objectContaining({ restaurantId: RESTAURANT }),
      }),
    );
  });

  it('records the removal, and which role acted', async () => {
    await addRestaurantStaff(request(add));
    await removeRestaurantStaff(
      request(
        { restaurantId: RESTAURANT, uid: TARGET },
        callerWith(OPERATOR, ['admin']),
      ),
    );

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('removeRestaurantStaff succeeded'),
      expect.objectContaining({
        operatorAction: 'removeRestaurantStaff',
        callerUid: OPERATOR,
        callerRoles: ['admin'],
        targetId: TARGET,
      }),
    );
  });

  it('leaves a started entry with no success when the write fails', async () => {
    transactionFails = true;

    await expect(
      addRestaurantStaff(request(add)) as Promise<unknown>,
    ).rejects.toThrow('commit failed');

    const outcomes = (logger.info as jest.Mock).mock.calls.map(
      ([, payload]) => (payload as { outcome: string }).outcome,
    );

    expect(outcomes).toEqual(['started']);
  });
});
