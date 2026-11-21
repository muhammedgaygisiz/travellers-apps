/**
 * The key two dish names match on (GitHub issue #2216): accents, case,
 * punctuation and spacing do not count, so "Crème brûlée" and "creme brulee"
 * are the same dish. A name that keeps nothing, such as one written only in a
 * non-latin script, is compared lowercased instead, so all of those do not
 * collapse into one key.
 *
 * Candidate verification groups Bites into Initial Menu items by this key, and
 * the business app's Guest Bites page suggests the dish a Bite matches by it.
 * The Functions project cannot import this library, so it keeps a copy in
 * `shared/utils/dish-name-key.ts`, and `dish-name-key-parity.spec.ts` there
 * fails when the two differ. Change both together.
 */
export const dishNameKey = (name: string): string => {
  const trimmed = name.trim();
  const normalized = trimmed
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return normalized || trimmed.toLocaleLowerCase();
};
