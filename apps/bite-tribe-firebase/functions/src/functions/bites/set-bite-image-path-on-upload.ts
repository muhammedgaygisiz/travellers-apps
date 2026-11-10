import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { storageDownloadUrl } from '../shared/utils/storage-download-url';
import { logger } from 'firebase-functions';

const db = getFirestore();

// Matches: images/bites/{biteId}/{filename}
const BITE_IMAGE_PATH_REGEX = /^images\/bites\/([^/]+)\/[^/]+$/;

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
    console.warn(`Bite ${biteId} does not exist. Skipping update.`);
    return;
  }

  logger.info(
    `setBiteImagePathOnUpload: processing bite ${biteId}, path: ${objectPath}`,
  );

  const downloadUrl = await storageDownloadUrl(event.data.bucket, objectPath);

  await db.doc(`bites/${biteId}`).update({
    imagePath: downloadUrl,
    image: '',
    imageStatus: 'uploaded',
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info(`setBiteImagePathOnUpload: imagePath set for bite ${biteId}`);
});
