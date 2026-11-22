import { awaitsMenuLink, dishNameKey } from 'model';
import type { Bite, Menu, MenuItem } from 'model';

/**
 * The Guest Bites page's reading of the restaurant's Bites (GitHub issue
 * #2216). Pure, so what the owner is offered is decided in one tested place.
 */

/**
 * The Bites still waiting for the owner: linked to no dish, and not marked as
 * about nothing on the menu. A Bite the guest linked from an order or from the
 * menu is linked, so it never appears.
 */
export const unlinkedBites = (bites: readonly Bite[]): Bite[] =>
  bites.filter(awaitsMenuLink);

/** A dish on the menu, with the category it sits in. */
export interface MenuDish {
  readonly categoryTitle: string;
  readonly item: MenuItem;
}

export const menuDishes = (menu: Menu | undefined): MenuDish[] =>
  (menu?.categories ?? []).flatMap((category) =>
    (category.items ?? []).map((item) => ({
      categoryTitle: category.title,
      item,
    })),
  );

/**
 * The dish a Bite is suggested for: the first whose name has the Bite's
 * {@link dishNameKey}, the key verification grouped Bites into dishes by.
 * Nothing when no name matches; the owner then picks the dish.
 */
export const suggestedDish = (
  bite: Bite,
  menu: Menu | undefined,
): MenuItem | undefined => {
  const key = bite.name?.trim() ? dishNameKey(bite.name) : '';

  if (!key) {
    return undefined;
  }

  return menuDishes(menu).find(
    ({ item }) => item.name?.trim() && dishNameKey(item.name) === key,
  )?.item;
};

/**
 * The dish a link points at, as the owner reads it in the toast that confirms
 * it (GitHub issue #2263): the dish's name, with the variant's in brackets
 * where one was chosen. Empty where the dish is no longer on the menu held.
 */
export const linkedDishName = (
  menu: Menu | undefined,
  menuItemId: string,
  variantId?: string,
): string => {
  const item = menuDishes(menu).find(
    ({ item }) => item.id === menuItemId,
  )?.item;
  const variant = variantId
    ? item?.variants?.find(({ id }) => id === variantId)
    : undefined;

  if (!item?.name) {
    return '';
  }

  return variant?.name ? `${item.name} (${variant.name})` : item.name;
};

/**
 * Why `linkBiteToMenuItem` refused, as the Guest Bites page has to explain it
 * (GitHub issue #2262).
 *
 * Read off the callable's code, which the backend sets per case. The business
 * app is a web app, so the code arrives as `functions/<code>`; matching the
 * code inside the string rather than the whole of it also covers a native
 * rejection, which can fold the code into the message.
 *
 * - `already-linked` (`failed-precondition`): the guest linked the Bite to a
 *   dish themself, and their link wins. No retry can change that, so the Bite
 *   leaves the list. The other `failed-precondition` - a Bite naming no
 *   restaurant - cannot be in this restaurant's list to begin with.
 * - `dish-gone` (`invalid-argument`): the dish, or its variant, left the menu
 *   while the page was open. The Bite stays, so another dish can be chosen.
 * - `not-assigned` (`permission-denied`): the restaurant is no longer this
 *   account's. Trying again won't help, so it says so.
 * - `bite-gone` (`not-found`): the Bite was deleted. It leaves the list.
 * - `unknown`: a network failure or anything else, where trying again can help.
 */
export type GuestBiteLinkFailure =
  'already-linked' | 'dish-gone' | 'not-assigned' | 'bite-gone' | 'unknown';

export const guestBiteLinkFailure = (error: unknown): GuestBiteLinkFailure => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : '';
  const described = `${code} ${message}`;

  if (described.includes('failed-precondition')) {
    return 'already-linked';
  }

  if (described.includes('invalid-argument')) {
    return 'dish-gone';
  }

  if (described.includes('permission-denied')) {
    return 'not-assigned';
  }

  if (described.includes('not-found')) {
    return 'bite-gone';
  }

  return 'unknown';
};
