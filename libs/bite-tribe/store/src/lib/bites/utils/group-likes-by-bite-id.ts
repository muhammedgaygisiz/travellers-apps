import type { Like } from 'model';

/**
 * Indexes likes by the Bite they belong to.
 *
 * The feed selectors join likes onto every Bite they return. Scanning the whole
 * like list once per Bite made that O(bites x likes), which is invisible on a
 * short feed and quadratic on a dense one: in Cologne a single
 * `loadedLikesFromApi` turned 500+ Bites into a quarter of a million
 * comparisons. Grouping once up front makes the join linear. See GitHub issue
 * #1357.
 */
export const groupLikesByBiteId = (
  likes: Like[] | undefined,
): ReadonlyMap<string, Like[]> => {
  const likesByBiteId = new Map<string, Like[]>();

  for (const like of likes ?? []) {
    const likesForBite = likesByBiteId.get(like.biteId);

    if (likesForBite) {
      likesForBite.push(like);
      continue;
    }

    likesByBiteId.set(like.biteId, [like]);
  }

  return likesByBiteId;
};
