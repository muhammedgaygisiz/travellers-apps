import type { Bite, Like } from 'model';

/**
 * Shared across every Bite without likes. Nothing mutates the joined list, so
 * one instance keeps the identity stable instead of allocating an array per
 * Bite on each recompute.
 */
const NO_LIKES: readonly Like[] = Object.freeze([]);

/**
 * Reads a Bite's likes out of the index built by {@link groupLikesByBiteId}.
 * Callers group once and then look up per Bite, rather than rescanning the
 * whole like list for each one. See GitHub issue #1357.
 */
export const getLikesForBite = (
  likesByBiteId: ReadonlyMap<string, Like[]> | undefined,
  bite: Bite | undefined,
): Like[] => (bite && likesByBiteId?.get(bite.id)) || (NO_LIKES as Like[]);
