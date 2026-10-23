import type { Bite } from 'model';

/**
 * Whether a viewer may turn a Bite into a share image (`UC-SBS` `R-3`).
 *
 * Only their own Bite, for now. The photo belongs to whoever took it, and
 * BiteTribe has no terms of use yet that license anyone else to copy it onto
 * another platform, so every other Bite keeps the link share alone. Issue #1772
 * widens this to a public creator who has accepted the terms; it is one
 * function so that the widening happens here and nowhere else.
 */
export const canShareBiteAsImage = (
  bite: Pick<Bite, 'userId'>,
  viewerId: string | undefined,
): boolean => !!viewerId && bite.userId === viewerId;
