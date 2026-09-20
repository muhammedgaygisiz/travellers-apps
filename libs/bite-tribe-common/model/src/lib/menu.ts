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

/**
 * One thing a guest can add to a dish they are ordering
 * (GitHub issue #1598).
 *
 * An extra is additive and nothing else: ticking it adds its price to the line
 * it was ticked on. Anything with a cardinality rule - "choose one base",
 * "pick two of three" - is a different model and is deliberately not this one.
 */
export interface ExtraItem {
  /**
   * Stable identity, on the same terms as {@link MenuItem.id}.
   *
   * Required from issue #1598, which is the issue that made an extra something
   * outside the menu points at: an order line records the extras it was
   * ordered with, and the backend revalidates each one against the live menu.
   * Before that an extra was prose, and prose needs no id.
   *
   * Every extra written before this carries none and is read through
   * {@link withMenuIds}, exactly as a category, an item and a variant are.
   */
  id: string;
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
   * The extras every dish in this category may be ordered with
   * (GitHub issue #1598).
   *
   * ## Why the category and not the dish
   *
   * Ordering reached extras in issue #1598, and the first thing that issue had
   * to settle was whether this block belongs here at all - "extra cheese"
   * reads as a property of a pizza rather than of the Pizze section. It stays
   * on the category, and {@link description} is why: it is the owner's own
   * sentence saying who the extras are offered with, "Add to any pizza", which
   * is the sentence a paper menu prints once under a section rather than
   * beside each dish on it. Moving the block to the item would make an owner
   * retype "extra mozzarella, 2.00" on every pizza and re-price it on every
   * pizza, and a menu maintained that way disagrees with itself within a week.
   *
   * So the rule is: **a dish's extras are its category's**, read through
   * {@link menuExtrasForItem} rather than off this field, so the cart, the two
   * renderers and the backend's revalidation all apply it the same way.
   *
   * What the shape cannot say is that an extra is offered on *some* items of a
   * category and not others. That is the same class of thing as the
   * cardinality rules issue #1598 puts out of scope, and it is reachable later
   * as an allowlist on the item without moving the data that is already here.
   */
  extrasBlock?: {
    /** The owner's sentence introducing the extras. Rendered above them. */
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

  /**
   * The currency every price on this menu is stated in, as an ISO 4217 code
   * (GitHub issue #1102).
   *
   * On the menu rather than on the restaurant, because a price is a property of
   * the menu it is written on: a restaurant that keeps a second menu for an
   * airport terminal prices it in that terminal's currency, and the field would
   * have had to move the first time somebody did.
   *
   * **Optional, and absent means "not stated" rather than a default.** Every
   * menu written before this carries none, and guessing one would put a wrong
   * currency symbol next to a real price, which is worse than the bare number a
   * reader can ask about. The owner sets it in the business editor, where the
   * control is pre-filled from the restaurant's country and still has to be
   * confirmed - so the value is one somebody chose rather than one the product
   * inferred.
   *
   * It is also the field `OrderLineSnapshot.currency` has been waiting for
   * (issue #1103): a line records what the guest was charged, and until a menu
   * said what its prices were in, there was nowhere honest to read that from.
   */
  currency?: string;

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

/**
 * A category's extras, with an id on each that had none.
 *
 * Returns the block it was given, by identity, when nothing was missing, for
 * the reason {@link withItemIds} does: the business editor runs the backfill on
 * every read, and a fresh object per read restarts the `linkedSignal` chain the
 * editor is built on and throws away what the owner was typing.
 */
const withExtraIds = (
  extrasBlock: Category['extrasBlock'],
  createId: MenuIdFactory,
): { extrasBlock: Category['extrasBlock']; filled: number } => {
  if (!extrasBlock) {
    return { extrasBlock, filled: 0 };
  }

  let filled = 0;

  const extras = (extrasBlock.extras ?? []).map((extra) => {
    if (extra.id) {
      return extra;
    }

    filled++;

    return { ...extra, id: createId() };
  });

  return {
    extrasBlock: filled ? { ...extrasBlock, extras } : extrasBlock,
    filled,
  };
};

/** What {@link withMenuIds} had to add, for a migration to count and report. */
export interface MenuIdBackfill {
  menu: Menu;
  /** Categories that had no id. */
  categories: number;
  /** Items and variants that had no id, counted together. */
  items: number;
  /**
   * Extras that had no id (GitHub issue #1598).
   *
   * Counted apart from the items rather than folded in with them, because the
   * admin backfill reports what it did and "filled 40 ids" over a collection
   * whose menus were already migrated for issue #1099 would read as a second
   * pass having found work the first one missed. It found extras, which is new.
   */
  extras: number;
}

/**
 * Gives every category, item, variant and extra that has no id one.
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
  let extrasFilled = 0;

  const categories = (menu.categories ?? []).map((category) => {
    const items = withItemIds(category.items, createId);
    itemsFilled += items.filled;

    const extras = withExtraIds(category.extrasBlock, createId);
    extrasFilled += extras.filled;

    if (category.id && !items.filled && !extras.filled) {
      return category;
    }

    if (!category.id) {
      categoriesFilled++;
    }

    return {
      ...category,
      id: category.id || createId(),
      items: items.items ?? [],
      ...(category.extrasBlock ? { extrasBlock: extras.extrasBlock } : {}),
    };
  });

  const changed = categoriesFilled > 0 || itemsFilled > 0 || extrasFilled > 0;

  return {
    menu: changed ? { ...menu, categories } : menu,
    categories: categoriesFilled,
    items: itemsFilled,
    extras: extrasFilled,
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

/** Whether `items`, or any variant of one, is the item `itemId` names. */
const holdsItem = (items: MenuItem[] | undefined, itemId: string): boolean =>
  (items ?? []).some(
    (item) => item.id === itemId || holdsItem(item.variants, itemId),
  );

/**
 * The extras a dish may be ordered with (GitHub issue #1598).
 *
 * The one place the category rule from {@link Category.extrasBlock} is
 * applied. The cart offers these, the ordering screen draws them and the
 * backend revalidates against them, and a fourth reader that walked to the
 * extras itself would be a fourth chance to offer a guest something the
 * kitchen is not selling - or to refuse them something it is.
 *
 * Takes a **variant's** id as readily as a dish's. A large Margherita is a
 * Margherita, and the extras of the section it is printed in are offered with
 * it; anything else would mean ticking extra cheese on the small pizza and
 * losing the option by choosing the large one.
 *
 * Answers an empty array rather than `undefined` for a dish whose category
 * offers none, because every caller goes on to iterate it.
 */
export const menuExtrasForItem = (
  menu: Menu | undefined,
  itemId: string,
): ExtraItem[] => {
  for (const category of menu?.categories ?? []) {
    if (holdsItem(category.items, itemId)) {
      return category.extrasBlock?.extras ?? [];
    }
  }

  return [];
};

/**
 * The extra one id names, among those offered with a dish.
 *
 * Scoped to the dish rather than searched across the whole menu, which is what
 * makes "this extra is offered with that dish" a fact the order establishes
 * rather than one it assumes - the same rule the backend applies to a variant,
 * where naming the large Margherita as a variant of the tiramisu finds
 * nothing.
 */
export const findMenuExtraForItem = (
  menu: Menu | undefined,
  itemId: string,
  extraId: string,
): ExtraItem | undefined =>
  menuExtrasForItem(menu, itemId).find((extra) => extra.id === extraId);
