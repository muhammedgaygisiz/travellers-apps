import { Injectable, computed, signal } from '@angular/core';
import {
  createOrderLineSnapshot,
  findMenuExtraForItem,
  findMenuItemById,
  isMenuVariantAvailable,
  MAX_ORDER_LINES,
  MAX_ORDER_LINE_QUANTITY,
  tableOrderTotal,
} from 'model';
import type {
  ExtraItem,
  Menu,
  MenuItem,
  OrderLineSnapshot,
  SubmitTableOrderLine,
} from 'model';
import { clearStored, readStored, writeStored } from './table-order-storage';

/** Where one table's unsent cart lives between visits to the screen. */
export const TABLE_CART_KEY_PREFIX = 'table-cart:';

/**
 * The cart a guest builds at a table (GitHub issue #1103).
 *
 * ## It never reaches Firestore, and it does survive a reload
 *
 * Nothing here reaches the restaurant's database. A cart is a few minutes of
 * somebody changing their mind, and writing each of those minutes to Firestore
 * would cost the restaurant a write per tap for a document nobody reads. What
 * the restaurant learns is the order, at the moment it is sent.
 *
 * It is kept on the **phone**, though, which issue #1103 left to issue #1108
 * and this is it. A guest at a table puts the phone in their pocket, the wifi
 * drops the tab, and a cart that had to be rebuilt from memory is where people
 * give up and wave at a waiter instead. The objection the earlier issue raised
 * was about who pays for a guest changing their mind, and the answer is still
 * nobody: device storage costs the restaurant nothing and leaves the device
 * never.
 *
 * ## What is stored is ids, not dishes
 *
 * A row is put back together from the menu that is on screen now, so a cart
 * restored an hour later cannot carry a dish that has been taken off, renamed
 * or repriced in the meantime. Storing the {@link MenuItem} itself would be
 * storing a copy of the menu on the phone and then ordering from the copy -
 * which is the price-integrity problem this whole flow refuses, with the stale
 * data one layer further away.
 *
 * ## One line per dish, variant and set of extras
 *
 * Adding the Margherita twice raises the quantity of one line rather than
 * appending a second. It is what a guest tapping "add" twice means, and it is
 * what keeps the cart short enough to read on a phone.
 *
 * The extras are part of that identity (GitHub issue #1598), because they are
 * part of what was ordered: a Margherita with extra cheese and a Margherita
 * without are two different plates and cost two different amounts, so merging
 * them onto one row would charge for the cheese twice or not at all.
 *
 * The consequence is that a note belongs to a *line* and therefore to every
 * unit on it: a guest ordering two Margheritas cannot ask for basil on one of
 * them. That is the issue's "per-item notes" read literally, and the
 * alternative - a row per unit - is a cart that grows a line every time
 * somebody orders a round of the same beer.
 *
 * ## The prices are the menu's, taken once
 *
 * Every line carries the price off the {@link MenuItem} it was built from, and
 * {@link toRequestLines} sends those prices with the order. The backend
 * compares each one to the live menu and refuses the order if any has moved,
 * which is how "the prices on the order are the prices the guest saw" survives
 * an owner repricing a dish mid-meal. So the number here is not a convenience:
 * it is the claim the whole check is run against.
 */

/** One row of the cart. */
export interface TableCartLine {
  /**
   * Identifies the row, derived from the dish and the variant.
   *
   * Derived rather than generated, for the same reason a session id is: adding
   * the same thing twice has to address the row that already exists, and a
   * generated key would make that a search by two fields at every call site.
   */
  readonly key: string;
  readonly item: MenuItem;
  /** The variant chosen, where the dish has any. */
  readonly variant?: MenuItem;
  readonly quantity: number;
  /** What the guest asked for. `''` rather than absent while being typed. */
  readonly notes: string;
  /**
   * The extras ticked on this row, in the order the menu prints them.
   *
   * Always an array, empty where none were ticked. Absent-versus-empty is a
   * distinction the *stored* order draws, because a document is read back by
   * things that have to branch on it; a row being built on a phone is read by
   * one screen, and giving it two spellings of "no extras" would put the
   * branch in every one of them.
   */
  readonly extras: readonly ExtraItem[];
}

/**
 * The row one dish, variant and set of extras occupy.
 *
 * The extra ids are sorted before they are joined, so a guest who ticks cheese
 * then chilli lands on the row they made by ticking chilli then cheese. The
 * key is an address and the order things were tapped in is not part of what
 * was ordered.
 */
export const cartLineKey = (
  item: MenuItem,
  variant?: MenuItem,
  extras: readonly ExtraItem[] = [],
): string => {
  const dish = variant ? `${item.id}:${variant.id}` : item.id;
  const ticked = [...extras].map((extra) => extra.id).sort();

  return ticked.length ? `${dish}+${ticked.join('+')}` : dish;
};

/**
 * The unit price of one row: the variant's where there is one.
 *
 * Read through {@link createOrderLineSnapshot} rather than as a ternary, so
 * "the variant's price, the dish's name" is decided in the one place issue
 * #1099 put it. A second ternary here would be a second chance to charge for
 * the small pizza and serve the large one.
 */
const snapshotOf = (line: TableCartLine, currency: string): OrderLineSnapshot =>
  createOrderLineSnapshot({
    item: line.item,
    ...(line.variant ? { variant: line.variant } : {}),
    quantity: line.quantity,
    currency,
    notes: line.notes,
    extras: line.extras,
  });

/**
 * One row as the phone keeps it: ids and what the guest chose, never a dish.
 *
 * The dish is rebuilt from the live menu on the way back in, so the stored
 * copy cannot become a second, stale menu that an order is priced from.
 */
interface StoredCartLine {
  itemId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
  /** The extras ticked, by id alone. Re-priced off the live menu on the way back. */
  extraIds?: string[];
}

const toStoredLine = (line: TableCartLine): StoredCartLine => ({
  itemId: line.item.id,
  ...(line.variant ? { variantId: line.variant.id } : {}),
  quantity: line.quantity,
  ...(line.notes ? { notes: line.notes } : {}),
  ...(line.extras.length
    ? { extraIds: line.extras.map((extra) => extra.id) }
    : {}),
});

const isStoredCartLine = (value: unknown): value is StoredCartLine => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const row = value as Partial<Record<keyof StoredCartLine, unknown>>;

  return (
    typeof row.itemId === 'string' &&
    row.itemId.length > 0 &&
    typeof row.quantity === 'number' &&
    Number.isFinite(row.quantity) &&
    // Checked rather than trusted, unlike `notes`, because the restore
    // *iterates* this one: a stored value that is a number rather than a list
    // would throw inside the rebuild and take the whole cart down with it,
    // which is the failure this parser exists to keep off the screen.
    (row.extraIds === undefined ||
      (Array.isArray(row.extraIds) &&
        row.extraIds.every((id) => typeof id === 'string')))
  );
};

/**
 * The cart as it was stored, with anything unreadable left out.
 *
 * A half-written or stale row is dropped rather than rebuilt: the entry
 * outlives the app version that wrote it, and a cart that cannot be parsed must
 * not take the ordering screen down with it.
 */
const parseStoredCart = (value: unknown): StoredCartLine[] | undefined =>
  Array.isArray(value) ? value.filter(isStoredCartLine) : undefined;

@Injectable()
export class TableCartService {
  private readonly rows = signal<readonly TableCartLine[]>([]);

  readonly lines = this.rows.asReadonly();

  readonly isEmpty = computed(() => this.rows().length === 0);

  /** How many dishes are in the cart, counting quantities. */
  readonly count = computed(() =>
    this.rows().reduce((sum, line) => sum + line.quantity, 0),
  );

  /** Whether the cart has as many rows as an order may carry. */
  readonly isFull = computed(() => this.rows().length >= MAX_ORDER_LINES);

  /** Where this cart is kept, once the screen has said which table it is. */
  private storageKey = '';

  /**
   * The running total, in the menu's currency.
   *
   * Computed through the same `tableOrderTotal` the backend stores on the
   * order, so the figure the guest agreed to send and the figure the restaurant
   * recorded are one number computed once. The currency is irrelevant to the
   * arithmetic and is passed only so the snapshot is a real one.
   */
  readonly total = computed(() =>
    tableOrderTotal(this.rows().map((line) => snapshotOf(line, ''))),
  );

  /**
   * Puts a dish in the cart, or raises the quantity of the row it already has.
   *
   * An unavailable dish is refused rather than added. The menu marks it off and
   * the button is disabled, so reaching here means a second entry point - and a
   * cart that accepts one produces an order the backend refuses, which the
   * guest experiences as the app having let them build something impossible.
   */
  add(
    item: MenuItem,
    variant?: MenuItem,
    extras: readonly ExtraItem[] = [],
  ): void {
    // `variant ?? item` collapses the two cases into the one rule: a plain
    // dish is checked against itself, and a variant is checked against itself
    // *and* the dish it belongs to - because unavailability travels down.
    if (!isMenuVariantAvailable(item, variant ?? item)) {
      return;
    }

    // A dish with no usable price is refused here, and this is the only place
    // it can be. `MenuItem.price` is required by the type and absent in a menu
    // written loosely, and the renderer above draws such a dish with no price
    // rather than hiding it - so the guest can tap "add". The order would then
    // carry a price the callable refuses as a malformed *argument*, which
    // reaches the screen as "something went wrong on our side": the one
    // sentence this whole design exists to keep away from somebody sitting at
    // a table.
    if (!Number.isFinite((variant ?? item).price)) {
      return;
    }

    const key = cartLineKey(item, variant, extras);
    const existing = this.rows().find((line) => line.key === key);

    if (existing) {
      this.setQuantity(key, existing.quantity + 1);

      return;
    }

    if (this.isFull()) {
      return;
    }

    this.setRows([
      ...this.rows(),
      {
        key,
        item,
        ...(variant ? { variant } : {}),
        quantity: 1,
        notes: '',
        extras: [...extras],
      },
    ]);
  }

  /**
   * Sets a row's quantity, removing the row at zero.
   *
   * Zero removes rather than storing an empty row, because a row of nothing is
   * a line the backend refuses and a line the guest thinks they deleted. Above
   * the cap it clamps rather than refusing: somebody holding the plus button is
   * not making a decision the app should argue with.
   */
  setQuantity(key: string, quantity: number): void {
    if (quantity < 1) {
      this.remove(key);

      return;
    }

    const clamped = Math.min(Math.floor(quantity), MAX_ORDER_LINE_QUANTITY);

    this.setRows(
      this.rows().map((line) =>
        line.key === key ? { ...line, quantity: clamped } : line,
      ),
    );
  }

  /** One more of this row. */
  increase(key: string): void {
    const line = this.rows().find((entry) => entry.key === key);

    if (line) {
      this.setQuantity(key, line.quantity + 1);
    }
  }

  /** One fewer, removing the row when the last one goes. */
  decrease(key: string): void {
    const line = this.rows().find((entry) => entry.key === key);

    if (line) {
      this.setQuantity(key, line.quantity - 1);
    }
  }

  remove(key: string): void {
    this.setRows(this.rows().filter((line) => line.key !== key));
  }

  /** What the guest asked for on this row. Trimmed when it is sent, not here. */
  setNotes(key: string, notes: string): void {
    this.setRows(
      this.rows().map((line) => (line.key === key ? { ...line, notes } : line)),
    );
  }

  /**
   * Empties the cart.
   *
   * Called when an order lands, and never on a refusal: a guest whose
   * Margherita sold out still wants the other three things they chose, and
   * clearing the cart would make them build it again to find out whether the
   * rest was fine.
   */
  clear(): void {
    this.setRows([]);
  }

  /**
   * Drops the rows a menu no longer has, and answers how many went.
   *
   * Used after the menu is reloaded, so a cart built before a refusal is
   * brought into line with what the kitchen is actually serving rather than
   * being sent again unchanged. A row whose dish is still there but repriced is
   * kept: the price is the guest's to re-read and agree to, and silently
   * updating it would be the recharging this whole design refuses.
   */
  dropMissing(isStillOffered: (line: TableCartLine) => boolean): number {
    const kept = this.rows().filter(isStillOffered);
    const dropped = this.rows().length - kept.length;

    if (dropped) {
      this.setRows(kept);
    }

    return dropped;
  }

  /**
   * Names the table this cart belongs to, so it can be kept and found again
   * (GitHub issue #1108).
   *
   * Keyed by the restaurant and the table rather than by the guest's account.
   * A phone is one guest, and the anonymous uid it holds is not something the
   * guest chose or can be asked about - a cart filed under a uid the app
   * re-minted is a cart the guest rebuilt for no reason they could see.
   *
   * A phone that scanned table 5 at lunch and table 12 at dinner has two
   * carts, which is right: they are two meals.
   */
  useTable(restaurantId: string, tableId: string): void {
    this.storageKey = `${TABLE_CART_KEY_PREFIX}${restaurantId}:${tableId}`;
  }

  /**
   * Puts back what this phone was building, against the menu on screen now.
   *
   * Every row is rebuilt from the live menu rather than from the stored copy,
   * which is what makes a restored cart safe: a dish taken off the menu, a
   * variant withdrawn, an extra no longer offered or a dish with no price left
   * is dropped instead of being carried into an order the backend would refuse
   * line by line. A dish that is merely *repriced* comes back at the new price,
   * because the price a guest agrees to is the one they can see on the screen
   * they are looking at.
   *
   * Anything already in the cart wins. The restore is asynchronous and a guest
   * can tap "add" while it is still reading, and a read that overwrote what
   * they just did would lose the one row they were watching.
   */
  async restore(menu: Menu): Promise<void> {
    if (!this.storageKey) {
      return;
    }

    const stored = await readStored(this.storageKey, parseStoredCart);

    if (!stored?.length) {
      return;
    }

    const restored = stored
      .map((row) => this.rebuild(menu, row))
      .filter((row): row is TableCartLine => row !== undefined)
      .filter((row) => !this.rows().some((line) => line.key === row.key));

    if (restored.length) {
      this.setRows([...this.rows(), ...restored].slice(0, MAX_ORDER_LINES));
    }
  }

  /** One stored row as a cart line, or nothing where the menu lost it. */
  private rebuild(menu: Menu, row: StoredCartLine): TableCartLine | undefined {
    const item = findMenuItemById(menu, row.itemId);

    if (!item) {
      return undefined;
    }

    const variant = row.variantId
      ? (item.variants ?? []).find((entry) => entry.id === row.variantId)
      : undefined;

    if (row.variantId && !variant) {
      return undefined;
    }

    // The same two guards `add` applies, and for the same reasons. A row that
    // came back unavailable or unpriced is a row the guest would be allowed to
    // send and the backend would refuse, which reads as the app having let them
    // build something impossible.
    if (
      !isMenuVariantAvailable(item, variant ?? item) ||
      !Number.isFinite((variant ?? item).price)
    ) {
      return undefined;
    }

    // The extras are resolved against the live menu too, and a row whose extra
    // has since been withdrawn is dropped whole rather than brought back
    // without it. Dropping the extra alone would put a plain pizza in front of
    // somebody who ordered one with cheese on it and say nothing - the same
    // silent substitution the variant rule above refuses.
    const extras: ExtraItem[] = [];

    for (const extraId of row.extraIds ?? []) {
      const extra = findMenuExtraForItem(menu, item.id, extraId);

      if (!extra || !Number.isFinite(extra.price)) {
        return undefined;
      }

      extras.push(extra);
    }

    return {
      key: cartLineKey(item, variant, extras),
      item,
      ...(variant ? { variant } : {}),
      quantity: Math.min(
        Math.max(1, Math.floor(row.quantity)),
        MAX_ORDER_LINE_QUANTITY,
      ),
      notes: row.notes ?? '',
      extras,
    };
  }

  /**
   * The rows, in memory and on the device.
   *
   * The signal is written first and unconditionally, following the staff
   * transition queue: a phone whose storage is full or blocked still has a
   * guest in front of it who has just added a dish, and the cart is worth
   * keeping for this screen even when it cannot be kept for the next one.
   */
  private setRows(next: readonly TableCartLine[]): void {
    this.rows.set(next);

    if (!this.storageKey) {
      return;
    }

    void (next.length
      ? writeStored(this.storageKey, next.map(toStoredLine))
      : clearStored(this.storageKey));
  }

  /**
   * The cart as the callable takes it.
   *
   * The price on each line is what this cart has been showing, which is the
   * whole point of sending it: the backend compares it to the live menu and
   * refuses the order if it has moved.
   */
  toRequestLines(currency: string): SubmitTableOrderLine[] {
    return this.rows().map((line) => {
      const snapshot = snapshotOf(line, currency);

      return {
        menuItemId: snapshot.menuItemId,
        ...(snapshot.variantId ? { variantId: snapshot.variantId } : {}),
        quantity: snapshot.quantity,
        ...(snapshot.notes ? { notes: snapshot.notes } : {}),
        price: snapshot.price,
        ...(snapshot.extras?.length
          ? {
              extras: snapshot.extras.map((extra) => ({
                extraId: extra.extraId,
                price: extra.price,
              })),
            }
          : {}),
      };
    });
  }
}
