import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import {
  applyBiteToMenuItemStats,
  recomputeMenuItemStats,
} from '../maintain-menu-item-stats';

/**
 * What people thought of one dish (GitHub issue #1113).
 *
 * The triggers are exercised through `applyBiteToMenuItemStats` rather than by
 * writing Bites: the Firestore emulator runs without the functions emulator in
 * this suite, so a trigger reachable only by writing a document could not be
 * tested at all. The wrapper adds nothing but the event shape.
 *
 * What is in doubt is the arithmetic under concurrency and at the edges - a
 * Bite with no rating, a rating changed, a Bite moved from one dish to
 * another, and the recompute that exists because increments cannot repair.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const RESTAURANT = 'owned-restaurant';
const OTHER_RESTAURANT = 'other-restaurant';
const MARGHERITA = 'item-margherita';
const TIRAMISU = 'item-tiramisu';

const bite = (extra: Record<string, unknown> = {}): DocumentData => ({
  id: 'bite-1',
  userId: 'guest-alice',
  name: 'Margherita',
  restaurantId: RESTAURANT,
  menuItemId: MARGHERITA,
  ...extra,
});

const readStats = async (
  menuItemId = MARGHERITA,
  restaurantId = RESTAURANT,
): Promise<DocumentData | undefined> =>
  (
    await getFirestore()
      .collection('restaurants')
      .doc(restaurantId)
      .collection('menuItemStats')
      .doc(menuItemId)
      .get()
  ).data();

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all([
    db.recursiveDelete(db.collection('restaurants')),
    db.recursiveDelete(db.collection('bites')),
  ]);
};

describe('menu item stats', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error('menu item stats specs require the Firestore emulator.');
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(clear);

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  describe('counting', () => {
    it('counts the first Bite of a dish, creating the document', async () => {
      await applyBiteToMenuItemStats(undefined, bite({ rating: 4 }));

      expect(await readStats()).toMatchObject({
        id: MARGHERITA,
        restaurantId: RESTAURANT,
        biteCount: 1,
        ratingCount: 1,
        ratingSum: 4,
      });
    });

    /**
     * Two counts, and this is why. Most of the interesting Bites have a photo
     * and no number, and folding them would overstate how many people rated a
     * dish.
     */
    it('counts a Bite with no rating as a Bite and not as a rating', async () => {
      await applyBiteToMenuItemStats(undefined, bite());

      expect(await readStats()).toMatchObject({
        biteCount: 1,
        ratingCount: 0,
        ratingSum: 0,
      });
    });

    it('adds up several Bites of one dish', async () => {
      await applyBiteToMenuItemStats(undefined, bite({ rating: 5 }));
      await applyBiteToMenuItemStats(undefined, bite({ rating: 3 }));
      await applyBiteToMenuItemStats(undefined, bite());

      expect(await readStats()).toMatchObject({
        biteCount: 3,
        ratingCount: 2,
        ratingSum: 8,
      });
    });

    /** Most Bites name no dish, which is the ordinary path rather than a guard. */
    it('ignores a Bite that names no menu item', async () => {
      await applyBiteToMenuItemStats(
        undefined,
        bite({ menuItemId: undefined, rating: 5 }),
      );

      expect(await readStats()).toBeUndefined();
    });

    it('ignores a Bite that names no restaurant', async () => {
      await applyBiteToMenuItemStats(
        undefined,
        bite({ restaurantId: undefined }),
      );

      expect(await readStats()).toBeUndefined();
    });
  });

  describe('editing and removing', () => {
    it('takes a deleted Bite back off the count', async () => {
      await applyBiteToMenuItemStats(undefined, bite({ rating: 4 }));
      await applyBiteToMenuItemStats(bite({ rating: 4 }), undefined);

      expect(await readStats()).toMatchObject({
        biteCount: 0,
        ratingCount: 0,
        ratingSum: 0,
      });
    });

    /** One write of `+2`, rather than a recount. */
    it('moves the sum when a rating changes', async () => {
      await applyBiteToMenuItemStats(undefined, bite({ rating: 3 }));
      await applyBiteToMenuItemStats(bite({ rating: 3 }), bite({ rating: 5 }));

      expect(await readStats()).toMatchObject({
        biteCount: 1,
        ratingCount: 1,
        ratingSum: 5,
      });
    });

    it('counts a rating added to a Bite that had none', async () => {
      await applyBiteToMenuItemStats(undefined, bite());
      await applyBiteToMenuItemStats(bite(), bite({ rating: 4 }));

      expect(await readStats()).toMatchObject({
        biteCount: 1,
        ratingCount: 1,
        ratingSum: 4,
      });
    });

    it('drops a rating removed from a Bite', async () => {
      await applyBiteToMenuItemStats(undefined, bite({ rating: 4 }));
      await applyBiteToMenuItemStats(bite({ rating: 4 }), bite());

      expect(await readStats()).toMatchObject({
        biteCount: 1,
        ratingCount: 0,
        ratingSum: 0,
      });
    });

    /**
     * Two documents and two writes. Adding the deltas would net the move to
     * zero and leave both dishes wrong.
     */
    it('moves a Bite from one dish to another', async () => {
      await applyBiteToMenuItemStats(undefined, bite({ rating: 4 }));
      await applyBiteToMenuItemStats(
        bite({ rating: 4 }),
        bite({ menuItemId: TIRAMISU, rating: 4 }),
      );

      expect(await readStats(MARGHERITA)).toMatchObject({
        biteCount: 0,
        ratingSum: 0,
      });
      expect(await readStats(TIRAMISU)).toMatchObject({
        biteCount: 1,
        ratingSum: 4,
      });
    });

    it('does nothing for an edit that touched neither the dish nor the rating', async () => {
      await applyBiteToMenuItemStats(undefined, bite({ rating: 4 }));
      const before = await readStats();

      await applyBiteToMenuItemStats(
        bite({ rating: 4 }),
        bite({ rating: 4, description: 'changed the comment' }),
      );

      expect((await readStats())?.['updatedAt']).toBe(before?.['updatedAt']);
    });
  });

  describe('the recompute', () => {
    const storeBite = async (
      id: string,
      extra: Record<string, unknown> = {},
    ): Promise<void> => {
      await getFirestore()
        .collection('bites')
        .doc(id)
        .set(bite({ id, ...extra }));
    };

    /** The repair the increments cannot do. */
    it('rebuilds an aggregate that had drifted', async () => {
      await storeBite('bite-1', { rating: 5 });
      await storeBite('bite-2', { rating: 3 });

      await getFirestore()
        .collection('restaurants')
        .doc(RESTAURANT)
        .collection('menuItemStats')
        .doc(MARGHERITA)
        .set({
          id: MARGHERITA,
          restaurantId: RESTAURANT,
          biteCount: 99,
          ratingCount: 99,
          ratingSum: 99,
          updatedAt: 1,
        });

      await recomputeMenuItemStats();

      expect(await readStats()).toMatchObject({
        biteCount: 2,
        ratingCount: 2,
        ratingSum: 8,
      });
    });

    it('builds an aggregate that was never there', async () => {
      await storeBite('bite-1', { rating: 4 });

      await recomputeMenuItemStats();

      expect(await readStats()).toMatchObject({ biteCount: 1, ratingSum: 4 });
    });

    it('keeps each restaurant to itself', async () => {
      await storeBite('bite-1', { rating: 5 });
      await storeBite('bite-2', {
        restaurantId: OTHER_RESTAURANT,
        rating: 1,
      });

      await recomputeMenuItemStats();

      expect(await readStats(MARGHERITA, RESTAURANT)).toMatchObject({
        biteCount: 1,
        ratingSum: 5,
      });
      expect(await readStats(MARGHERITA, OTHER_RESTAURANT)).toMatchObject({
        biteCount: 1,
        ratingSum: 1,
      });
    });

    it('counts Bites with no rating', async () => {
      await storeBite('bite-1', { rating: 4 });
      await storeBite('bite-2');

      await recomputeMenuItemStats();

      expect(await readStats()).toMatchObject({
        biteCount: 2,
        ratingCount: 1,
        ratingSum: 4,
      });
    });
  });
});
