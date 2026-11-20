/**
 * The refusal categories the image check names (issue #2138), each with its
 * own line of copy. Anything else - the `sample` verdict outside production,
 * or a category added later - reads as the generic line.
 */
const REFUSAL_REASONS = [
  'sexual',
  'violence',
  'hate',
  'self_harm',
  'illegal',
] as const;

/**
 * The Transloco key of the line that says why the image check refused a
 * photo, shared by the Bite photo (issue #2139) and the profile photo (issue
 * #2140) so both say the same thing.
 */
export const photoRefusalReasonKey = (category: string | undefined): string => {
  const known = REFUSAL_REASONS.find((reason) => reason === category);

  return `photo-refused-reason-${known ?? 'other'}`;
};
