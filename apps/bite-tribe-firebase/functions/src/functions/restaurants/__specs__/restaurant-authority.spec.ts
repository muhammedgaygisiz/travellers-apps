import type { CallableRequest } from 'firebase-functions/https';
import {
  holdsRestaurant,
  isRestaurantOwner,
  ownerUserIdsOf,
  requireRestaurantAuthority,
} from '../restaurant-authority';

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

const documents = new Map<string, Record<string, unknown>>();

interface Snapshot {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
}

const firestoreMock = {
  collection: (
    name: string,
  ): { doc: (id: string) => { get: () => Promise<Snapshot> } } => ({
    doc: (id: string): { get: () => Promise<Snapshot> } => ({
      get: async (): Promise<Snapshot> => ({
        exists: documents.has(`${name}/${id}`),
        data: (): Record<string, unknown> | undefined =>
          documents.get(`${name}/${id}`),
      }),
    }),
  }),
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestoreMock),
}));

const SINGLE = 'single-owner';
const FIRST = 'first-owner';
const SECOND = 'second-owner';
const STRANGER = 'stranger';

const callerWith = (
  uid: string,
  roles: string[] = ['business'],
): CallableRequest<unknown> =>
  ({
    auth: { uid, token: { roles } },
    data: {},
  }) as unknown as CallableRequest<unknown>;

/**
 * Ownership read as a set (epic #1614): an account listed in `ownerUserIds`
 * holds the restaurant. Since issue #1754 an account named only in a leftover
 * single-owner field holds nothing.
 */
describe('restaurant authority', () => {
  beforeEach(() => {
    documents.clear();
    documents.set('restaurants/legacy', { ['ownerUserId']: SINGLE });
    documents.set('restaurants/set', { ownerUserIds: [FIRST, SECOND] });
    documents.set('restaurants/unheld', { name: 'Nobody' });
  });

  describe('ownerUserIdsOf', () => {
    it('ignores a leftover single-owner field', () => {
      expect(ownerUserIdsOf({ ['ownerUserId']: SINGLE })).toEqual([]);
    });

    it('reads the set', () => {
      expect(ownerUserIdsOf({ ownerUserIds: [FIRST, SECOND] })).toEqual([
        FIRST,
        SECOND,
      ]);
    });

    it('deduplicates the set', () => {
      expect(ownerUserIdsOf({ ownerUserIds: [FIRST, FIRST, SECOND] })).toEqual([
        FIRST,
        SECOND,
      ]);
    });

    it.each([
      [undefined],
      [{}],
      [{ ownerUserIds: 'not-a-list' }],
      [{ ownerUserIds: ['', 7, null] }],
    ])('reads %p as unheld', (data) => {
      expect(ownerUserIdsOf(data)).toEqual([]);
    });
  });

  it('never treats an empty uid as an owner', () => {
    expect(isRestaurantOwner({ ownerUserIds: [''] }, '')).toBe(false);
  });

  describe('requireRestaurantAuthority', () => {
    it('refuses an account named only in a leftover single-owner field', async () => {
      await expect(
        requireRestaurantAuthority(callerWith(SINGLE), 'legacy'),
      ).rejects.toMatchObject({ code: 'permission-denied' });
    });

    it.each([FIRST, SECOND])('admits %s, a member of the set', async (uid) => {
      await expect(
        requireRestaurantAuthority(callerWith(uid), 'set'),
      ).resolves.toBe(uid);
    });

    it.each(['legacy', 'set', 'unheld'])(
      'refuses a business account outside the set of %s',
      async (restaurantId) => {
        await expect(
          requireRestaurantAuthority(callerWith(STRANGER), restaurantId),
        ).rejects.toMatchObject({ code: 'permission-denied' });
      },
    );

    it('admits an operator on a restaurant it does not hold', async () => {
      await expect(
        requireRestaurantAuthority(callerWith(STRANGER, ['admin']), 'set'),
      ).resolves.toBe(STRANGER);
    });

    it('reports a missing restaurant', async () => {
      await expect(
        requireRestaurantAuthority(callerWith(FIRST), 'missing'),
      ).rejects.toMatchObject({ code: 'not-found' });
    });
  });

  describe('holdsRestaurant', () => {
    it('holds for a member of the set', () => {
      expect(
        holdsRestaurant(
          callerWith(SECOND),
          { ownerUserIds: [FIRST, SECOND] },
          SECOND,
        ),
      ).toBe(true);
    });

    it('does not hold for an account outside the set', () => {
      expect(
        holdsRestaurant(
          callerWith(STRANGER),
          { ownerUserIds: [FIRST] },
          STRANGER,
        ),
      ).toBe(false);
    });

    it('does not hold for an account named only in a leftover single field', () => {
      expect(
        holdsRestaurant(
          callerWith(SINGLE),
          { ['ownerUserId']: SINGLE, ownerUserIds: [FIRST] },
          SINGLE,
        ),
      ).toBe(false);
    });
  });
});
