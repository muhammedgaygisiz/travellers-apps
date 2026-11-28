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
  HttpsError: class extends Error {},
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentWritten: jest.fn((_path: string, handler: unknown) => handler),
}));

jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: jest.fn(async () => undefined),
}));

import { sendLocalizedNotification } from '../../shared/utils/send-localized-notification';
import {
  disputeEvidenceOf,
  handleDietaryTallyWrite,
  reachesRemoval,
} from '../remove-disputed-dietary-labels';

const NOW = new Date('2026-11-27T12:00:00.000Z');
const RECENT = '2026-11-20T00:00:00.000Z';
const STALE = '2026-07-01T00:00:00.000Z';
const SCOPE = 'menu__r1';

const send = sendLocalizedNotification as jest.Mock;

const tallies = (
  labels: Record<string, { confirm: number; dispute: number }>,
): Record<string, unknown> => ({ scopeKey: SCOPE, items: { m1: labels } });

const seedDispute = (
  uid: string,
  label: string,
  reason = 'animal-product',
  votedAt = RECENT,
): void =>
  db.seed(`dietaryLabelVotes/${SCOPE}__${uid}`, {
    uid,
    scopeKey: SCOPE,
    items: { m1: { [label]: { vote: 'dispute', reason, votedAt } } },
  });

/** See GitHub issue #2198. */
describe('removeDisputedDietaryLabels', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    send.mockClear();
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
              dietaryLabels: ['vegan', 'halal'],
            },
          ],
        },
      ],
    });
  });

  it('removes a lifestyle label at three disputes in the window, and locks it', async () => {
    ['d1', 'd2', 'd3'].forEach((uid) => seedDispute(uid, 'vegan'));

    const result = await handleDietaryTallyWrite(
      SCOPE,
      tallies({ vegan: { confirm: 1, dispute: 2 } }),
      tallies({ vegan: { confirm: 1, dispute: 3 } }),
      NOW,
    );

    expect(result.removed).toEqual([{ menuItemId: 'm1', label: 'vegan' }]);
    expect(db.read('menus/menu-1')?.['dietary']).toEqual({
      m1: {
        labels: ['halal'],
        removed: {
          vegan: {
            removedAt: NOW.toISOString(),
            disputes: 3,
            confirmations: 1,
            reasons: { 'animal-product': 3 },
          },
        },
      },
    });
    expect(db.read('restaurants/r1')?.['dietaryStrikes']).toEqual([
      { menuItemId: 'm1', label: 'vegan', removedAt: NOW.toISOString() },
    ]);
    // The operator's queue item (issue #2199).
    expect(db.read('dietaryLabelRemovals/r1__m1__vegan')).toMatchObject({
      restaurantId: 'r1',
      restaurantName: 'Thai Garden',
      menuItemId: 'm1',
      dishName: 'Pad Thai',
      label: 'vegan',
      disputes: 3,
      confirmations: 1,
      status: 'open',
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({
      uids: ['owner'],
      data: {
        type: 'DIETARY_LABEL_REMOVED',
        restaurantId: 'r1',
        menuItemId: 'm1',
        label: 'vegan',
      },
    });
  });

  it('keeps a lifestyle label at two disputes', async () => {
    ['d1', 'd2'].forEach((uid) => seedDispute(uid, 'vegan'));

    const result = await handleDietaryTallyWrite(
      SCOPE,
      tallies({ vegan: { confirm: 0, dispute: 1 } }),
      tallies({ vegan: { confirm: 0, dispute: 2 } }),
      NOW,
    );

    expect(result.removed).toEqual([]);
    expect(db.read('menus/menu-1')?.['dietary']).toBeUndefined();
  });

  it('removes a high-risk label at its lower threshold of two', async () => {
    ['d1', 'd2'].forEach((uid) => seedDispute(uid, 'halal'));

    const result = await handleDietaryTallyWrite(
      SCOPE,
      tallies({ halal: { confirm: 0, dispute: 1 } }),
      tallies({ halal: { confirm: 0, dispute: 2 } }),
      NOW,
    );

    expect(result.removed).toEqual([{ menuItemId: 'm1', label: 'halal' }]);
  });

  it('removes a high-risk label at a single "I got sick", and says so once', async () => {
    seedDispute('d1', 'halal', 'got-sick');

    const result = await handleDietaryTallyWrite(
      SCOPE,
      undefined,
      tallies({ halal: { confirm: 0, dispute: 1 } }),
      NOW,
    );

    expect(result).toEqual({
      removed: [{ menuItemId: 'm1', label: 'halal' }],
      firstDisputes: [],
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].data.type).toBe('DIETARY_LABEL_REMOVED');
  });

  it('does not remove while confirmations keep up with disputes', async () => {
    ['d1', 'd2', 'd3'].forEach((uid) => seedDispute(uid, 'vegan'));

    const result = await handleDietaryTallyWrite(
      SCOPE,
      tallies({ vegan: { confirm: 3, dispute: 2 } }),
      tallies({ vegan: { confirm: 3, dispute: 3 } }),
      NOW,
    );

    expect(result.removed).toEqual([]);
  });

  it('counts only disputes inside the 90-day window', async () => {
    seedDispute('d1', 'vegan');
    seedDispute('d2', 'vegan', 'other', STALE);
    seedDispute('d3', 'vegan');

    const result = await handleDietaryTallyWrite(
      SCOPE,
      tallies({ vegan: { confirm: 0, dispute: 2 } }),
      tallies({ vegan: { confirm: 0, dispute: 3 } }),
      NOW,
    );

    expect(result.removed).toEqual([]);
  });

  it('tells the owner about the first dispute', async () => {
    seedDispute('d1', 'vegan');

    const result = await handleDietaryTallyWrite(
      SCOPE,
      undefined,
      tallies({ vegan: { confirm: 0, dispute: 1 } }),
      NOW,
    );

    expect(result.firstDisputes).toEqual([
      { menuItemId: 'm1', label: 'vegan' },
    ]);
    expect(send.mock.calls[0][0].data).toEqual({
      type: 'DIETARY_LABEL_DISPUTED',
      restaurantId: 'r1',
      menuItemId: 'm1',
      label: 'vegan',
    });
    const translate = jest.fn((key: string) => key);
    send.mock.calls[0][0].buildMessage(translate);
    expect(translate).toHaveBeenCalledWith('dietaryLabelDisputed.body', {
      dish: 'Pad Thai',
      restaurant: 'Thai Garden',
    });
  });

  it('removes nothing twice when the event is delivered again', async () => {
    ['d1', 'd2', 'd3'].forEach((uid) => seedDispute(uid, 'vegan'));
    const write = (): ReturnType<typeof handleDietaryTallyWrite> =>
      handleDietaryTallyWrite(
        SCOPE,
        tallies({ vegan: { confirm: 0, dispute: 2 } }),
        tallies({ vegan: { confirm: 0, dispute: 3 } }),
        NOW,
      );

    await write();
    const again = await write();

    expect(again.removed).toEqual([]);
    expect(db.read('restaurants/r1')?.['dietaryStrikes']).toHaveLength(1);
  });

  it('ignores Bite scopes, and a write that disputes nothing more', async () => {
    await expect(
      handleDietaryTallyWrite('bite__b1', undefined, { items: {} }, NOW),
    ).resolves.toEqual({ removed: [], firstDisputes: [] });
    await expect(
      handleDietaryTallyWrite(
        SCOPE,
        tallies({ vegan: { confirm: 0, dispute: 2 } }),
        tallies({ vegan: { confirm: 1, dispute: 2 } }),
        NOW,
      ),
    ).resolves.toEqual({ removed: [], firstDisputes: [] });
    expect(send).not.toHaveBeenCalled();
  });

  it('counts one dispute per account and names the reasons', () => {
    const votes = [
      {
        items: {
          m1: { vegan: { vote: 'dispute', reason: 'gluten', votedAt: RECENT } },
        },
      },
      { items: { m1: { vegan: { vote: 'confirm', votedAt: RECENT } } } },
    ];

    expect(disputeEvidenceOf(votes, 'm1', 'vegan', NOW)).toEqual({
      disputes: 1,
      gotSick: 0,
      reasons: { gluten: 1 },
    });
    expect(
      reachesRemoval(
        'vegan',
        { confirm: 0, dispute: 3 },
        { disputes: 3, gotSick: 0, reasons: {} },
      ),
    ).toBe(true);
    expect(
      reachesRemoval(
        'vegan',
        { confirm: 0, dispute: 1 },
        { disputes: 1, gotSick: 1, reasons: {} },
      ),
    ).toBe(false);
  });
});
