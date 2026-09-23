import type { Bite, TableVisitBillLine, VisitSummary } from 'model';

/**
 * A dish somebody ordered, as the Bite form wants it (GitHub issue #1112).
 *
 * ## Why this is a function and not a screen's private helper
 *
 * Two screens create Bites from a meal - the table order screen, while the
 * guest is still standing up, and the visits page weeks later - and the answer
 * has to be identical. A dish that came out with a different price depending
 * on which screen the guest tapped would be the one thing this whole epic is
 * against: the order is the evidence.
 *
 * ## Every required field, and no more
 *
 * The Bite form requires `name`, `place`, `price`, `currency` and `position`.
 * All five are here, which is what makes the acceptance criterion true: what
 * is left for the guest is a photo, a rating and a comment, and none of those
 * is required to publish.
 *
 * `price` is the **unit** price rather than the line total. A guest who
 * ordered two pizzas ate one of them, and a Bite priced at both is a Bite that
 * lies about what a Margherita costs - which is the number issue #452 will
 * one day suggest from.
 *
 * `place` is filled from the restaurant's name **as well as** `restaurantId`,
 * because the form marks it required and a draft carrying only the id cannot
 * be submitted. It is not a fallback: the id is the verified link and the name
 * is the label beside it.
 *
 * `position` is the restaurant's, copied onto the summary when the visit
 * closed. Without it the form would ask, and a guest reading a summary at home
 * would file last night's dish at their kitchen table - so a summary written
 * before the position was carried, or for a restaurant that has none, leaves
 * it out and the form asks as it would for any other Bite.
 */
export const biteFromOrderLine = (
  summary: VisitSummary,
  line: TableVisitBillLine,
): Partial<Bite> => ({
  name: line.variantName ? `${line.name} - ${line.variantName}` : line.name,
  place: summary.restaurantName,
  restaurantId: summary.restaurantId,
  // The evening, so the nightly reminder knows this meal has been written
  // about and stops asking (`RD-TS-51`). It is not the menu-item link, which
  // is issue #1113's.
  visitId: summary.id,
  // The dish and the size it was eaten in (issue #1113). `menuItemId` is what
  // the count under a menu row aggregates on; `variantId` rides along so a
  // per-variant view stays possible without going back through every Bite.
  ...(line.menuItemId ? { menuItemId: line.menuItemId } : {}),
  ...(line.variantId ? { variantId: line.variantId } : {}),
  price: line.unitPrice,
  currency: summary.currency,
  ...(summary.restaurantPosition
    ? { position: summary.restaurantPosition }
    : {}),
  // Emptied rather than omitted, following the menu-item flow this mirrors:
  // the whole form value is handed to Firestore, which rejects `undefined` and
  // takes the Bite down with it - the defect issue #1233 was.
  userId: '',
});
