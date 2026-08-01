import { normalizePlaceName } from './restaurant-candidates';

/**
 * Title of the single category that candidate verification derives from Bites.
 * Menu content is operator-owned free text, so the title is stored as data and
 * can be renamed in the business edit-menu page.
 */
export const INITIAL_MENU_CATEGORY_TITLE = 'Bites';

export interface InitialMenuBite {
  name?: string;
  price?: number;
}

export interface InitialMenuItem {
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
}

export interface InitialMenuCategory {
  title: string;
  items: InitialMenuItem[];
}

interface InitialMenuItemDraft {
  name: string;
  biteCount: number;
  priceSum: number;
  pricedBiteCount: number;
}

/**
 * Groups Bites that describe the same dish. Place-name normalization already
 * implements the matching rules the candidate workflow uses, so dish names
 * reuse it instead of duplicating a second normalizer. Names that normalize to
 * nothing, such as non-latin scripts, fall back to the lowercased raw name so
 * they are not all grouped into one item.
 */
const getMenuItemKey = (name: string): string =>
  normalizePlaceName(name) || name.toLocaleLowerCase();

const isUsablePrice = (price: unknown): price is number =>
  typeof price === 'number' && Number.isFinite(price) && price > 0;

const toRoundedPrice = (price: number): number => Math.round(price * 100) / 100;

const toInitialMenuItem = (draft: InitialMenuItemDraft): InitialMenuItem => ({
  name: draft.name,
  description: '',
  price: draft.pricedBiteCount
    ? toRoundedPrice(draft.priceSum / draft.pricedBiteCount)
    : 0,
  isAvailable: true,
});

/**
 * Turns candidate Bites into draft menu items. Bites of the same dish become
 * one item priced with the average of the prices users reported for it, so the
 * operator starts from the evidence instead of an empty menu.
 */
export const buildInitialMenuItems = (
  bites: InitialMenuBite[],
): InitialMenuItem[] => {
  const drafts = new Map<string, InitialMenuItemDraft>();

  bites.forEach((bite) => {
    const name = bite.name?.trim();

    if (!name) {
      return;
    }

    const key = getMenuItemKey(name);
    const draft = drafts.get(key) ?? {
      name,
      biteCount: 0,
      priceSum: 0,
      pricedBiteCount: 0,
    };

    draft.biteCount += 1;

    if (isUsablePrice(bite.price)) {
      draft.priceSum += bite.price;
      draft.pricedBiteCount += 1;
    }

    drafts.set(key, draft);
  });

  return [...drafts.values()]
    .sort(
      (left, right) =>
        right.biteCount - left.biteCount || left.name.localeCompare(right.name),
    )
    .map(toInitialMenuItem);
};

/**
 * Builds the categories of the initial menu. Bites carry no category context,
 * so everything lands in one category and an evidence-free candidate keeps the
 * previous empty-menu behavior.
 */
export const buildInitialMenuCategories = (
  bites: InitialMenuBite[],
): InitialMenuCategory[] => {
  const items = buildInitialMenuItems(bites);

  return items.length ? [{ title: INITIAL_MENU_CATEGORY_TITLE, items }] : [];
};
