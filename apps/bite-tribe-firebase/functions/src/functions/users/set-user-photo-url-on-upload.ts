import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { storageDownloadUrl } from '../shared/utils/storage-download-url';
import {
  createdAtMs,
  deleteReplacedObjects,
} from '../shared/utils/delete-replaced-objects';

// Matches: images/users/{uid}/{filename}
const USER_PHOTO_PATH_REGEX = /^images\/users\/([^/]+)\/[^/]+$/;

/**
 * Points a profile at its new photo once the upload finalizes, and removes the
 * photo it replaced (GitHub issue #1953).
 *
 * The uploading device writes the same URL itself for an immediate update,
 * but cannot be relied on to still be there: an upload outlives the page that
 * started it. This is the Bite photo's `setBiteImagePathOnUpload` for profile
 * photos, and like it, clears the `pending` status the client set.
 */
export const setUserPhotoUrlOnUpload = onObjectFinalized(async (event) => {
  const objectPath = event.data.name;

  if (!objectPath) {
    return;
  }

  const match = objectPath.match(USER_PHOTO_PATH_REGEX);

  if (!match) {
    return;
  }

  const uid = match[1];
  const userRef = getFirestore().doc(`users/${uid}`);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    logger.warn(`setUserPhotoUrlOnUpload: user ${uid} does not exist`);
    return;
  }

  const photoUrl = await storageDownloadUrl(event.data.bucket, objectPath);

  await userRef.update({
    photoUrl,
    photoStatus: 'uploaded',
  });

  await deleteReplacedObjects({
    bucketName: event.data.bucket,
    prefix: `images/users/${uid}/`,
    objectPath,
    finalizedAt: createdAtMs(event.data.timeCreated),
    caller: 'setUserPhotoUrlOnUpload',
  });

  logger.info(`setUserPhotoUrlOnUpload: photoUrl set for user ${uid}`);
});
