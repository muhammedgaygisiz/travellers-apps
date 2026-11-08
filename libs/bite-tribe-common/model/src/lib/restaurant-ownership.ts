import type { Restaurant } from './restaurant';

/**
 * The part of a restaurant that says who holds it.
 *
 * Loose on purpose: a guard reads it straight off a Firestore snapshot, whose
 * fields are whatever the document happens to carry.
 */
export type RestaurantOwnership = Partial<
  Record<keyof Pick<Restaurant, 'ownerUserId' | 'ownerUserIds'>, unknown>
>;

/**
 * Every account holding a restaurant (epic #1614).
 *
 * Ownership is moving from one uid in `ownerUserId` to a set in
 * `ownerUserIds`. Until the single-owner field is removed (issue #1754), an
 * account named in either one holds the restaurant - the same union
 * `firestore.rules` and the server's `restaurant-authority.ts` check - so a
 * restaurant keeps its owner on whichever side of the migration it is.
 *
 * Deduplicated, and anything that is not a non-empty string is dropped, so a
 * malformed document reads as unheld rather than as held by `''`.
 */
export const restaurantOwnerIds = (
  restaurant: RestaurantOwnership | undefined,
): string[] => {
  const single =
    typeof restaurant?.ownerUserId === 'string' ? [restaurant.ownerUserId] : [];
  const set = Array.isArray(restaurant?.ownerUserIds)
    ? (restaurant.ownerUserIds as unknown[])
    : [];

  return [
    ...new Set(
      [...single, ...set].filter(
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
