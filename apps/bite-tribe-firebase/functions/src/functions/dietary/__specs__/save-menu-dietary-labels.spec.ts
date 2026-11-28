import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
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
import {
  answerDietaryLabelApprovalHandler,
  AnswerDietaryLabelApprovalRequest,
} from '../answer-dietary-label-approval';
import { listDietaryLabelApprovalsHandler } from '../list-dietary-label-approvals';
import {
  saveMenuDietaryLabelsHandler,
  SaveMenuDietaryLabelsRequest,
} from '../save-menu-dietary-labels';

const NOW = new Date('2026-11-27T12:00:00.000Z');
const REMOVAL = {
  removedAt: '2026-11-20T00:00:00.000Z',
  disputes: 3,
  confirmations: 0,
  reasons: {},
};

const as = <T>(uid: string, roles: string[], data: T): CallableRequest<T> =>
  ({
    auth: {
      uid,
      token: { roles, firebase: { sign_in_provider: 'password' } },
    },
    data,
  }) as unknown as CallableRequest<T>;

const save = (
  data: SaveMenuDietaryLabelsRequest,
  uid = 'owner',
  roles = ['business'],
): ReturnType<typeof saveMenuDietaryLabelsHandler> =>
  saveMenuDietaryLabelsHandler(as(uid, roles, data), NOW);

const answer = (
  data: AnswerDietaryLabelApprovalRequest,
): ReturnType<typeof answerDietaryLabelApprovalHandler> =>
  answerDietaryLabelApprovalHandler(as('op', ['admin'], data), NOW);

const strikes = (
  count: number,
): { menuItemId: string; label: string; removedAt: string }[] =>
  Array.from({ length: count }, (_, index) => ({
    menuItemId: `old-${index}`,
    label: 'vegan',
    removedAt: '2026-10-01T00:00:00.000Z',
  }));

/** See GitHub issue #2198. */
describe('saveMenuDietaryLabels', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed('restaurants/r1', {
      name: 'Thai Garden',
      ownerUserIds: ['owner'],
      menuId: 'menu-1',
    });
    db.seed('menus/menu-1', {
      categories: [
        {
          items: [
            {
              id: 'm1',
              name: 'Pad Thai',
              dietaryLabels: ['vegetarian'],
              variants: [{ id: 'v1', name: 'Tofu' }],
            },
            { id: 'm2', name: 'Rice' },
          ],
        },
      ],
    });
  });

  it('publishes the labels into the menu map, the only place readers take them from', async () => {
    await expect(
      save({
        restaurantId: 'r1',
        items: {
          m1: { labels: ['vegan'], options: [] },
          v1: { labels: [], options: ['gluten-free'] },
          gone: { labels: ['halal'], options: [] },
        },
      }),
    ).resolves.toEqual({ status: 'saved', locked: [], pending: [] });

    expect(db.read('menus/menu-1')?.['dietary']).toEqual({
      m1: { labels: ['vegan'] },
      v1: { options: ['gluten-free'] },
    });
  });

  it('keeps a dish the request does not name as it was', async () => {
    await save({
      restaurantId: 'r1',
      items: { m2: { labels: ['vegan'], options: [] } },
    });

    expect(db.read('menus/menu-1')?.['dietary']).toEqual({
      m1: { labels: ['vegetarian'] },
      m2: { labels: ['vegan'] },
    });
  });

  it('refuses a removed label as a label or an option, and keeps the removal', async () => {
    db.seed('menus/menu-1', {
      ...db.read('menus/menu-1'),
      dietary: { m1: { removed: { vegan: REMOVAL } } },
    });

    await expect(
      save({
        restaurantId: 'r1',
        items: {
          m1: { labels: ['vegan', 'halal'], options: [] },
          v1: { labels: [], options: [] },
        },
      }),
    ).resolves.toMatchObject({
      locked: [{ menuItemId: 'm1', label: 'vegan', kind: 'label' }],
    });
    expect(db.read('menus/menu-1')?.['dietary']).toEqual({
      m1: { labels: ['halal'], removed: { vegan: REMOVAL } },
    });

    await expect(
      save({
        restaurantId: 'r1',
        items: { m1: { labels: [], options: ['vegan'] } },
      }),
    ).resolves.toMatchObject({
      locked: [{ menuItemId: 'm1', label: 'vegan', kind: 'option' }],
    });
  });

  it('holds a new label for an operator at the strike limit, and keeps the published ones', async () => {
    db.seed('restaurants/r1', {
      ...db.read('restaurants/r1'),
      dietaryStrikes: strikes(3),
    });

    await expect(
      save({
        restaurantId: 'r1',
        items: { m1: { labels: ['vegetarian', 'vegan'], options: [] } },
      }),
    ).resolves.toMatchObject({
      pending: [{ menuItemId: 'm1', label: 'vegan', kind: 'label' }],
    });
    expect(db.read('menus/menu-1')?.['dietary']).toEqual({
      m1: { labels: ['vegetarian'] },
    });
    expect(db.read('dietaryLabelApprovals/r1')).toEqual({
      restaurantId: 'r1',
      restaurantName: 'Thai Garden',
      items: { m1: { name: 'Pad Thai', labels: ['vegan'] } },
      requestedAt: NOW.toISOString(),
    });
  });

  it('does not hold labels below the limit, nor an operator’s own save', async () => {
    db.seed('restaurants/r1', {
      ...db.read('restaurants/r1'),
      dietaryStrikes: strikes(2),
    });
    await expect(
      save({
        restaurantId: 'r1',
        items: { m1: { labels: ['vegan'], options: [] } },
      }),
    ).resolves.toMatchObject({ pending: [] });

    db.seed('restaurants/r1', {
      ...db.read('restaurants/r1'),
      dietaryStrikes: strikes(3),
    });
    await expect(
      save(
        {
          restaurantId: 'r1',
          items: { m1: { labels: ['vegan', 'halal'], options: [] } },
        },
        'op',
        ['admin'],
      ),
    ).resolves.toMatchObject({ pending: [] });
  });

  it('refuses an account that does not hold the restaurant, and an unknown label', async () => {
    await expect(
      save({ restaurantId: 'r1', items: {} }, 'stranger'),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(
      save({
        restaurantId: 'r1',
        items: { m1: { labels: ['paleo'] } },
      } as never),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

describe('dietary label approvals', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed('restaurants/r1', { ownerUserIds: ['owner'], menuId: 'menu-1' });
    db.seed('menus/menu-1', {
      categories: [{ items: [{ id: 'm1', name: 'Pad Thai' }] }],
      dietary: { m1: { labels: ['vegetarian'] } },
    });
    db.seed('dietaryLabelApprovals/r1', {
      restaurantId: 'r1',
      restaurantName: 'Thai Garden',
      items: { m1: { name: 'Pad Thai', labels: ['vegan', 'halal'] } },
      requestedAt: '2026-11-26T00:00:00.000Z',
    });
  });

  const request = (
    label: string,
    approve: boolean,
  ): Record<string, unknown> => ({
    restaurantId: 'r1',
    menuItemId: 'm1',
    label,
    kind: 'label',
    approve,
  });

  it('lists the queue for an operator only', async () => {
    await expect(
      listDietaryLabelApprovalsHandler(as('op', ['admin'], {})),
    ).resolves.toEqual({
      approvals: [
        {
          restaurantId: 'r1',
          restaurantName: 'Thai Garden',
          requestedAt: '2026-11-26T00:00:00.000Z',
          items: [
            {
              menuItemId: 'm1',
              name: 'Pad Thai',
              labels: ['vegan', 'halal'],
              options: [],
            },
          ],
        },
      ],
    });
    await expect(
      listDietaryLabelApprovalsHandler(as('owner', ['business'], {})),
    ).rejects.toBeDefined();
  });

  it('publishes an approved label and drops a refused one', async () => {
    await expect(answer(request('vegan', true) as never)).resolves.toEqual({
      status: 'approved',
    });
    expect(db.read('menus/menu-1')?.['dietary']).toEqual({
      m1: { labels: ['vegan', 'vegetarian'] },
    });

    await expect(answer(request('halal', false) as never)).resolves.toEqual({
      status: 'refused',
    });
    expect(db.read('menus/menu-1')?.['dietary']).toEqual({
      m1: { labels: ['vegan', 'vegetarian'] },
    });
    expect(db.read('dietaryLabelApprovals/r1')).toBeUndefined();
  });

  it('answers gone for a label no longer waiting, or removed meanwhile', async () => {
    await expect(answer(request('kosher', true) as never)).resolves.toEqual({
      status: 'gone',
    });

    db.seed('menus/menu-1', {
      ...db.read('menus/menu-1'),
      dietary: { m1: { removed: { vegan: REMOVAL } } },
    });
    await expect(answer(request('vegan', true) as never)).resolves.toEqual({
      status: 'gone',
    });
    expect(db.read('dietaryLabelApprovals/r1')?.['items']).toEqual({
      m1: { name: 'Pad Thai', labels: ['halal'] },
    });
  });
});
