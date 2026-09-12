/**
 * A restaurant's menu, and the identity an order line hangs from
 * (GitHub issue #1099).
 *
 * ## Why an item needs an id at all
 *
 * Until this issue a menu item was an array entry inside `Menu.categories[]`,
 * addressable only by its name and its index. Nothing outside the menu could
 * point at one and still be pointing at it a year later: renaming "Margherita"
 * to "Pizza Margherita" moved it, reordering a category moved it, and both
 * happen in the ordinary course of running a restaurant. An order line, a
 * receipt and the menu-item-to-Bite link of issue #1073 all need a reference
 * that survives those, which is what {@link MenuItem.id} is.
 *
 * The id is generated once and never reused. It says nothing about the item -
 * not its name, not its category, not its position - because anything it said
 * would be a second copy of a fact the item already carries and free to
 * disagree with it.
 *
 * ## What the id does not do
 *
 * It does not make the item's name or price durable. A menu is edited in
 * place, so the name and price an order was placed against are gone as soon as
 * the owner changes them. That is what {@link OrderLineSnapshot} in
 * `order-line.ts` is for: the id says *which* item, the snapshot says what it
 * was at the moment somebody ordered it.
 *
 * ## Menus written before this existed
 *
 * They have no ids, and both halves of the answer are here rather than one
 * here and one in the migration. {@link withMenuIds} fills in whatever is
 * missing, and it is run in two places: by the admin backfill, once, over
 * every stored menu, and by the business editor on load, so an owner editing a
 * menu that has not been backfilled yet is still editing by id and persists
 * the ids on their next save.
 */

/**
 * One thing a guest can order, or one variant of one.
 *
 * A variant is a `MenuItem` in its own right, in {@link MenuItem.variants}: it
 * has its own id, its own price and its own availability, because "the large
 * one is sold out" is a sentence a kitchen says.
 */
export interface MenuItem {
  /**
   * Stable identity, generated once and never reused.
   *
   * Required rather than optional, which is a statement about what is written
   * from here on rather than about what is stored: a document written before
   * issue #1099 carries none, and is read through {@link withMenuIds} before
   * anything depends on the field. Making it optional would push that
   * `undefined` into every order line, receipt and editor key instead - the
   * one place it must never reach.
   */
  id: string;
  name: string;
  description: string;
  ingredients?: string;
  notes?: string;
  price: number;
  /**
   * Whether the kitchen is serving this today.
   *
   * Absent means available: the flag was added after menus shipped, and an
   * item nobody has ever toggled is on the menu. Read it through
   * {@link isMenuItemAvailable} rather than comparing it, so "absent means
   * available" is written once instead of at every render.
   */
  isAvailable?: boolean;
  variants?: MenuItem[];
}

interface ExtraItem {
  name: string;
  price: number;
}

export interface Category {
  /**
   * Stable identity, on the same terms as {@link MenuItem.id}.
   *
   * A category is not orderable, so nothing snapshots it. It carries an id for
   * the other half of the problem: the editor has to say *which* category an
   * item was added to or reordered within, and it said so by title, so
   * renaming a category while editing it repointed the edit.
   */
  id: string;
  title: string;
  subtitle?: string;

  items: MenuItem[];

  /**
   * Free-text extras, which carry no id.
   *
   * Deliberate: an extra is prose attached to a category rather than something
   * a guest adds to an order line, so nothing outside the menu points at one.
   * It gains an id when ordering reaches it, not before.
   */
  extrasBlock?: {
    description: string;
    extras: ExtraItem[];
  };
}

export interface Menu {
  id: string;
  categories: Category[];

  /**
   * The restaurant this menu belongs to.
   *
   * A menu used to say nothing about who may write it - the only link was
   * `Restaurant.menuId` pointing the other way - so the ownership-scoped rules
   * had no way to authorise a menu write. The client now names the restaurant
   * on every menu write and the rules verify the claim against that
   * restaurant's `ownerUserId` and `menuId` (GitHub issue #1078).
   *
   * Optional because menus written before that carry no value. Nothing reads
   * it: the rules read the restaurant, not this field, so a menu that predates
   * it is still writable by its owner and simply gains the field on its next
   * save.
   */
  restaurantId?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}

/**
 * Whether this item can be ordered, reading an absent flag as available.
 *
 * One function rather than an `isAvailable === false` at each render, because
 * the three-valued field has one meaning and three call sites that were each
 * free to get the `undefined` case wrong.
 */
export const isMenuItemAvailable = (
  item: Pick<MenuItem, 'isAvailable'> | undefined,
): boolean => item?.isAvailable !== false;

/**
 * Whether a variant can be ordered, given the item it is a variant of.
 *
 * A variant's own flag is not the whole answer. An owner who takes a dish off
 * the menu has said the dish is off, and its sizes are sizes of that dish -
 * offering the large one because nobody toggled it separately is the menu
 * contradicting itself in the guest's face.
 *
 * So unavailability travels down and availability does not travel up: an
 * available item with one sold-out size still has its other sizes.
 */
export const isMenuVariantAvailable = (
  item: Pick<MenuItem, 'isAvailable'> | undefined,
  variant: Pick<MenuItem, 'isAvailable'> | undefined,
): boolean => isMenuItemAvailable(item) && isMenuItemAvailable(variant);

/** Makes one identifier. Passed in so the model depends on no id library. */
export type MenuIdFactory = () => string;

const withItemIds = (
  items: MenuItem[] | undefined,
  createId: MenuIdFactory,
): { items: MenuItem[] | undefined; filled: number } => {
  if (!items) {
    return { items, filled: 0 };
  }

  let filled = 0;

  const withIds = items.map((item) => {
    const variants = withItemIds(item.variants, createId);
    filled += variants.filled;

    if (item.id && !variants.filled) {
      return item;
    }

    if (!item.id) {
      filled++;
    }

    return {
      ...item,
      id: item.id || createId(),
      ...(item.variants ? { variants: variants.items } : {}),
    };
  });

  return { items: filled ? withIds : items, filled };
};

/** What {@link withMenuIds} had to add, for a migration to count and report. */
export interface MenuIdBackfill {
  menu: Menu;
  /** Categories that had no id. */
  categories: number;
  /** Items and variants that had no id, counted together. */
  items: number;
}

/**
 * Gives every category, item and variant that has no id one.
 *
 * Returns the menu it was given, by identity, when nothing was missing. That
 * is not a micro-optimisation: the business editor runs this on every read, and
 * a fresh object per read would restart the `linkedSignal` chain the editor is
 * built on and throw away what the owner was typing.
 *
 * Idempotent for the same reason the admin backfill has to be - an id that
 * already exists is never replaced, because replacing one is exactly what the
 * whole issue is about not doing.
 */
export const backfillMenuIds = (
  menu: Menu,
  createId: MenuIdFactory,
): MenuIdBackfill => {
  let categoriesFilled = 0;
  let itemsFilled = 0;

  const categories = (menu.categories ?? []).map((category) => {
    const items = withItemIds(category.items, createId);
    itemsFilled += items.filled;

    if (category.id && !items.filled) {
      return category;
    }

    if (!category.id) {
      categoriesFilled++;
    }

    return {
      ...category,
      id: category.id || createId(),
      items: items.items ?? [],
    };
  });

  const changed = categoriesFilled > 0 || itemsFilled > 0;

  return {
    menu: changed ? { ...menu, categories } : menu,
    categories: categoriesFilled,
    items: itemsFilled,
  };
};

/** {@link backfillMenuIds} for callers that want the menu and not the counts. */
export const withMenuIds = (menu: Menu, createId: MenuIdFactory): Menu =>
  backfillMenuIds(menu, createId).menu;

/**
 * The item one id names, looked up across every category and variant.
 *
 * An order line carries the id alone, so reading a line back - on a receipt, or
 * when a guest orders the same thing again - is this lookup. It answers
 * `undefined` for an item that has since been deleted, which is an ordinary
 * outcome rather than an error: the line still renders, from its own snapshot.
 */
export const findMenuItemById = (
  menu: Menu | undefined,
  itemId: string,
): MenuItem | undefined => {
  const findIn = (items: MenuItem[] | undefined): MenuItem | undefined => {
    for (const item of items ?? []) {
      if (item.id === itemId) {
        return item;
      }

      const inVariants = findIn(item.variants);

      if (inVariants) {
        return inVariants;
      }
    }

    return undefined;
  };

  for (const category of menu?.categories ?? []) {
    const found = findIn(category.items);

    if (found) {
      return found;
    }
  }

  return undefined;
};
