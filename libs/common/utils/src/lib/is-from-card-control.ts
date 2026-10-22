/**
 * The controls inside a pressable card that carry an action of their own: any
 * Ionic button or chip, a native button or link, and anything else that opts
 * into the press feedback by itself with `btPressable`.
 */
const CARD_CONTROL =
  'ion-button, ion-chip, button, a, [btPressable]:not(ion-card)';

/**
 * Whether an event on a card started inside one of the card's own controls.
 *
 * A card that opens what it shows from anywhere on its surface must not also
 * open it when a control inside it was the target - the reaction chip, a Rate
 * now, Edit or Delete button, an owner link (issue #1765). Only controls inside
 * `card` count, so the card itself never matches.
 */
export const isFromCardControl = (event: Event, card: Element): boolean => {
  const target = event.target;

  if (!(target instanceof Element)) {
    return false;
  }

  const control = target.closest(CARD_CONTROL);

  return control !== null && control !== card && card.contains(control);
};
