import {
  DocumentData,
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import { RESTAURANT_COLLECTION } from './restaurant-authority';

export interface MigrateRestaurantOwnerIdsResult {
  /** Every restaurant document the migration looked at. */
  processed: number;
  /** Restaurants whose `ownerUserId` was moved into `ownerUserIds`. */
  migrated: number;
  /** Restaurants already in the new shape, or never held. */
  skipped: number;
  /** Restaurants left alone because the two fields disagree. */
  conflicting: number;
  /** The ids behind `conflicting`, so an operator can look at each one. */
  conflicts: string[];
}

type Decision =
  | { kind: 'skip' }
  | { kind: 'conflict' }
  | { kind: 'migrate'; write: Record<string, unknown> };

const ownerSetOf = (data: DocumentData): unknown[] | undefined =>
  Array.isArray(data['ownerUserIds'])
    ? (data['ownerUserIds'] as unknown[])
    : undefined;

/**
 * What to do with one restaurant, decided from the document alone.
 *
 * - No `ownerUserId` field at all: already migrated, or never held. Skipped.
 * - An empty `ownerUserId`: a leftover that holds nothing. The field is
 *   removed and no set is written.
 * - A uid in `ownerUserId` and no set (or an empty one): the set becomes that
 *   one uid, and the single field is removed - in one write, so there is no
 *   moment in which the restaurant is held by neither.
 * - A uid in `ownerUserId` that the set already contains: the single field is
 *   the redundant half, and only it is removed.
 * - Anything else - a set that names other accounts, a set that is not a
 *   list, an `ownerUserId` that is not a string - is a disagreement this
 *   migration has no basis to resolve. It is reported and left as it is.
 */
export const decideRestaurantOwnerIds = (data: DocumentData): Decision => {
  if (!('ownerUserId' in data)) {
    return { kind: 'skip' };
  }

  const single = data['ownerUserId'];
  const set = ownerSetOf(data);
  const setPresent = 'ownerUserIds' in data;

  if (typeof single !== 'string' || (setPresent && !set)) {
    return { kind: 'conflict' };
  }

  // An empty single field holds nothing, so dropping it loses nothing - and a
  // set beside it, if any, is already the whole answer.
  if (single === '') {
    return { kind: 'migrate', write: { ownerUserId: FieldValue.delete() } };
  }

  if (!set || set.length === 0) {
    return {
      kind: 'migrate',
      write: { ownerUserIds: [single], ownerUserId: FieldValue.delete() },
    };
  }

  if (set.includes(single)) {
    return { kind: 'migrate', write: { ownerUserId: FieldValue.delete() } };
  }

  return { kind: 'conflict' };
};

/**
 * One-off migration of restaurant ownership from `ownerUserId` to
 * `ownerUserIds` (epic #1614, issue #1752).
 *
 * The callables write only the set since issue #1752, so this moves the
 * assignments made before it. Since issue #1754 nothing reads the single
 * field any more, so a restaurant this has not reached is held by nobody.
 *
 * **Kept registered after #1754 on purpose.** It is idempotent and harmless,
 * it is the only tool that can repair a leftover single field, and removing a
 * deployed function blocks the CI functions deploy until it is deleted by
 * hand. This module and its spec are the only code that still names the
 * single field outside the rules' locked-field list.
 *
 * **One transaction per restaurant**, rather than the batched writes the other
 * collection migrations use. A batch would decide from a read taken before the
 * commit, and `revokeRestaurantOwner` running in between would be undone: the
 * revoked owner written back into the set. Re-reading inside a transaction
 * decides from what is actually there. There are few enough restaurants for
 * the extra round trips not to matter.
 *
 * Idempotent: a second run finds no `ownerUserId` anywhere and reports every
 * restaurant as skipped. The timestamps are left alone - moving a field is not
 * a change the owner made.
 */
export const migrateRestaurantOwnerIds =
  async (): Promise<MigrateRestaurantOwnerIdsResult> => {
    const db = getFirestore();
    const snapshot = await db.collection(RESTAURANT_COLLECTION).get();

    let migrated = 0;
    let skipped = 0;
    const conflicts: string[] = [];

    for (const restaurant of snapshot.docs) {
      const kind = await db.runTransaction(async (transaction) => {
        const current = await transaction.get(restaurant.ref);

        if (!current.exists) {
          return 'skip' as const;
        }

        const decision = decideRestaurantOwnerIds(current.data() ?? {});

        if (decision.kind === 'migrate') {
          transaction.update(restaurant.ref, decision.write);
        }

        return decision.kind;
      });

      if (kind === 'migrate') {
        migrated++;
      } else if (kind === 'conflict') {
        conflicts.push(restaurant.id);
      } else {
        skipped++;
      }
    }

    const result: MigrateRestaurantOwnerIdsResult = {
      processed: snapshot.size,
      migrated,
      skipped,
      conflicting: conflicts.length,
      conflicts,
    };

    if (conflicts.length > 0) {
      logger.warn('migrateRestaurantOwnerIds: conflicting restaurants', {
        conflicts,
      });
    }

    logger.info('migrateRestaurantOwnerIds: complete', result);

    return result;
  };

/**
 * Runs the restaurant owner migration.
 *
 * Operator-only: it rewrites the ownership of every restaurant, and the only
 * surface that offers it is the admin migrations area.
 */
export const migrateRestaurantOwnerIdsHandler = async (
  request: CallableRequest<void>,
): Promise<MigrateRestaurantOwnerIdsResult> => {
  requireAdmin(request);

  // No `targetId`: the migration touches the whole collection, so the record
  // of what it did is the counts it returns.
  logOperatorAction(request, {
    action: 'migrateRestaurantOwnerIds',
    targetType: 'restaurant',
    outcome: 'started',
  });

  const result = await migrateRestaurantOwnerIds();

  logOperatorAction(request, {
    action: 'migrateRestaurantOwnerIds',
    targetType: 'restaurant',
    outcome: 'succeeded',
    details: { ...result },
  });

  return result;
};

export const migrateRestaurantOwnerIdsCallable = onAppCheck<void>(
  migrateRestaurantOwnerIdsHandler,
);
