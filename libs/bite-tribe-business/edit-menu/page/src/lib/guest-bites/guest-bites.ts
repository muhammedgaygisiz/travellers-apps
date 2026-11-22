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
