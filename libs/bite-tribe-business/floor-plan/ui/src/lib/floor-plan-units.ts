import { Millimetres } from 'model';

/**
 * The one place metres and millimetres meet (GitHub issue #1082).
 *
 * An owner knows their room in metres — "the terrace is eight by twelve" — and
 * the model stores integer millimetres, because a plan has to be printable to
 * scale and snapping repeatedly must not accumulate floating-point drift (see
 * the coordinate system in `libs/bite-tribe-common/model/src/lib/floor-plan.ts`).
 *
 * So exactly two conversions exist and both live here: at the form boundary,
 * and in the canvas's scale reference. A millimetre that reaches an input, or a
 * metre that reaches Firestore, is the bug this module exists to prevent.
 */
export const METRE_IN_MILLIMETRES = 1000;

/**
 * Metres from a form field, rounded to a whole millimetre.
 *
 * Rounded rather than truncated, so `8.0001` entered by a stray keystroke is
 * 8 m and not 8.0001 m stored as 8000 with a millimetre lost.
 */
export const metresToMillimetres = (metres: number): Millimetres =>
  Math.round(metres * METRE_IN_MILLIMETRES);

/** Millimetres as metres, for display. Not rounded: the caller formats. */
export const millimetresToMetres = (millimetres: Millimetres): number =>
  millimetres / METRE_IN_MILLIMETRES;

/**
 * Millimetres as a short metre label, such as `8 m` or `0.5 m`.
 *
 * `m` is the SI symbol and is deliberately not a Transloco key: it is the same
 * in every language the business app runs in, and a key would make this
 * library depend on an app's catalogue for a single character.
 */
export const formatMetres = (millimetres: Millimetres): string =>
  `${Number(millimetresToMetres(millimetres).toFixed(2))} m`;
