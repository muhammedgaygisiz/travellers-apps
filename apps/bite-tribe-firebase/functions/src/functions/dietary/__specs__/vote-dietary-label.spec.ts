import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;
const creationTimes: Record<string, string> = {};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): unknown => ({
    getUser: async (uid: string): Promise<unknown> => ({
      metadata: { creationTime: creationTimes[uid] },
    }),
  }),
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

jest.mock('../../shared/moderation/content-refusal', () => ({
  recordContentRefusal: jest.fn(),
}));

import { CallableRequest } from 'firebase-functions/https';
import { recordContentRefusal } from '../../shared/moderation/content-refusal';
import {
  deleteDietaryLabelVotesByUser,
  deleteDietaryLabelVotesForBite,
} from '../dietary-votes';
import {
  voteDietaryLabelHandler,
  VoteDietaryLabelRequest,
} from '../vote-dietary-label';

const NOW = new Date('2026-11-26T12:00:00.000Z');
const OLD = '2026-09-01T00:00:00.000Z';
const CREATOR = 'creator';
const OWNER = 'owner';
const DINER = 'diner';
const DINER_2 = 'diner-2';
const BITE = { type: 'bite', biteId: 'b1' };
const DISH = { type: 'menuItem', restaurantId: 'r1', menuItemId: 'm1' };

const as = (
  uid: string,
  data: VoteDietaryLabelRequest,
  provider = 'password',
): CallableRequest<VoteDietaryLabelRequest> =>
  ({
    auth: { uid, token: { firebase: { sign_in_provider: provider } } },
    data,
  }) as unknown as CallableRequest<VoteDietaryLabelRequest>;

const vote = (
  uid: string,
  data: VoteDietaryLabelRequest,
): ReturnType<typeof voteDietaryLabelHandler> =>
  voteDietaryLabelHandler(as(uid, data), NOW);

const eligible = (uid: string): void => {
  creationTimes[uid] = OLD;
  db.seed(`bites/own-${uid}`, { userId: uid, name: 'Own Bite' });
};

/** See GitHub issue #2197. */
describe('voteDietaryLabel', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    Object.keys(creationTimes).forEach((uid) => delete creationTimes[uid]);
    (recordContentRefusal as jest.Mock).mockClear();
    db.seed('bites/b1', {
      userId: CREATOR,
      restaurantId: 'r1',
      dietaryLabels: ['vegan', 'gluten-free'],
    });
    db.seed('restaurants/r1', { ownerUserIds: [OWNER], menuId: 'menu-1' });
    db.seed('menus/menu-1', {
      categories: [
        {
          items: [
            {
              id: 'm1',
              dietaryLabels: ['halal'],
              variants: [{ id: 'v1', dietaryLabels: ['vegan'] }],
            },
          ],
        },
      ],
    });
    [CREATOR, OWNER, DINER, DINER_2].forEach(eligible);
  });

  it('counts a confirmation on a Bite label and keeps the vote', async () => {
    await expect(
      vote(DINER, { target: BITE, label: 'vegan', vote: 'confirm' }),
    ).resolves.toEqual({
      status: 'saved',
      tally: { confirm: 1, dispute: 0 },
    });

    expect(db.read('dietaryLabelTallies/bite__b1')).toMatchObject({
      scopeKey: 'bite__b1',
      biteId: 'b1',
      items: { b1: { vegan: { confirm: 1, dispute: 0 } } },
    });
    expect(db.read(`dietaryLabelVotes/bite__b1__${DINER}`)).toEqual({
      uid: DINER,
      scopeKey: 'bite__b1',
      items: {
        b1: { vegan: { vote: 'confirm', votedAt: NOW.toISOString() } },
      },
    });
  });

  it('replaces a second vote on the same label and moves the counts', async () => {
    await vote(DINER, { target: BITE, label: 'vegan', vote: 'confirm' });
    await vote(DINER_2, { target: BITE, label: 'vegan', vote: 'confirm' });

    await expect(
      vote(DINER, {
        target: BITE,
        label: 'vegan',
        vote: 'dispute',
        reason: 'animal-product',
        note: '  Fish sauce in the dressing. ',
      }),
    ).resolves.toEqual({
      status: 'saved',
      tally: { confirm: 1, dispute: 1 },
    });

    expect(db.read(`dietaryLabelVotes/bite__b1__${DINER}`)?.['items']).toEqual({
      b1: {
        vegan: {
          vote: 'dispute',
          reason: 'animal-product',
          note: 'Fish sauce in the dressing.',
          votedAt: NOW.toISOString(),
        },
      },
    });

    // The same vote again changes nothing in the counts.
    await expect(
      vote(DINER, {
        target: BITE,
        label: 'vegan',
        vote: 'dispute',
        reason: 'other',
      }),
    ).resolves.toEqual({
      status: 'saved',
      tally: { confirm: 1, dispute: 1 },
    });
  });

  it('votes on a dish and on a variant row, in one menu scope', async () => {
    await vote(DINER, { target: DISH, label: 'halal', vote: 'confirm' });
    await vote(DINER, {
      target: { ...DISH, menuItemId: 'v1' },
      label: 'vegan',
      vote: 'dispute',
      reason: 'staff-said-not',
    });

    expect(db.read('dietaryLabelTallies/menu__r1')).toMatchObject({
      restaurantId: 'r1',
      items: {
        m1: { halal: { confirm: 1, dispute: 0 } },
        v1: { vegan: { confirm: 0, dispute: 1 } },
      },
    });
  });

  it.each([
    [CREATOR, BITE, 'vegan', 'own-bite'],
    [OWNER, BITE, 'vegan', 'restaurant-holder'],
    [OWNER, DISH, 'halal', 'restaurant-holder'],
  ])('refuses %s on %j and says why', async (uid, target, label, reason) => {
    await expect(
      vote(uid, { target, label, vote: 'confirm' }),
    ).resolves.toEqual({ status: 'ineligible', reason });

    expect(db.exists('dietaryLabelTallies/bite__b1')).toBe(false);
    expect(db.exists('dietaryLabelTallies/menu__r1')).toBe(false);
  });

  it('refuses an account younger than fourteen days', async () => {
    creationTimes[DINER] = '2026-11-20T00:00:00.000Z';

    await expect(
      vote(DINER, { target: BITE, label: 'vegan', vote: 'confirm' }),
    ).resolves.toEqual({ status: 'ineligible', reason: 'account-too-new' });
  });

  it('refuses an account with no Bite of its own', async () => {
    creationTimes['lurker'] = OLD;

    await expect(
      vote('lurker', { target: BITE, label: 'vegan', vote: 'confirm' }),
    ).resolves.toEqual({ status: 'ineligible', reason: 'no-own-bite' });
  });

  it('refuses a signed-out caller and a table guest', async () => {
    await expect(
      voteDietaryLabelHandler(
        {
          data: { target: BITE, label: 'vegan', vote: 'confirm' },
        } as unknown as CallableRequest<VoteDietaryLabelRequest>,
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(
      voteDietaryLabelHandler(
        as(
          DINER,
          { target: BITE, label: 'vegan', vote: 'confirm' },
          'anonymous',
        ),
        NOW,
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('refuses a label nobody claims on the target', async () => {
    await expect(
      vote(DINER, { target: BITE, label: 'kosher', vote: 'confirm' }),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(
      vote(DINER, { target: DISH, label: 'vegan', vote: 'confirm' }),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('answers a missing Bite or dish as not found', async () => {
    await expect(
      vote(DINER, {
        target: { type: 'bite', biteId: 'gone' },
        label: 'vegan',
        vote: 'confirm',
      }),
    ).rejects.toMatchObject({ code: 'not-found' });
    await expect(
      vote(DINER, {
        target: { ...DISH, menuItemId: 'gone' },
        label: 'halal',
        vote: 'confirm',
      }),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it.each([
    [{ target: { type: 'review' }, label: 'vegan', vote: 'confirm' }],
    [
      {
        target: { type: 'bite', biteId: 'a/b' },
        label: 'vegan',
        vote: 'confirm',
      },
    ],
    [{ target: BITE, label: 'keto', vote: 'confirm' }],
    [{ target: BITE, label: 'vegan', vote: 'maybe' }],
    [{ target: BITE, label: 'vegan', vote: 'dispute' }],
    [{ target: BITE, label: 'vegan', vote: 'dispute', reason: 'meh' }],
    [{ target: BITE, label: 'vegan', vote: 'confirm', note: 42 }],
    [{ target: BITE, label: 'vegan', vote: 'confirm', note: 'x'.repeat(281) }],
  ])('rejects malformed input %j', async (data) => {
    await expect(vote(DINER, data)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('refuses an objectionable note and records nothing', async () => {
    await expect(
      vote(DINER, {
        target: BITE,
        label: 'vegan',
        vote: 'dispute',
        reason: 'other',
        note: 'cunt',
      }),
    ).resolves.toEqual({ status: 'refused', field: 'note' });

    expect(db.exists('dietaryLabelTallies/bite__b1')).toBe(false);
    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({ uid: DINER, surface: 'dietaryVoteNote' }),
    );
  });

  describe('when an account is deleted', () => {
    it('removes its votes and corrects the counts', async () => {
      await vote(DINER, { target: BITE, label: 'vegan', vote: 'confirm' });
      await vote(DINER, {
        target: BITE,
        label: 'gluten-free',
        vote: 'dispute',
        reason: 'gluten',
      });
      await vote(DINER_2, { target: BITE, label: 'vegan', vote: 'confirm' });
      await vote(DINER, { target: DISH, label: 'halal', vote: 'confirm' });

      await expect(
        deleteDietaryLabelVotesByUser(db as never, DINER),
      ).resolves.toBe(3);

      expect(db.exists(`dietaryLabelVotes/bite__b1__${DINER}`)).toBe(false);
      expect(db.exists(`dietaryLabelVotes/menu__r1__${DINER}`)).toBe(false);
      expect(db.read('dietaryLabelTallies/bite__b1')?.['items']).toEqual({
        b1: { vegan: { confirm: 1, dispute: 0 } },
      });
      expect(db.read('dietaryLabelTallies/menu__r1')?.['items']).toEqual({});
    });
  });

  describe('when a Bite is deleted', () => {
    it('removes its counts and every vote on it', async () => {
      await vote(DINER, { target: BITE, label: 'vegan', vote: 'confirm' });
      await vote(DINER, { target: DISH, label: 'halal', vote: 'confirm' });

      await expect(
        deleteDietaryLabelVotesForBite(db as never, 'b1'),
      ).resolves.toBe(1);

      expect(db.exists('dietaryLabelTallies/bite__b1')).toBe(false);
      expect(db.exists(`dietaryLabelVotes/bite__b1__${DINER}`)).toBe(false);
      expect(db.exists(`dietaryLabelVotes/menu__r1__${DINER}`)).toBe(true);
    });
  });
});
