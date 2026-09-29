/**
 * Who may be shown a Bite (GitHub issue #1717).
 *
 * `bite-listability.ts` in `libs/bite-tribe-common/model` is the single
 * definition and carries the reasoning. This project cannot import it - its
 * `rootDir` is `src` and it has none of the workspace path mappings - so the
 * rule is repeated here and `bite-listability-parity.spec.ts` keeps the two
 * copies in step.
 *
 * Applied in the same pass that already post-processes each read, never as a
 * query constraint: an equality on `imageStatus` beside the geohash or
 * timestamp range would need a composite index for no gain, and a Bite written
 * before #1168 has no `imageStatus` for Firestore to match.
 */
export const LISTABLE_IMAGE_STATUS = 'uploaded';

export const isListableBite = (bite: { imageStatus?: unknown }): boolean =>
  bite.imageStatus === LISTABLE_IMAGE_STATUS;

export const isBiteVisibleTo = (
  bite: { imageStatus?: unknown; userId?: unknown },
  viewerUid: string | undefined,
): boolean =>
  isListableBite(bite) || (!!viewerUid && bite.userId === viewerUid);
