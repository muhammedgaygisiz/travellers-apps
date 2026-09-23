import type { Bite } from 'model';

/**
 * Where a Bite came from, carried onto the document the form submits
 * (GitHub issues #1112, #1113, #1114).
 *
 * ## Why this exists at all
 *
 * The create form hands its raw value to Firestore, so a field that is not a
 * form control is a field the Bite is written without. `visitId`, `menuItemId`
 * and `variantId` are not form controls and cannot be: the guest can never see
 * or change them, and a control for something nobody can edit is a control in
 * name only.
 *
 * Which is exactly how they were being lost. `biteFromOrderLine` set all three
 * on the cached draft, the form patched the fields it knew and dropped the
 * rest, and the Bite reached Firestore with no link to the meal or the dish it
 * came from - so the menu-item aggregates of #1113 counted nothing written
 * through the app, and the summary sweep of #1112 went on asking a guest to
 * write a Bite they had already written. Both features' tests passed, because
 * both tested the backend against a document that carried the link.
 *
 * ## Why it is merged at submit rather than patched into the form
 *
 * Provenance is decided when the draft is made and is never edited afterwards,
 * so it travels beside the form rather than through it. The draft is the
 * creation session's own - `CreateBiteContainer` drops it on every way out of
 * the form - so the draft in hand at submit is the one that prefilled the
 * fields being submitted.
 *
 * ## Why the restaurant has to still match
 *
 * A menu item id means nothing without the restaurant it belongs to: the
 * aggregate is filed at `/restaurants/{restaurantId}/menuItemStats/{id}`. The
 * form lets somebody start from a dish and then pick a different restaurant,
 * which clears `restaurantId` on its own - and a link carried past that point
 * would file a count under a restaurant whose menu never had that dish. So the
 * link survives exactly as long as the Bite is still about the restaurant the
 * draft named.
 */

/** The fields a draft carries that the form cannot. */
export type BiteProvenance = Pick<Bite, 'visitId' | 'menuItemId' | 'variantId'>;

const linkOf = (draft: Partial<Bite> | undefined): BiteProvenance => ({
  ...(draft?.visitId ? { visitId: draft.visitId } : {}),
  ...(draft?.menuItemId ? { menuItemId: draft.menuItemId } : {}),
  ...(draft?.variantId ? { variantId: draft.variantId } : {}),
});

/**
 * The submitted Bite with the draft's provenance on it, where it still applies.
 *
 * Absent fields are left absent rather than written empty: Firestore stores
 * what it is given, and a `menuItemId: ''` on every hand-written Bite would
 * both be a lie and widen the `menuItemId != null` scan the resync runs.
 */
export const withDraftProvenance = <T extends Partial<Bite>>(
  submitted: T,
  draft: Partial<Bite> | undefined,
): T & BiteProvenance => {
  if (!draft?.restaurantId || draft.restaurantId !== submitted.restaurantId) {
    return submitted;
  }

  return { ...submitted, ...linkOf(draft) };
};

/**
 * What the Bite was made from, for the conversion funnel (GitHub issue #1114).
 *
 * Read off the same links rather than passed down from whichever screen
 * started the draft: the screen knows what it offered, the document knows what
 * was accepted, and a Bite whose link was dropped - by a restaurant change, or
 * by the guest rewriting it into something else - is honestly `manual` no
 * matter which button opened the form.
 *
 * `visit` wins over `menu` where both are present, because a dish somebody
 * ordered and ate is the stronger claim and the funnel this parameter exists
 * for counts meals rather than menu rows.
 */
export type BiteSource = 'visit' | 'menu' | 'manual';

export const biteSourceOf = (bite: Partial<Bite> | undefined): BiteSource => {
  if (bite?.visitId) {
    return 'visit';
  }

  return bite?.menuItemId ? 'menu' : 'manual';
};
