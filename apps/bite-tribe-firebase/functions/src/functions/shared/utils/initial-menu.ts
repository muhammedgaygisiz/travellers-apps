import { currencyForRegion } from './currency-by-region';
import { createMenuEntityId } from './menu-ids';
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
  /** The currency the Bite's author paid in, as an ISO 4217 code. */
  currency?: string;
  /** Where the Bite was taken, as an ISO 3166-1 alpha-2 code. */
  countryCode?: string;
}

export interface InitialMenuItem {
  /**
   * The stable id an order line references (issue #1099).
   *
   * Generated here rather than left to the backfill, so a menu is born with
   * ids instead of being created without them and migrated moments later.
   */
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
}

export interface InitialMenuCategory {
  /** Stable id, on the same terms as {@link InitialMenuItem.id}. */
  id: string;
  title: string;
  items: InitialMenuItem[];
}

/** What candidate verification writes as the restaurant's first menu. */
export interface InitialMenu {
  categories: InitialMenuCategory[];
  /** Absent when neither the Bites nor their country state one. */
  currency?: string;
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

const toCurrencyCode = (currency: unknown): string | undefined => {
  const code =
    typeof currency === 'string' ? currency.trim().toUpperCase() : '';

  return /^[A-Z]{3}$/.test(code) ? code : undefined;
};

/**
 * The value most entries share, or `undefined` when there is none or two share
 * the top count - a tie is no clear answer.
 */
const clearMajority = (values: string[]): string | undefined => {
  const counts = new Map<string, number>();

  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  const ranked = [...counts.entries()].sort(
    (left, right) => right[1] - left[1],
  );

  return ranked.length && ranked[0][1] !== ranked[1]?.[1]
    ? ranked[0][0]
    : undefined;
};

const toRoundedPrice = (price: number): number => Math.round(price * 100) / 100;

const toInitialMenuItem = (draft: InitialMenuItemDraft): InitialMenuItem => ({
  id: createMenuEntityId(),
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
 *
 * `countsPrice` says which Bites' prices go into the average. A Bite it
 * refuses still names its dish, so the menu keeps the dish at price 0 when no
 * Bite of it qualifies.
 */
export const buildInitialMenuItems = (
  bites: InitialMenuBite[],
  countsPrice: (bite: InitialMenuBite) => boolean = () => true,
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

    if (isUsablePrice(bite.price) && countsPrice(bite)) {
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
 * The currency a derived menu states (GitHub issue #1511), decided in order:
 *
 * 1. The currency most priced Bites were paid in, when one clearly leads.
 * 2. Otherwise - a tie, or no priced Bite records a currency - the currency of
 *    the country most of the candidate's Bites were taken in.
 * 3. Otherwise none.
 *
 * The prices are what guests reported, so their own currency is the best
 * evidence; the country only settles what the Bites leave open.
 */
export const chooseInitialMenuCurrency = (
  bites: InitialMenuBite[],
): string | undefined => {
  const pricedCurrencies = bites
    .filter((bite) => bite.name?.trim() && isUsablePrice(bite.price))
    .map((bite) => toCurrencyCode(bite.currency))
    .filter((currency): currency is string => !!currency);

  const countries = bites
    .map((bite) => bite.countryCode?.trim().toUpperCase())
    .filter((countryCode): countryCode is string => !!countryCode);

  return (
    clearMajority(pricedCurrencies) ??
    currencyForRegion(clearMajority(countries))
  );
};

/**
 * Builds the initial menu. Bites carry no category context, so everything
 * lands in one category and an evidence-free candidate keeps the previous
 * empty-menu behavior.
 *
 * Prices average only the Bites paid in the menu's currency: twelve francs and
 * twelve euros do not average to twelve of anything. A Bite that records no
 * currency counts only when none of the priced Bites records one, which is how
 * every menu was priced before currencies were compared. With no menu currency
 * at all, every price counts, as before.
 */
export const buildInitialMenu = (bites: InitialMenuBite[]): InitialMenu => {
  const currency = chooseInitialMenuCurrency(bites);
  const anyPricedBiteHasCurrency = bites.some(
    (bite) => isUsablePrice(bite.price) && toCurrencyCode(bite.currency),
  );

  const countsPrice = (bite: InitialMenuBite): boolean => {
    const biteCurrency = toCurrencyCode(bite.currency);

    if (!currency) {
      return true;
    }

    return biteCurrency ? biteCurrency === currency : !anyPricedBiteHasCurrency;
  };

  const items = buildInitialMenuItems(bites, countsPrice);
  const categories = items.length
    ? [{ id: createMenuEntityId(), title: INITIAL_MENU_CATEGORY_TITLE, items }]
    : [];

  return currency ? { categories, currency } : { categories };
};
