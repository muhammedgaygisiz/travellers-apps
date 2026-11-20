import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { checkImage } from '../shared/moderation/check-image';
import {
  applyImageVerdict,
  BITE_PHOTO,
  updateDocument,
} from '../shared/moderation/checked-image-subjects';
import { logger } from 'firebase-functions';

const db = getFirestore();

// Matches: images/bites/{biteId}/{filename}
const BITE_IMAGE_PATH_REGEX = /^images\/bites\/([^/]+)\/[^/]+$/;

/**
 * Publishes a Bite's photo once its upload finalizes, after the image check
 * has passed it (GitHub issues #1168, #1717 and #2139).
 *
 * This is the only writer of `imagePath` and of the `uploaded` and `refused`
 * image statuses, with the scheduled recheck that applies the same verdicts
 * (#2142): the rules refuse both from a client. So a photo reaches another
 * account only through here, and only once `checkImage` passed it.
 *
 * - `passed`: writes the download URL and `imageStatus: uploaded`, which makes
 *   the Bite listable.
 * - `refused`: deletes the object, removes any `imagePath` the Bite still
 *   carries, and writes `imageStatus: refused` with the category, so the
 *   creator is told why and can pick a different photo. The Bite is kept.
 * - `unavailable`: the Bite stays `pending` and not listable, and
 *   `recheckPendingImages` checks it again (#2142).
 *
 * See {@link applyImageVerdict} for each write.
 */
export const setBiteImagePathOnUpload = onObjectFinalized(async (event) => {
  const objectPath = event.data.name;

  if (!objectPath) {
    logger.warn('setBiteImagePathOnUpload: no object path found');
    return;
  }

  const match = objectPath.match(BITE_IMAGE_PATH_REGEX);
  if (!match) {
    // Not a bite image — skip silently
    return;
  }

  const biteId = match[1];

  const biteRef = db.collection('bites').doc(biteId);
  const biteSnap = await biteRef.get();

  if (!biteSnap.exists) {
    logger.warn(`setBiteImagePathOnUpload: bite ${biteId} does not exist`);
    return;
  }

  logger.info(
    `setBiteImagePathOnUpload: processing bite ${biteId}, path: ${objectPath}`,
  );

  const verdict = await checkImage(db, {
    bucket: event.data.bucket,
    path: objectPath,
    surface: BITE_PHOTO.surface,
    uid: BITE_PHOTO.uploaderOf(biteId, biteSnap.data() ?? {}),
  });

  await applyImageVerdict({
    subject: BITE_PHOTO,
    docId: biteId,
    bucket: event.data.bucket,
    path: objectPath,
    finalizedAt: NaN,
    verdict,
    attempt: 1,
    write: updateDocument(biteRef),
    caller: 'setBiteImagePathOnUpload',
  });
});
