import type { Category, Menu, MenuItem } from 'model';
import { createEntityId } from 'utils';

/**
 * The menu editor's writes, as pure functions of the stored menu (GitHub
 * issue #2182).
 *
 * Every change is one call here followed by one whole-menu save, so the
 * editor never holds a second copy of the menu that could be saved over a
 * newer one: the list and each editor read the stored menu, and a save starts
 * from it again.
 */

/** Where one dish, or one of its variants, sits in the menu. */
export interface DishRef {
  readonly categoryId: string;
  readonly itemId: string;
  readonly variantId?: string;
}

export interface CategoryDetails {
  readonly title: string;
  readonly subtitle?: string;
}

const withCategories = (menu: Menu, categories: Category[]): Menu => ({
  ...menu,
  categories,
});

const mapCategory = (
  menu: Menu,
  categoryId: string,
  change: (category: Category) => Category,
): Menu =>
  withCategories(
    menu,
    menu.categories.map((category) =>
      category.id === categoryId ? change(category) : category,
    ),
  );

const move = <T>(list: readonly T[], from: number, to: number): T[] => {
  const next = [...list];
  const [moved] = next.splice(from, 1);

  if (moved === undefined) {
    return [...list];
  }

  next.splice(to, 0, moved);

  return next;
};

/** Puts a dish back in its place, or appends it when it is new. */
export const saveDish = (
  menu: Menu,
  categoryId: string,
  dish: MenuItem,
): Menu =>
  mapCategory(menu, categoryId, (category) => {
    const items = category.items ?? [];
    const exists = items.some((item) => item.id === dish.id);

    return {
      ...category,
      items: exists
        ? items.map((item) => (item.id === dish.id ? dish : item))
        : [...items, dish],
    };
  });

/**
 * Switches a dish, or one of its variants, on or off for today.
 *
 * Written as an explicit `true` rather than by removing the field, so the
 * stored menu says what the owner chose; readers treat absent as available.
 */
export const setAvailability = (
  menu: Menu,
  ref: DishRef,
  available: boolean,
): Menu =>
  mapCategory(menu, ref.categoryId, (category) => ({
    ...category,
    items: (category.items ?? []).map((item) => {
      if (item.id !== ref.itemId) {
        return item;
      }

      if (!ref.variantId) {
        return { ...item, isAvailable: available };
      }

      return {
        ...item,
        variants: (item.variants ?? []).map((variant) =>
          variant.id === ref.variantId
            ? { ...variant, isAvailable: available }
            : variant,
        ),
      };
    }),
  }));

/** Writes a category's title and subtitle, or adds a new category. */
export const saveCategoryDetails = (
  menu: Menu,
  categoryId: string | undefined,
  details: CategoryDetails,
): Menu => {
  const subtitle = details.subtitle?.trim() ?? '';
  const fields = {
    title: details.title.trim(),
    ...(subtitle ? { subtitle } : { subtitle: '' }),
  };

  if (!categoryId) {
    return withCategories(menu, [
      ...menu.categories,
      { id: createEntityId(), items: [], ...fields },
    ]);
  }

  return mapCategory(menu, categoryId, (category) => ({
    ...category,
    ...fields,
  }));
};

export const saveExtras = (
  menu: Menu,
  categoryId: string,
  extrasBlock: Category['extrasBlock'],
): Menu =>
  mapCategory(menu, categoryId, (category) => ({ ...category, extrasBlock }));

/**
 * Takes a dish, with its variants, off the menu (GitHub issue #2181).
 *
 * Not a soft delete: `isAvailable` already covers a dish that is out for an
 * evening, and a dish deleted here is one the restaurant does not serve. An
 * order already submitted keeps its line, because each line carries its own
 * copy of the dish's name and price.
 */
export const removeDish = (
  menu: Menu,
  categoryId: string,
  itemId: string,
): Menu =>
  mapCategory(menu, categoryId, (category) => ({
    ...category,
    items: (category.items ?? []).filter((item) => item.id !== itemId),
  }));

/**
 * Takes a category off the menu, and with it every dish, variant and extra it
 * holds (GitHub issue #2181).
 */
export const removeCategory = (menu: Menu, categoryId: string): Menu =>
  withCategories(
    menu,
    menu.categories.filter((category) => category.id !== categoryId),
  );

export const moveCategory = (menu: Menu, from: number, to: number): Menu =>
  withCategories(menu, move(menu.categories, from, to));

export const moveDish = (
  menu: Menu,
  categoryId: string,
  from: number,
  to: number,
): Menu =>
  mapCategory(menu, categoryId, (category) => ({
    ...category,
    items: move(category.items ?? [], from, to),
  }));

/**
 * A dish as the editor shows it (GitHub issue #2182).
 *
 * A variant used to repeat its dish's name and carry its difference in its
 * description ("Margherita" / "Large 40 cm"). It now has a name of its own,
 * so a variant that only repeats the dish name is shown with its description
 * as its name, and saving writes that shape.
 *
 * A dish with variants used to have a price of its own as well, which guests
 * could order as the plain dish. A variant is now every version of the dish,
 * so that price becomes a first variant the owner names, and the dish keeps
 * none. Its name starts empty, because only the owner knows what the plain
 * dish was ("Regular", "Small", "Vegetarian").
 */
export const editableDish = (item: MenuItem): MenuItem => {
  const variants = (item.variants ?? []).map((variant) =>
    variant.name.trim() === item.name.trim() && variant.description?.trim()
      ? { ...variant, name: variant.description.trim(), description: '' }
      : variant,
  );

  if (!variants.length) {
    return { ...item, variants: [] };
  }

  if (item.price > 0) {
    return {
      ...item,
      price: 0,
      variants: [
        {
          id: createEntityId(),
          name: '',
          description: '',
          price: item.price,
          ...(item.isAvailable === false ? { isAvailable: false } : {}),
        },
        ...variants,
      ],
    };
  }

  return { ...item, variants };
};

/**
 * How a price reads in the editor: always with the menu's currency, so it is
 * never mistaken for a time ("11.00–14.00" read as opening hours).
 */
export const priceLabel = (
  price: number | undefined,
  currency: string | undefined,
): string => {
  if (price === undefined || price === null || Number.isNaN(price)) {
    return '';
  }

  const amount = price.toFixed(2);

  return currency ? `${currency} ${amount}` : amount;
};
