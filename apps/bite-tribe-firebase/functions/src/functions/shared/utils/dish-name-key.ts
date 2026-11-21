/**
 * The key two dish names match on (GitHub issue #2216). A copy of
 * `dishNameKey` in `libs/bite-tribe-common/model`, which the business app's
 * Guest Bites page uses to suggest a dish: the Functions project cannot import
 * that library. `dish-name-key-parity.spec.ts` fails when the two differ, so a
 * Bite verification grouped under one dish is suggested that same dish later.
 *
 * The same steps as `normalizePlaceName`, kept self-contained so the parity
 * check compares one declaration with one declaration.
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
