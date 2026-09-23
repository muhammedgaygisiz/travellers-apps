import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from 'firebase-functions/firestore';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import { RESTAURANT_COLLECTION } from './restaurant-authority';
import {
  MENU_ITEM_STATS_COLLECTION,
  StatsDelta,
  addStatsDeltas,
  biteMenuLink,
  movesStats,
  statsDeltaFor,
} from './menu-item-stats';

/**
 * Keeps each dish's Bite count and rating up to date (GitHub issue #1113).
 *
 * ## Why increments rather than a recount
 *
 * A trigger that recomputed an aggregate would read every Bite of that dish to
 * add one, on every Bite ever written. `FieldValue.increment` is one write and
 * is atomic across concurrent Bites, which matters more here than it looks:
 * two people at one table rating the same Margherita in the same second is the
 * ordinary case at a restaurant, not a race worth engineering around
 * separately.
 *
 * What increments cannot do is **repair**. A missed event, an exception in the
 * middle, a Bite written by a migration that bypassed the trigger - each
 * leaves a number that is wrong and stays wrong. That is what
 * `recomputeMenuItemStats` is for, and why the issue asks for a resync rather
 * than trusting this file.
 *
 * ## Three triggers and one piece of arithmetic
 *
 * Create, delete and update, all of them `statsDeltaFor` with a sign. An edit
 * is the delete of what the Bite was plus the create of what it became, added
 * together - so a guest who changes a rating from 3 to 5 produces one write of
 * `+2`, and one who moves a Bite from one dish to another correctly takes a
 * count off the first and puts it on the second.
 *
 * ## Why an unlinked Bite is not an error
 *
 * Most Bites name no menu item: somebody typed the dish. `biteMenuLink`
 * answers `undefined` and the delta is zero, which is the ordinary path
 * through this file rather than a guard against a bad one.
 */

const applyDelta = async (
  firestore: Firestore,
  restaurantId: string,
  menuItemId: string,
  delta: StatsDelta,
): Promise<void> => {
  if (!movesStats(delta)) {
    return;
  }

  await firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(MENU_ITEM_STATS_COLLECTION)
    .doc(menuItemId)
    .set(
      {
        id: menuItemId,
        restaurantId,
        biteCount: FieldValue.increment(delta.biteCount),
        ratingCount: FieldValue.increment(delta.ratingCount),
        ratingSum: FieldValue.increment(delta.ratingSum),
        updatedAt: Date.now(),
      },
      // Merged, because the first Bite of a dish creates the document and
      // every later one adds to it. `increment` on a field that is not there
      // starts from zero, so there is no seeding step to forget.
      { merge: true },
    );
};

/** The shared body, so the three triggers are three signatures and one rule. */
export const applyBiteToMenuItemStats = async (
  before: DocumentData | undefined,
  after: DocumentData | undefined,
): Promise<void> => {
  const firestore = getFirestore();
  const was = biteMenuLink(before);
  const is = biteMenuLink(after);

  if (!was && !is) {
    return;
  }

  // Moved from one dish to another: two documents, two writes. Adding the
  // deltas would otherwise net a move to zero and leave both counts wrong.
  if (was && is && was.menuItemId !== is.menuItemId) {
    await Promise.all([
      applyDelta(
        firestore,
        was.restaurantId,
        was.menuItemId,
        statsDeltaFor(was, -1),
      ),
      applyDelta(
        firestore,
        is.restaurantId,
        is.menuItemId,
        statsDeltaFor(is, 1),
      ),
    ]);

    return;
  }

  const link = is ?? was;

  if (!link) {
    return;
  }

  await applyDelta(
    firestore,
    link.restaurantId,
    link.menuItemId,
    addStatsDeltas(statsDeltaFor(was, -1), statsDeltaFor(is, 1)),
  );
};

export const countBiteOnMenuItem = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    await applyBiteToMenuItemStats(undefined, event.data?.data());
  },
);

export const recountBiteOnMenuItem = onDocumentUpdated(
  'bites/{biteId}',
  async (event) => {
    await applyBiteToMenuItemStats(
      event.data?.before.data(),
      event.data?.after.data(),
    );
  },
);

export const discountBiteOnMenuItem = onDocumentDeleted(
  'bites/{biteId}',
  async (event) => {
    await applyBiteToMenuItemStats(event.data?.data(), undefined);
  },
);

/**
 * Recomputes every dish's aggregate from the Bites themselves.
 *
 * The repair the increments above cannot do, and the acceptance criterion the
 * issue states as "aggregates are consistent with the underlying Bites after a
 * resync". Run from the admin app's migrations surface rather than on a
 * schedule: a nightly recount would pay the full cost every night to fix
 * something that should not drift, and a number that is wrong is wrong until
 * somebody notices either way.
 *
 * It reads every Bite that names a menu item, which is bounded by how many
 * Bites came from a menu rather than by how many Bites exist - and writes one
 * document per dish that has any. **Dishes whose Bites have all gone are not
 * zeroed**, because this walks the Bites rather than the menus: a dish with no
 * Bites left keeps whatever it last had. Deleting those is a separate sweep
 * and is not what "consistent with the underlying Bites" asks for.
 */
export const recomputeMenuItemStats = async (): Promise<number> => {
  const firestore = getFirestore();
  const bites = await firestore
    .collection('bites')
    .where('menuItemId', '!=', null)
    .get();

  const totals = new Map<string, StatsDelta & { restaurantId: string }>();

  for (const document of bites.docs) {
    const link = biteMenuLink(document.data());

    if (!link) {
      continue;
    }

    const key = `${link.restaurantId}/${link.menuItemId}`;
    const running = totals.get(key) ?? {
      restaurantId: link.restaurantId,
      biteCount: 0,
      ratingCount: 0,
      ratingSum: 0,
    };
    const delta = statsDeltaFor(link, 1);

    totals.set(key, {
      restaurantId: link.restaurantId,
      biteCount: running.biteCount + delta.biteCount,
      ratingCount: running.ratingCount + delta.ratingCount,
      ratingSum: running.ratingSum + delta.ratingSum,
    });
  }

  const batch = firestore.batch();
  const at = Date.now();

  for (const [key, totalsForItem] of totals) {
    const menuItemId = key.slice(key.indexOf('/') + 1);

    batch.set(
      firestore
        .collection(RESTAURANT_COLLECTION)
        .doc(totalsForItem.restaurantId)
        .collection(MENU_ITEM_STATS_COLLECTION)
        .doc(menuItemId),
      {
        id: menuItemId,
        restaurantId: totalsForItem.restaurantId,
        biteCount: totalsForItem.biteCount,
        ratingCount: totalsForItem.ratingCount,
        ratingSum: totalsForItem.ratingSum,
        updatedAt: at,
      },
      // Replaced rather than merged: a recompute is the authority, and merging
      // would leave a drifted count in place wherever the recount happened to
      // agree about the other two fields.
      { merge: false },
    );
  }

  await batch.commit();

  logger.info('menu item stats recomputed', {
    dishes: totals.size,
    bites: bites.size,
  });

  return totals.size;
};

/**
 * The migration an operator runs from the admin app.
 *
 * `requireAdmin`, because a recompute rewrites an aggregate over every
 * account's Bites and is the kind of thing that should leave a name in the
 * operator log beside it. It takes no arguments: there is one right answer
 * for the whole workspace, and a per-restaurant variant would invite running
 * it on the one restaurant somebody happened to be looking at while the rest
 * stayed wrong.
 */
export interface RecomputeMenuItemStatsResult {
  /** How many dishes now have an aggregate. */
  dishes: number;
}

export const recomputeMenuItemStatsAsOperator = onAppCheck<
  unknown,
  Promise<RecomputeMenuItemStatsResult>
>(async (request) => {
  requireAdmin(request);

  // No `targetId`: the migration rewrites every restaurant's aggregates rather
  // than one, so what it touched is the count it returns - the same shape
  // `backfillMenuItemIds` settled on. `started` and `succeeded` bracket it
  // because it reads every linked Bite and can time out halfway, and a
  // `started` with no `succeeded` is exactly what an audit trail should show.
  logOperatorAction(request, {
    action: 'recomputeMenuItemStats',
    targetType: 'menu',
    outcome: 'started',
  });

  const dishes = await recomputeMenuItemStats();

  logOperatorAction(request, {
    action: 'recomputeMenuItemStats',
    targetType: 'menu',
    outcome: 'succeeded',
  });

  return { dishes };
});
