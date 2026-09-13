import { Injectable, computed, signal } from '@angular/core';
import {
  createOrderLineSnapshot,
  isMenuVariantAvailable,
  MAX_ORDER_LINES,
  MAX_ORDER_LINE_QUANTITY,
  tableOrderTotal,
} from 'model';
import type { MenuItem, OrderLineSnapshot, SubmitTableOrderLine } from 'model';

/**
 * The cart a guest builds at a table (GitHub issue #1103).
 *
 * ## It is never stored
 *
 * Nothing here reaches Firestore. A cart is a few minutes of somebody changing
 * their mind, and writing each of those minutes to a restaurant's database
 * would cost the restaurant a write per tap for a document nobody reads. What
 * the restaurant learns is the order, at the moment it is sent.
 *
 * The cost is that a reload loses the cart. That is the honest trade for now -
 * a cart that survived a reload would have to live somewhere, and the somewhere
 * that is free is the phone's own storage, which is issue #1108's territory
 * along with the offline queue it would be half of.
 *
 * ## One line per dish and variant
 *
 * Adding the Margherita twice raises the quantity of one line rather than
 * appending a second. It is what a guest tapping "add" twice means, and it is
 * what keeps the cart short enough to read on a phone.
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
}

/** The row one dish and variant occupy. */
export const cartLineKey = (item: MenuItem, variant?: MenuItem): string =>
  variant ? `${item.id}:${variant.id}` : item.id;

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
  });

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
  add(item: MenuItem, variant?: MenuItem): void {
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

    const key = cartLineKey(item, variant);
    const existing = this.rows().find((line) => line.key === key);

    if (existing) {
      this.setQuantity(key, existing.quantity + 1);

      return;
    }

    if (this.isFull()) {
      return;
    }

    this.rows.update((lines) => [
      ...lines,
      {
        key,
        item,
        ...(variant ? { variant } : {}),
        quantity: 1,
        notes: '',
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

    this.rows.update((lines) =>
      lines.map((line) =>
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
    this.rows.update((lines) => lines.filter((line) => line.key !== key));
  }

  /** What the guest asked for on this row. Trimmed when it is sent, not here. */
  setNotes(key: string, notes: string): void {
    this.rows.update((lines) =>
      lines.map((line) => (line.key === key ? { ...line, notes } : line)),
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
    this.rows.set([]);
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
      this.rows.set(kept);
    }

    return dropped;
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
      };
    });
  }
}
