import { STALE_PENDING_UPLOAD_MS } from 'bite-tribe-common/bite';
import type { PublicUser } from 'model';

/**
 * The profile photo status to render: the stored one, except that a
 * `pending` upload old enough to be abandoned reads as `failed`, as a Bite
 * photo's does (GitHub issue #1953). Without a start time a `pending` upload
 * stays `pending`, because claiming failure for a photo that may still arrive
 * is worse than waiting.
 */
export const getEffectivePhotoStatus = (
  user: PublicUser | undefined,
  now: number = Date.now(),
): PublicUser['photoStatus'] => {
  if (user?.photoStatus !== 'pending') {
    return user?.photoStatus;
  }

  const startedAt = user.photoUploadStartedAtTimestamp;

  if (typeof startedAt !== 'number') {
    return 'pending';
  }

  return now - startedAt >= STALE_PENDING_UPLOAD_MS ? 'failed' : 'pending';
};
