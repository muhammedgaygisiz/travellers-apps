import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import { backfillMenuIds, StoredMenuCategory } from '../shared/utils/menu-ids';

const MENUS_COLLECTION = 'menus';
const WRITE_BATCH_LIMIT = 500;

export interface BackfillMenuItemIdsResult {
  /** Every menu document the migration looked at. */
  processed: number;
  /** Menus that gained at least one id. */
  updated: number;
  /** Menus that already had an id on everything. */
  skipped: number;
  /** Categories that gained an id, across every menu. */
  categories: number;
  /** Items and variants that gained an id, counted together. */
  items: number;
}

/**
 * One-off migration that gives every stored category, menu item and variant the
 * stable id an order line references (issue #1099).
 *
 * Menus written before this carry no ids at all, which is not a cosmetic gap:
 * until it is closed, the only way to name a menu item is its name and its
 * position in an array, and both move in the ordinary course of running a
 * restaurant. Nothing in the table-ordering epic can reference an item until
 * this has run.
 *
 * Idempotent, like every collection migration on the admin surface: an id that
 * already exists is never replaced, so a second press reports zeroes and writes
 * nothing. Replacing one would be worse than never adding one - it would move
 * the target of every order line already pointing at it.
 *
 * Only the `categories` field is written back. A whole-document rewrite would
 * carry `restaurantId` and the timestamps through a read-modify-write for no
 * reason, and a menu edited by its owner while this runs would lose that edit.
 * The timestamps are deliberately left alone too: an id is not a change the
 * owner made, and touching `updatedAt` would tell every reader the menu was
 * edited on the day an operator pressed a button.
 */
export const backfillMenuItemIds =
  async (): Promise<BackfillMenuItemIdsResult> => {
    const db = getFirestore();
    const menusSnapshot = await db.collection(MENUS_COLLECTION).get();

    let batch = db.batch();
    let batchSize = 0;
    let updated = 0;
    let skipped = 0;
    let categories = 0;
    let items = 0;

    for (const menuDoc of menusSnapshot.docs) {
      const stored = menuDoc.data()['categories'];
      const backfill = backfillMenuIds(
        Array.isArray(stored) ? (stored as StoredMenuCategory[]) : undefined,
      );

      if (!backfill.categoriesFilled && !backfill.itemsFilled) {
        skipped++;
        continue;
      }

      batch.update(menuDoc.ref, { categories: backfill.categories });
      batchSize++;
      updated++;
      categories += backfill.categoriesFilled;
      items += backfill.itemsFilled;

      if (batchSize === WRITE_BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    const result: BackfillMenuItemIdsResult = {
      processed: menusSnapshot.size,
      updated,
      skipped,
      categories,
      items,
    };

    logger.info('backfillMenuItemIds: complete', result);

    return result;
  };

/**
 * Runs the menu id migration.
 *
 * Operator-only: it rewrites the categories of every menu in the collection,
 * and the only surface that offers it is the admin migrations area
 * (issue #1472).
 */
export const backfillMenuItemIdsHandler = async (
  request: CallableRequest<void>,
): Promise<BackfillMenuItemIdsResult> => {
  requireAdmin(request);

  // No `targetId`: the migration rewrites the whole collection rather than one
  // menu, so the record of what it touched is the counts it returns.
  logOperatorAction(request, {
    action: 'backfillMenuItemIds',
    targetType: 'menu',
    outcome: 'started',
  });

  const result = await backfillMenuItemIds();

  logOperatorAction(request, {
    action: 'backfillMenuItemIds',
    targetType: 'menu',
    outcome: 'succeeded',
    details: { ...result },
  });

  return result;
};

export const backfillMenuItemIdsCallable = onAppCheck<void>(
  backfillMenuItemIdsHandler,
);
