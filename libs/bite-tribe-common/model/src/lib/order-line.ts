import type { MenuItem } from './menu';

/**
 * What one line of a table order recorded about the dish it is for
 * (GitHub issue #1099).
 *
 * ## Why a line copies the menu instead of pointing at it
 *
 * A menu is edited in place. The owner who raises a price on Tuesday does not
 * write a new menu, they change the number in the one that exists, and an order
 * line that read its price through {@link menuItemId} would then say the guest
 * was charged Tuesday's price for Monday's dinner. The same edit that fixes a
 * typo in a dish name would rewrite last month's receipts.
 *
 * So the line carries its own copy of everything a reader needs to render it -
 * the name, the price, the currency, the variant - and carries the id **as
 * well**, for the questions the copy cannot answer: is this dish still on the
 * menu, has the guest ordered it before, which item does the Bite created from
 * this line belong to. The copy is the record; the id is the link.
 *
 * That split is what makes the last acceptance criterion of issue #1099 hold.
 * An item deleted from the menu takes {@link findMenuItemById} to `undefined`
 * and takes nothing else with it: the line still names a dish, a price and a
 * currency, so a receipt from before the deletion reads exactly as it did.
 *
 * ## Immutable once submitted
 *
 * Every field is `readonly`, which is the whole of what this shape promises. A
 * line under construction - a guest raising the quantity, typing "no onions",
 * changing their mind - is a cart line, and a cart line is not this: it is
 * built into one of these at the moment the order is submitted, and after that
 * nothing edits it. A correction is a staff-side cancellation with a reason
 * (issue #1105), never a rewrite of what the guest agreed to.
 *
 * Written and read by the order submission of issue #1103; nothing writes one
 * yet.
 */
export interface OrderLineSnapshot {
  /**
   * The dish, by {@link MenuItem.id}.
   *
   * The dish and not the variant: "large Margherita" and "small Margherita" are
   * one thing on the menu, and a question like "how often is the Margherita
   * ordered" wants both. Which size was ordered is {@link variantId}.
   */
  readonly menuItemId: string;
  /**
   * The dish's name at the moment of the order.
   *
   * Not the variant's name. A variant is named by its own field, so a line
   * renders as "Margherita (large)" from two fields rather than from one
   * string that has to be taken apart again.
   */
  readonly name: string;
  /**
   * The variant ordered, by its own {@link MenuItem.id}. Absent when the dish
   * has no variants, or the guest ordered it plain.
   */
  readonly variantId?: string;
  /** The variant's name at the moment of the order. Absent with {@link variantId}. */
  readonly variantName?: string;
  /**
   * The unit price charged, at the moment of the order.
   *
   * The variant's price where a variant was ordered, because that is the number
   * the guest was shown. A line total is this times {@link quantity} and is not
   * stored: a stored total is a second copy of an arithmetic fact, free to
   * disagree with the two fields it was derived from.
   */
  readonly price: number;
  /**
   * The currency {@link price} is in, as an ISO 4217 code.
   *
   * Carried on the line rather than looked up, for the same reason as the
   * price: a restaurant that changes the currency it prices in must not change
   * what a past order says it charged.
   *
   * A menu carries no currency today - the consumer menu hardcodes a euro sign
   * and the business editor labels the price with a dollar sign - so where this
   * value is read from is the cart's question in issue #1103. This field is
   * what that answer has to land in.
   */
  readonly currency: string;
  /** How many of this line the guest ordered. At least one. */
  readonly quantity: number;
  /** What the guest asked for, if anything. Absent rather than empty. */
  readonly notes?: string;
}

/** What a caller has to decide; everything else is read off the menu. */
export interface OrderLineRequest {
  /** The dish, as it stands on the menu right now. */
  item: MenuItem;
  /** The variant ordered, out of {@link MenuItem.variants}. */
  variant?: MenuItem;
  quantity: number;
  currency: string;
  notes?: string;
}

/**
 * Takes the copy of a menu item that an order line keeps.
 *
 * One function rather than an object literal at the call site, so that "the
 * price of the variant where there is one" and "the dish's name, never the
 * variant's" are decided once. Getting either wrong produces a line that looks
 * right and charges the wrong amount.
 *
 * The blank notes are dropped rather than stored as `''`: absent means the
 * guest asked for nothing, and an empty string is a third state that every
 * reader would then have to treat as the second.
 */
export const createOrderLineSnapshot = ({
  item,
  variant,
  quantity,
  currency,
  notes,
}: OrderLineRequest): OrderLineSnapshot => ({
  menuItemId: item.id,
  name: item.name,
  ...(variant ? { variantId: variant.id, variantName: variant.name } : {}),
  price: variant ? variant.price : item.price,
  currency,
  quantity,
  ...(notes?.trim() ? { notes: notes.trim() } : {}),
});
