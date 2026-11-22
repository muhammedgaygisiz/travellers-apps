import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { checkImage } from '../shared/moderation/check-image';
import {
  applyImageVerdict,
  PROFILE_PHOTO,
  updateDocument,
} from '../shared/moderation/checked-image-subjects';
import { createdAtMs } from '../shared/utils/delete-replaced-objects';

// Matches: images/users/{uid}/{filename}
const USER_PHOTO_PATH_REGEX = /^images\/users\/([^/]+)\/[^/]+$/;

/**
 * Points a profile at its new photo once the upload finalizes and the image
 * check has passed it, and removes the photo it replaced (GitHub issues #1953
 * and #2140).
 *
 * This is the only writer of `photoUrl`, of `photoRefusalCategory`, and of the
 * `uploaded` and `refused` photo statuses, with the scheduled recheck that
 * applies the same verdicts (#2142): the rules refuse all of them from a
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
 * - `unavailable`: the status stays `pending`, and `recheckPendingImages`
 *   checks the photo again (#2142).
 *
 * See {@link applyImageVerdict} for each write.
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

  const verdict = await checkImage(getFirestore(), {
    bucket: event.data.bucket,
    path: objectPath,
    surface: PROFILE_PHOTO.surface,
    uid,
  });

  await applyImageVerdict({
    subject: PROFILE_PHOTO,
    docId: uid,
    bucket: event.data.bucket,
    path: objectPath,
    finalizedAt: createdAtMs(event.data.timeCreated),
    verdict,
    attempt: 1,
    write: updateDocument(userRef),
    caller: 'setUserPhotoUrlOnUpload',
  });
});
