import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { storageDownloadUrl } from '../shared/utils/storage-download-url';
import { checkImage } from '../shared/moderation/check-image';
import { logger } from 'firebase-functions';

const db = getFirestore();

// Matches: images/bites/{biteId}/{filename}
const BITE_IMAGE_PATH_REGEX = /^images\/bites\/([^/]+)\/[^/]+$/;

/**
 * Publishes a Bite's photo once its upload finalizes, after the image check
 * has passed it (GitHub issues #1168, #1717 and #2139).
 *
 * This is the only writer of `imagePath` and of the `uploaded` and `refused`
 * image statuses: the rules refuse both from a client. So a photo reaches
 * another account only through here, and only once `checkImage` passed it.
 *
 * - `passed`: writes the download URL and `imageStatus: uploaded`, which makes
 *   the Bite listable.
 * - `refused`: deletes the object, removes any `imagePath` the Bite still
 *   carries, and writes `imageStatus: refused` with the category, so the
 *   creator is told why and can pick a different photo. The Bite is kept.
 * - `unavailable`: writes nothing. The Bite stays `pending` and not listable
 *   until the image can be checked again.
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

  const check = await checkImage(db, {
    bucket: event.data.bucket,
    path: objectPath,
    surface: 'bitePhoto',
    uid: String(biteSnap.data()?.['userId'] ?? ''),
  });

  if (check.verdict === 'unavailable') {
    logger.warn(
      `setBiteImagePathOnUpload: image check unavailable, bite ${biteId} stays pending`,
    );
    return;
  }

  if (check.verdict === 'refused') {
    await getStorage()
      .bucket(event.data.bucket)
      .file(objectPath)
      .delete({ ignoreNotFound: true });

    await biteRef.update({
      imagePath: FieldValue.delete(),
      image: '',
      imageStatus: 'refused',
      imageRefusalCategory: check.category,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`setBiteImagePathOnUpload: photo refused for bite ${biteId}`);
    return;
  }

  const downloadUrl = await storageDownloadUrl(event.data.bucket, objectPath);

  await biteRef.update({
    imagePath: downloadUrl,
    image: '',
    imageStatus: 'uploaded',
    imageRefusalCategory: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info(`setBiteImagePathOnUpload: imagePath set for bite ${biteId}`);
});
