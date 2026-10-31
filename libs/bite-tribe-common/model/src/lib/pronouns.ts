/**
 * The longest pronouns a profile may carry (issue #1826). `firestore.rules`
 * refuses a longer value on `/users/{uid}`, so the form and the rules agree.
 */
export const PRONOUNS_MAX_LENGTH = 40;

/**
 * The pronouns as stored: trimmed, and `undefined` when nothing is left.
 *
 * Empty means absent. A profile that never had the field and one whose owner
 * cleared it read the same, so no reader has to know two ways of saying "none".
 */
export function normalizePronouns(
  pronouns: string | null | undefined,
): string | undefined {
  return pronouns?.trim() || undefined;
}
