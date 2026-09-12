import { randomUUID } from 'node:crypto';

/**
 * Menu-item identity, the backend's copy (GitHub issue #1099).
 *
 * `libs/bite-tribe-common/model/src/lib/menu.ts` is the definition. This
 * project cannot import it: it compiles with its own `tsconfig.json`, whose
 * `rootDir` is `src` and which carries none of the workspace path mappings, and
 * the deploy uploads `lib/` alone - the same wall `shared/roles.ts` and
 * `restaurants/table-state.ts` hit.
 *
 * Unlike those two there is no parity spec here, and that is a decision rather
 * than an omission. A parity spec is worth writing where the two copies encode
 * a set of choices that could disagree - which transitions are legal, which
 * roles exist - because a disagreement there is silent and wrong. The rule in
 * this file has no such choices: anything without an id gets one, ids already
 * present are never touched. Two implementations of that cannot drift into
 * disagreement without one of them simply being broken, which each project's
 * own tests catch.
 *
 * What the two copies must agree on is the **shape** - `id` on a category, on
 * an item, on a variant - and that is asserted by the emulator spec of the
 * backfill reading back what the library's types describe.
 */

/** A menu document as it is stored, which says nothing about its own shape. */
export interface StoredMenuItem {
  id?: string;
  variants?: StoredMenuItem[];
  [field: string]: unknown;
}

export interface StoredMenuCategory {
  id?: string;
  items?: StoredMenuItem[];
  [field: string]: unknown;
}

/** What one pass of {@link backfillMenuIds} had to add. */
export interface MenuIdBackfill {
  categories: StoredMenuCategory[];
  /** Categories that had no id. */
  categoriesFilled: number;
  /** Items and variants that had no id, counted together. */
  itemsFilled: number;
}

/**
 * One menu identifier.
 *
 * A v4 UUID rather than a Firestore document id, because a menu item is not a
 * document: there is no collection to allocate an id from, and the whole menu
 * lives in one document as nested arrays.
 */
export const createMenuEntityId = (): string => randomUUID();

const backfillItemIds = (
  items: StoredMenuItem[] | undefined,
): { items: StoredMenuItem[]; filled: number } => {
  let filled = 0;

  const withIds = (items ?? []).map((item) => {
    const variants = item.variants ? backfillItemIds(item.variants) : undefined;

    filled += variants?.filled ?? 0;

    if (item.id) {
      return variants?.filled ? { ...item, variants: variants.items } : item;
    }

    filled++;

    return {
      ...item,
      id: createMenuEntityId(),
      ...(variants ? { variants: variants.items } : {}),
    };
  });

  return { items: withIds, filled };
};

/**
 * Gives every category, item and variant of one stored menu an id, where it
 * has none.
 *
 * Idempotent: an id that already exists is never replaced. That is what makes
 * the operator surface a plain button - a second press over an already-migrated
 * collection reports zero and writes nothing - and it is also the acceptance
 * criterion of issue #1099 that matters most, because replacing an id is
 * exactly the silent repointing the ids exist to prevent.
 */
export const backfillMenuIds = (
  categories: StoredMenuCategory[] | undefined,
): MenuIdBackfill => {
  let categoriesFilled = 0;
  let itemsFilled = 0;

  const withIds = (categories ?? []).map((category) => {
    const items = backfillItemIds(category.items);
    itemsFilled += items.filled;

    const next: StoredMenuCategory = items.filled
      ? { ...category, items: items.items }
      : category;

    if (next.id) {
      return next;
    }

    categoriesFilled++;

    return { ...next, id: createMenuEntityId() };
  });

  return { categories: withIds, categoriesFilled, itemsFilled };
};
