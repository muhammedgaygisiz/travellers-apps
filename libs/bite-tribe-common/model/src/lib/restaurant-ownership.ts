import type { Restaurant } from './restaurant';

/**
 * The part of a restaurant that says who holds it.
 *
 * Loose on purpose: a guard reads it straight off a Firestore snapshot, whose
 * fields are whatever the document happens to carry.
 */
export type RestaurantOwnership = Partial<
  Record<keyof Pick<Restaurant, 'ownerUserIds'>, unknown>
>;

/**
 * Every account holding a restaurant (epic #1614): the `ownerUserIds` set, the
 * same field `firestore.rules` and the server's `restaurant-authority.ts`
 * check.
 *
 * The single-owner field the set replaced is not read (issue #1754): an
 * account named only in a leftover one holds nothing.
 *
 * Deduplicated, and anything that is not a non-empty string is dropped, so a
 * malformed document reads as unheld rather than as held by `''`.
 */
export const restaurantOwnerIds = (
  restaurant: RestaurantOwnership | undefined,
): string[] => {
  const set = Array.isArray(restaurant?.ownerUserIds)
    ? (restaurant.ownerUserIds as unknown[])
    : [];

  return [
    ...new Set(
      set.filter(
        (value): value is string => typeof value === 'string' && value !== '',
      ),
    ),
  ];
};

/** Whether `uid` is one of the accounts holding the restaurant. */
export const isRestaurantOwner = (
  restaurant: RestaurantOwnership | undefined,
  uid: string | undefined,
): boolean => !!uid && restaurantOwnerIds(restaurant).includes(uid);
