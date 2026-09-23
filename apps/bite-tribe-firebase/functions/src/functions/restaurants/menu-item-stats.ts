import { DocumentData } from 'firebase-admin/firestore';

/**
 * What people thought of one dish, as the backend maintains it
 * (GitHub issue #1113).
 *
 * ## Why this is a second copy
 *
 * The wall `table-visit.ts` describes: this project compiles with its own
 * `tsconfig.json` and cannot import `libs/bite-tribe-common/model`. The single
 * definition is `menu-item-stats.ts` there, and
 * `src/__specs__/menu-item-stats-parity.spec.ts` compares the collection name
 * and the arithmetic as text.
 *
 * ## Why it is not on the menu
 *
 * A menu is written by the restaurant that owns it, whole, on every price
 * edit. An aggregate kept inside a menu item would be silently overwritten by
 * somebody who had no idea they were holding it - which is the same argument
 * that separates `tableStates` from `tables`.
 */

/** One subcollection per restaurant, holding what its dishes are thought of. */
export const MENU_ITEM_STATS_COLLECTION = 'menuItemStats';

/** What people thought of one dish. */
export interface MenuItemStats {
  id: string;
  restaurantId: string;
  biteCount: number;
  ratingCount: number;
  ratingSum: number;
  updatedAt: number;
}

/** The link a Bite carries, where it carries one. */
export interface BiteMenuLink {
  restaurantId: string;
  menuItemId: string;
  /** The rating on that Bite, where the guest gave one. */
  rating?: number;
}

/**
 * The link off a stored Bite, or nothing where it is not linked to a dish.
 *
 * Both ids are required. A Bite naming a menu item but no restaurant has
 * nowhere to file its contribution - the stats live under the restaurant,
 * because that is the only anchor a Bite and a menu screen both hold - and a
 * Bite that names neither is the ordinary case rather than a defect.
 */
export const biteMenuLink = (
  bite: DocumentData | undefined,
): BiteMenuLink | undefined => {
  const restaurantId = bite?.['restaurantId'];
  const menuItemId = bite?.['menuItemId'];

  if (typeof restaurantId !== 'string' || !restaurantId) {
    return undefined;
  }

  if (typeof menuItemId !== 'string' || !menuItemId) {
    return undefined;
  }

  const rating = bite?.['rating'];

  return {
    restaurantId,
    menuItemId,
    ...(typeof rating === 'number' && Number.isFinite(rating)
      ? { rating }
      : {}),
  };
};

/** How one Bite moves a dish's aggregate. */
export interface StatsDelta {
  biteCount: number;
  ratingCount: number;
  ratingSum: number;
}

/** No change at all, which is what an edit that touched neither produces. */
export const NO_STATS_CHANGE: StatsDelta = {
  biteCount: 0,
  ratingCount: 0,
  ratingSum: 0,
};

/** Whether a delta would move anything, so a no-op writes nothing. */
export const movesStats = (delta: StatsDelta): boolean =>
  delta.biteCount !== 0 || delta.ratingCount !== 0 || delta.ratingSum !== 0;

/**
 * What one Bite adds to, or takes from, a dish.
 *
 * `sign` is `1` for a Bite arriving and `-1` for one leaving, so a create, a
 * delete and each half of an edit are the same arithmetic rather than three
 * near-identical branches - which is where a counter drifts.
 *
 * A Bite with no rating still counts as a Bite. That is the whole reason
 * `biteCount` and `ratingCount` are two numbers: most of the interesting Bites
 * have a photo and no number, and folding them would either overstate how many
 * people rated a dish or hide the ones that said nothing.
 */
export const statsDeltaFor = (
  link: BiteMenuLink | undefined,
  sign: 1 | -1,
): StatsDelta => {
  if (!link) {
    return NO_STATS_CHANGE;
  }

  return {
    biteCount: sign,
    ratingCount: link.rating === undefined ? 0 : sign,
    ratingSum: link.rating === undefined ? 0 : sign * link.rating,
  };
};

/** Two deltas added, so an edit is one write rather than two. */
export const addStatsDeltas = (
  left: StatsDelta,
  right: StatsDelta,
): StatsDelta => ({
  biteCount: left.biteCount + right.biteCount,
  ratingCount: left.ratingCount + right.ratingCount,
  ratingSum: left.ratingSum + right.ratingSum,
});
