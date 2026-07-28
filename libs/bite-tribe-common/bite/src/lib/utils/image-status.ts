import type { Bite } from 'model';

/**
 * How long a Bite may claim its photo is still uploading before viewers are
 * told the upload failed.
 *
 * A `pending` document is only ever cleared by something else happening: the
 * storage finalize trigger writes `uploaded`, and the client writes `failed`
 * from the upload error branch. Neither is guaranteed — the upload promise does
 * not resolve when the device goes offline mid-transfer (the same reason
 * `createBite` cannot await its own write), so a Bite can sit on `pending`
 * forever with nobody left to correct it.
 *
 * Ten minutes is far longer than a photo upload takes even on a poor mobile
 * connection, so a Bite still pending after it has almost certainly lost its
 * image rather than being slow.
 */
export const STALE_PENDING_UPLOAD_MS = 10 * 60 * 1000;

const getCreatedAtMs = (bite: Bite): number | undefined => {
  if (typeof bite.createdAtTimestamp === 'number') {
    return bite.createdAtTimestamp;
  }

  if (bite.createdAt) {
    const parsed = Date.parse(bite.createdAt);

    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
};

/**
 * The image status to render, which is the stored one except that a `pending`
 * upload old enough to be abandoned reads as `failed`.
 *
 * A Bite with no usable creation timestamp keeps its stored status: there is no
 * way to tell an abandoned upload from a fresh one, and claiming failure for a
 * photo that may still arrive is worse than waiting.
 */
export const getEffectiveImageStatus = (
  bite: Bite,
  now: number = Date.now(),
): Bite['imageStatus'] => {
  if (bite.imageStatus !== 'pending') {
    return bite.imageStatus;
  }

  const createdAt = getCreatedAtMs(bite);

  if (createdAt === undefined) {
    return 'pending';
  }

  return now - createdAt >= STALE_PENDING_UPLOAD_MS ? 'failed' : 'pending';
};
