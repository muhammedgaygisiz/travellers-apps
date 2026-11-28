import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import {
  createFakeFirestore,
  DELETE_SENTINEL,
} from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;
const deleteFiles = jest.fn(async () => undefined);

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: { delete: (): unknown => DELETE_SENTINEL },
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: (): unknown => ({ bucket: () => ({ deleteFiles }) }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn(
    (options: unknown, handler?: unknown) => handler ?? options,
  ),
}));

jest.mock('../../shared/utils/deployment-stage', () => ({
  resolveDeploymentStage: (): string => 'dev',
}));

import { CallableRequest } from 'firebase-functions/https';
import { answerDietaryLabelRemovalHandler } from '../answer-dietary-label-removal';
import { listDietaryLabelRemovalsHandler } from '../list-dietary-label-removals';
import { requestDietaryLabelRestorationHandler } from '../request-dietary-label-restoration';

const NOW = new Date('2026-11-28T12:00:00.000Z');
const REMOVED_AT = '2026-11-20T00:00:00.000Z';
const REMOVAL_ID = 'r1__m1__vegan';
const REMOVAL = {
  removedAt: REMOVED_AT,
  disputes: 3,
  confirmations: 1,
  reasons: { 'animal-product': 3 },
};

const as = <T>(uid: string, roles: string[], data: T): CallableRequest<T> =>
  ({
    auth: {
      uid,
      token: { roles, firebase: { sign_in_provider: 'password' } },
    },
    data,
  }) as unknown as CallableRequest<T>;

const requestAs = (
  uid: string,
  roles: string[],
  data: Record<string, unknown>,
): ReturnType<typeof requestDietaryLabelRestorationHandler> =>
  requestDietaryLabelRestorationHandler(as(uid, roles, data), NOW);

const answer = (
  decision: string,
  reason = 'Supplier changed',
  uid = 'op',
  roles = ['admin'],
): ReturnType<typeof answerDietaryLabelRemovalHandler> =>
  answerDietaryLabelRemovalHandler(
    as(uid, roles, { removalId: REMOVAL_ID, decision, reason }),
    NOW,
  );

const vote = (
  uid: string,
  votes: Record<string, unknown>,
): Record<string, unknown> => ({
  uid,
  scopeKey: 'menu__r1',
  items: { m1: votes },
});

/** See GitHub issue #2199. */
describe('dietary label restoration', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    deleteFiles.mockClear();
    db.seed('restaurants/r1', {
      name: 'Thai Garden',
      ownerUserIds: ['owner'],
      menuId: 'menu-1',
      dietaryStrikes: [
        { menuItemId: 'm1', label: 'vegan', removedAt: REMOVED_AT },
        { menuItemId: 'm2', label: 'halal', removedAt: REMOVED_AT },
      ],
    });
    db.seed('menus/menu-1', {
      categories: [{ items: [{ id: 'm1', name: 'Pad Thai' }] }],
      dietary: {
        m1: { labels: ['halal'], removed: { vegan: REMOVAL } },
      },
    });
    db.seed(`dietaryLabelRemovals/${REMOVAL_ID}`, {
      restaurantId: 'r1',
      restaurantName: 'Thai Garden',
      menuItemId: 'm1',
      dishName: 'Pad Thai',
      label: 'vegan',
      ...REMOVAL,
      status: 'open',
    });
    db.seed('dietaryLabelTallies/menu__r1', {
      scopeKey: 'menu__r1',
      items: {
        m1: {
          vegan: { confirm: 1, dispute: 3 },
          halal: { confirm: 2, dispute: 0 },
        },
      },
    });
    db.seed(
      'dietaryLabelVotes/menu__r1__d1',
      vote('d1', {
        vegan: {
          vote: 'dispute',
          reason: 'animal-product',
          note: 'Fish sauce in it',
          votedAt: '2026-11-18T00:00:00.000Z',
        },
      }),
    );
    db.seed(
      'dietaryLabelVotes/menu__r1__d2',
      vote('d2', {
        vegan: {
          vote: 'dispute',
          reason: 'animal-product',
          votedAt: '2026-11-19T00:00:00.000Z',
        },
        halal: { vote: 'confirm', votedAt: '2026-11-19T00:00:00.000Z' },
      }),
    );
    db.seed(
      'dietaryLabelVotes/menu__r1__c1',
      vote('c1', {
        vegan: { vote: 'confirm', votedAt: '2026-11-17T00:00:00.000Z' },
      }),
    );
  });

  describe('requestDietaryLabelRestoration', () => {
    it('records the request, marks the photo pending and the dish requested', async () => {
      await expect(
        requestAs('owner', ['business'], {
          restaurantId: 'r1',
          menuItemId: 'm1',
          label: 'vegan',
          explanation: '  We changed to a vegan fish sauce.  ',
          withPhoto: true,
        }),
      ).resolves.toEqual({ status: 'requested', removalId: REMOVAL_ID });

      expect(db.read(`dietaryLabelRemovals/${REMOVAL_ID}`)).toMatchObject({
        status: 'open',
        explanation: 'We changed to a vegan fish sauce.',
        requestedAt: NOW.toISOString(),
        requesterUid: 'owner',
        imageStatus: 'pending',
      });
      expect(
        (db.read('menus/menu-1')?.['dietary'] as Record<string, any>)['m1']
          .removed.vegan.restorationRequestedAt,
      ).toBe(NOW.toISOString());
    });

    it('reopens a confirmed removal, and creates the item for an older removal', async () => {
      db.seed(`dietaryLabelRemovals/${REMOVAL_ID}`, {
        ...db.read(`dietaryLabelRemovals/${REMOVAL_ID}`),
        status: 'confirmed',
        imagePath: 'https://old',
      });
      await requestAs('owner', ['business'], {
        restaurantId: 'r1',
        menuItemId: 'm1',
        label: 'vegan',
        explanation: 'New supplier',
      });
      const reopened = db.read(`dietaryLabelRemovals/${REMOVAL_ID}`);
      expect(reopened?.['status']).toBe('open');
      expect(reopened).not.toHaveProperty('imagePath');
      expect(reopened).not.toHaveProperty('imageStatus');

      db.seed('menus/menu-1', {
        ...db.read('menus/menu-1'),
        dietary: { m1: { removed: { vegan: REMOVAL, halal: REMOVAL } } },
      });
      await requestAs('owner', ['business'], {
        restaurantId: 'r1',
        menuItemId: 'm1',
        label: 'halal',
        explanation: 'Certified now',
      });
      expect(db.read('dietaryLabelRemovals/r1__m1__halal')).toMatchObject({
        restaurantName: 'Thai Garden',
        dishName: 'Pad Thai',
        label: 'halal',
        disputes: 3,
        status: 'open',
      });
    });

    it('answers not-removed for a label the dish still carries', async () => {
      await expect(
        requestAs('owner', ['business'], {
          restaurantId: 'r1',
          menuItemId: 'm1',
          label: 'halal',
          explanation: 'Why',
        }),
      ).resolves.toEqual({ status: 'not-removed' });
    });

    it('refuses a stranger, and a request without an explanation', async () => {
      await expect(
        requestAs('stranger', ['business'], {
          restaurantId: 'r1',
          menuItemId: 'm1',
          label: 'vegan',
          explanation: 'Mine',
        }),
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        requestAs('owner', ['business'], {
          restaurantId: 'r1',
          menuItemId: 'm1',
          label: 'vegan',
          explanation: '   ',
        }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
      await expect(
        requestAs('owner', ['business'], {
          restaurantId: 'r1',
          menuItemId: 'm1',
          label: 'vegan',
          explanation: 'x'.repeat(1001),
        }),
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    });
  });

  describe('listDietaryLabelRemovals', () => {
    it('lists open removals with their disputes, never who cast them', async () => {
      const { removals } = await listDietaryLabelRemovalsHandler(
        as('op', ['admin'], {}),
      );

      expect(removals).toHaveLength(1);
      expect(removals[0]).toMatchObject({
        removalId: REMOVAL_ID,
        dishName: 'Pad Thai',
        confirmations: 1,
        disputesDetail: [
          { reason: 'animal-product', votedAt: '2026-11-19T00:00:00.000Z' },
          {
            reason: 'animal-product',
            note: 'Fish sauce in it',
            votedAt: '2026-11-18T00:00:00.000Z',
          },
        ],
      });
      expect(JSON.stringify(removals)).not.toContain('"d1"');
    });

    it('leaves confirmed removals out, and refuses a non-operator', async () => {
      db.seed(`dietaryLabelRemovals/${REMOVAL_ID}`, {
        ...db.read(`dietaryLabelRemovals/${REMOVAL_ID}`),
        status: 'confirmed',
      });

      await expect(
        listDietaryLabelRemovalsHandler(as('op', ['admin'], {})),
      ).resolves.toEqual({ removals: [] });
      await expect(
        listDietaryLabelRemovalsHandler(as('owner', ['business'], {})),
      ).rejects.toBeDefined();
    });
  });

  describe('answerDietaryLabelRemoval', () => {
    it('restores the label, discards its disputes and takes the strike back', async () => {
      await expect(answer('restore')).resolves.toEqual({ status: 'restored' });

      expect(db.read('menus/menu-1')?.['dietary']).toEqual({
        m1: { labels: ['vegan', 'halal'] },
      });
      expect(db.read('restaurants/r1')?.['dietaryStrikes']).toEqual([
        { menuItemId: 'm2', label: 'halal', removedAt: REMOVED_AT },
      ]);
      expect(db.exists('dietaryLabelVotes/menu__r1__d1')).toBe(false);
      expect(db.read('dietaryLabelVotes/menu__r1__d2')?.['items']).toEqual({
        m1: { halal: { vote: 'confirm', votedAt: '2026-11-19T00:00:00.000Z' } },
      });
      expect(db.exists('dietaryLabelVotes/menu__r1__c1')).toBe(true);
      expect(db.read('dietaryLabelTallies/menu__r1')?.['items']).toEqual({
        m1: {
          vegan: { confirm: 1, dispute: 0 },
          halal: { confirm: 2, dispute: 0 },
        },
      });
      expect(db.exists(`dietaryLabelRemovals/${REMOVAL_ID}`)).toBe(false);
      expect(deleteFiles).toHaveBeenCalledWith({
        prefix: `images/dietaryLabelRemovals/${REMOVAL_ID}/`,
      });
    });

    it('confirms the removal: the label stays removed and the strike counts', async () => {
      await requestAs('owner', ['business'], {
        restaurantId: 'r1',
        menuItemId: 'm1',
        label: 'vegan',
        explanation: 'Please',
      });

      await expect(answer('confirm')).resolves.toEqual({ status: 'confirmed' });

      expect(db.read(`dietaryLabelRemovals/${REMOVAL_ID}`)).toMatchObject({
        status: 'confirmed',
        confirmedAt: NOW.toISOString(),
        decisionReason: 'Supplier changed',
      });
      expect(db.read('menus/menu-1')?.['dietary']).toEqual({
        m1: { labels: ['halal'], removed: { vegan: REMOVAL } },
      });
      expect(db.read('restaurants/r1')?.['dietaryStrikes']).toHaveLength(2);
      expect(db.exists('dietaryLabelVotes/menu__r1__d1')).toBe(true);
      expect(deleteFiles).not.toHaveBeenCalled();
    });

    it('answers gone once the removal is no longer there', async () => {
      await answer('restore');

      await expect(answer('confirm')).resolves.toEqual({ status: 'gone' });
    });

    it('needs an operator, a known decision and a reason', async () => {
      await expect(
        answer('restore', 'Supplier changed', 'owner', ['business']),
      ).rejects.toBeDefined();
      await expect(answer('undo')).rejects.toMatchObject({
        code: 'invalid-argument',
      });
      await expect(answer('restore', ' ')).rejects.toMatchObject({
        code: 'invalid-argument',
      });
      expect(db.read('menus/menu-1')?.['dietary']).toEqual({
        m1: { labels: ['halal'], removed: { vegan: REMOVAL } },
      });
    });
  });
});
