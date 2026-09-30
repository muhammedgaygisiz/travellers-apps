/**
 * The one image status that makes a Bite listable (GitHub issue #1717).
 *
 * Written only by `setBiteImagePathOnUpload`, which runs on a finalized Storage
 * object, so a Bite carrying it has a photo that is known to exist. No check at
 * read time is needed or made.
 *
 * `pending`, `failed` and an absent field are all not listable. That includes a
 * fresh `pending` upload: the few seconds before the finalize trigger lands are
 * not worth a second rule, and the Bite appears on its own once it does.
 */
export const LISTABLE_IMAGE_STATUS = 'uploaded';

/**
 * Whether a Bite may be offered to somebody other than its creator.
 *
 * A visibility rule, not a domain invariant: a Bite without its photo is still a
 * valid Bite, and creation, storage, aggregates and deletion ignore this. It
 * decides only who is shown one.
 *
 * Deliberately not {@link getEffectiveImageStatus} from `bite-tribe-common/bite`:
 * its stale-pending rule governs what a visible card says, and only `uploaded`
 * passes here whatever that rule answers.
 *
 * `functions/shared/utils/bite-listability.ts` repeats this for the callables,
 * which cannot import the workspace libraries; `bite-listability-parity.spec.ts`
 * keeps the two in step.
 */
export const isListableBite = (bite: { imageStatus?: unknown }): boolean =>
  bite.imageStatus === LISTABLE_IMAGE_STATUS;

/**
 * Whether one viewer may be shown a Bite: every listable Bite, and their own
 * whatever its upload state, so a poster can still find the Bite and retry its
 * photo.
 */
export const isBiteVisibleTo = (
  bite: { imageStatus?: unknown; userId?: unknown },
  viewerUid: string | undefined,
): boolean =>
  isListableBite(bite) || (!!viewerUid && bite.userId === viewerUid);
