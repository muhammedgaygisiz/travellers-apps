import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { storageDownloadUrl } from '../shared/utils/storage-download-url';
import { checkImage } from '../shared/moderation/check-image';
import {
  createdAtMs,
  deleteReplacedObjects,
} from '../shared/utils/delete-replaced-objects';

// Matches: images/users/{uid}/{filename}
const USER_PHOTO_PATH_REGEX = /^images\/users\/([^/]+)\/[^/]+$/;

/**
 * Points a profile at its new photo once the upload finalizes and the image
 * check has passed it, and removes the photo it replaced (GitHub issues #1953
 * and #2140).
 *
 * This is the only writer of `photoUrl`, of `photoRefusalCategory`, and of the
 * `uploaded` and `refused` photo statuses: the rules refuse all of them from a
 * client. So a profile photo reaches another account only through here, and
 * only once `checkImage` passed it. The identity-provider avatar a new account
 * starts with arrives the same way, mirrored into Storage by
 * `mirrorIdentityAvatarOnCreate`.
 *
 * - `passed`: writes the download URL and `photoStatus: uploaded`, and deletes
 *   the older objects in the account's folder.
 * - `refused`: deletes the new object and writes `photoStatus: refused` with
 *   the category. `photoUrl` keeps the previous photo, or stays empty for an
 *   account that had none, so nobody else sees any change.
 * - `unavailable`: writes nothing. The status stays `pending` until the image
 *   can be checked again.
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

  const check = await checkImage(getFirestore(), {
    bucket: event.data.bucket,
    path: objectPath,
    surface: 'profilePhoto',
    uid,
  });

  if (check.verdict === 'unavailable') {
    logger.warn(
      `setUserPhotoUrlOnUpload: image check unavailable, user ${uid} stays pending`,
    );
    return;
  }

  if (check.verdict === 'refused') {
    await getStorage()
      .bucket(event.data.bucket)
      .file(objectPath)
      .delete({ ignoreNotFound: true });

    await userRef.update({
      photoStatus: 'refused',
      photoRefusalCategory: check.category,
    });

    logger.info(`setUserPhotoUrlOnUpload: photo refused for user ${uid}`);
    return;
  }

  const photoUrl = await storageDownloadUrl(event.data.bucket, objectPath);

  await userRef.update({
    photoUrl,
    photoStatus: 'uploaded',
    photoRefusalCategory: FieldValue.delete(),
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
