/**
 * What people thought of one dish (GitHub issue #1113).
 *
 * ## Why it is not on the menu
 *
 * A menu is written by the restaurant that owns it, and `firestore.rules`
 * admits that write whole. An aggregate kept inside a menu item would
 * therefore be overwritten every time an owner edited a price - silently, and
 * by somebody who had no idea they were holding it. The same argument
 * separates `tableStates` from `tables`: what the backend owns lives where the
 * client cannot reach it.
 *
 * ## Why under the restaurant rather than under the menu
 *
 * A Bite carries `restaurantId` and `menuItemId` and **not** `menuId`, so the
 * restaurant is the only anchor both sides can address the document from: the
 * trigger has a Bite in hand and the menu screen has a restaurant. Hanging it
 * off the menu would make the trigger read the restaurant first to find out
 * which menu, on every Bite ever written.
 *
 * ```text
 * /restaurants/{restaurantId}/menuItemStats/{menuItemId}
 * ```
 *
 * ## Why the sum and the count rather than the average
 *
 * An average cannot be maintained incrementally without them. A trigger that
 * stored only the mean would have to read every Bite of that dish to add one,
 * which is the read-the-world-to-write-one-row shape aggregates exist to
 * avoid. With a sum and a count, adding a rating is two increments and
 * removing one is two decrements, and {@link menuItemAverageRating} derives
 * the number a screen shows.
 *
 * ## Two counts, deliberately
 *
 * {@link biteCount} counts Bites and {@link ratingCount} counts the ones that
 * carried a rating, because `Bite.rating` is optional and most of the
 * interesting ones have a photo and no number. "Seven Bites, rated 4.3 by
 * four of them" is honest; folding the two would either overstate how many
 * people rated a dish or hide the Bites that said nothing.
 */

/** One subcollection per restaurant, holding what its dishes are thought of. */
export const MENU_ITEM_STATS_COLLECTION = 'menuItemStats';

/** What people thought of one dish. */
export interface MenuItemStats {
  /** Equal to the document id, which is the menu item's own id. */
  id: string;
  restaurantId: string;
  /** How many Bites name this dish. */
  biteCount: number;
  /** How many of those carried a rating. */
  ratingCount: number;
  /** The ratings added up, so the average is derivable without a read. */
  ratingSum: number;
  /** When the aggregate last changed, in epoch milliseconds. */
  updatedAt: number;
}

/**
 * The average rating of a dish, or nothing where nobody has rated it.
 *
 * `undefined` rather than zero, and the distinction is the whole point: a dish
 * nobody rated and a dish everybody hated are not the same dish, and a screen
 * that printed `0` for the first would libel a kitchen.
 */
export const menuItemAverageRating = (
  stats: Pick<MenuItemStats, 'ratingCount' | 'ratingSum'> | undefined,
): number | undefined => {
  if (!stats || stats.ratingCount <= 0) {
    return undefined;
  }

  return stats.ratingSum / stats.ratingCount;
};

/** Whether a dish has anything worth showing on a menu row. */
export const hasMenuItemSignal = (
  stats: Pick<MenuItemStats, 'biteCount'> | undefined,
): boolean => (stats?.biteCount ?? 0) > 0;
