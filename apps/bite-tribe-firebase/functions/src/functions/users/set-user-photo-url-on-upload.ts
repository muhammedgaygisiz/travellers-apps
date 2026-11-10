import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { storageDownloadUrl } from '../shared/utils/storage-download-url';

// Matches: images/users/{uid}/{filename}
const USER_PHOTO_PATH_REGEX = /^images\/users\/([^/]+)\/[^/]+$/;

const createdAtMs = (timeCreated: unknown): number =>
  typeof timeCreated === 'string' ? Date.parse(timeCreated) : NaN;

/**
 * Deletes the photos in the user's folder that are older than the one just
 * finalized, so the folder holds only the current photo.
 *
 * Older only, never "every other one": two uploads finishing out of order must
 * not let the earlier one delete the later. A file whose age cannot be read is
 * kept, as a leftover costs storage while a wrong delete costs the photo.
 */
const deleteReplacedPhotos = async (
  bucketName: string,
  uid: string,
  objectPath: string,
  finalizedAt: number,
): Promise<void> => {
  if (Number.isNaN(finalizedAt)) {
    return;
  }

  const bucket = getStorage().bucket(bucketName);
  const [files] = await bucket.getFiles({ prefix: `images/users/${uid}/` });

  const replaced = files.filter(
    (file) =>
      file.name !== objectPath &&
      createdAtMs(file.metadata?.timeCreated) < finalizedAt,
  );

  await Promise.all(
    replaced.map(async (file) => {
      try {
        await file.delete();
      } catch (error) {
        logger.warn(
          `setUserPhotoUrlOnUpload: could not delete replaced photo ${file.name}`,
          error,
        );
      }
    }),
  );
};

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

  await deleteReplacedPhotos(
    event.data.bucket,
    uid,
    objectPath,
    createdAtMs(event.data.timeCreated),
  );

  logger.info(`setUserPhotoUrlOnUpload: photoUrl set for user ${uid}`);
});
