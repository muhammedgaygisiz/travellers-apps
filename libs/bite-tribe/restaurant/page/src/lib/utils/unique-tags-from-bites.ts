import { Bite } from 'model';

const LEADING_HASHES = /^#+/;

/**
 * Aggregate the tags of a place's Bites into the list the place page shows.
 *
 * Bites store tags exactly as they were typed, so the same tag arrives as
 * `Chinawok`, `#Chinawok` and `chinawok`. Comparison strips the leading `#`
 * and folds case; the first spelling that survives that folding is the one
 * shown, and the `#` is never part of it. See GitHub issue #1389.
 */
export const uniqueTagsFromBites = <T extends Pick<Bite, 'tags'>>(
  bites: T[],
): string[] => {
  const tagsByComparableForm = new Map<string, string>();

  bites
    .flatMap((bite) => bite.tags || [])
    .forEach((tag) => {
      const displayTag = tag.trim().replace(LEADING_HASHES, '').trim();

      if (!displayTag) {
        return;
      }

      const comparableTag = displayTag.toLowerCase();

      if (!tagsByComparableForm.has(comparableTag)) {
        tagsByComparableForm.set(comparableTag, displayTag);
      }
    });

  return [...tagsByComparableForm.values()];
};
