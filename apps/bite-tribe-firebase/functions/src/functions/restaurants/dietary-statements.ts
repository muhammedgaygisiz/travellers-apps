/**
 * The dietary vocabulary the backend needs (GitHub issue #2194), in a module of
 * its own so a spec can read it without loading a callable.
 */

/**
 * A copy of `RESTAURANT_DIETARY_STATEMENTS` in
 * `libs/bite-tribe-common/model/src/lib/dietary-label.ts`, which this project
 * cannot import; `dietary-statements-parity.spec.ts` keeps the two equal.
 */
export const RESTAURANT_DIETARY_STATEMENTS = [
  'fully-plant-based',
  'fully-vegetarian',
  'fully-halal',
  'fully-kosher',
  'dedicated-gluten-free-kitchen',
] as const;

/** `MAX_CROSS_CONTAMINATION_NOTE_LENGTH` in the same model file. */
export const MAX_CROSS_CONTAMINATION_NOTE_LENGTH = 500;
