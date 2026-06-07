import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

// Matches: images/bites/{biteId}/{filename}
const BITE_IMAGE_PATH_REGEX = /^images\/bites\/([^/]+)\/[^/]+$/;

type FileMetadata = { metadata?: object | undefined };

function normalizeStorageDownloadToken(rawToken?: string): string | undefined {
  return rawToken
    ?.split(',')
    .map((token) => token.trim())
    .filter(Boolean)[0];
}

const getToken = (metadata: FileMetadata): string | undefined => {
  const tokens = (metadata.metadata as Record<string, string> | undefined)
    ?.firebaseStorageDownloadTokens;

  if (tokens) {
    return normalizeStorageDownloadToken(tokens);
  }

  return undefined;
};

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

  const bucket = event.data.bucket;

  logger.info(
    `setBiteImagePathOnUpload: processing bite ${biteId}, path: ${objectPath}`,
  );

  // Firebase Storage automatically adds a download token to the file metadata.
  // Use it to construct the same URL format the client SDK produces.
  const file = admin.storage().bucket(bucket).file(objectPath);
  const [metadata] = await file.getMetadata();
  const token = getToken(metadata);

  // When the Storage emulator is running, FIREBASE_STORAGE_EMULATOR_HOST is set
  // automatically (e.g. "localhost:9199"). Use it so the generated URL resolves locally.
  const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const storageBaseUrl = storageEmulatorHost
    ? `http://${storageEmulatorHost}`
    : 'https://firebasestorage.googleapis.com';

  const encodedPath = encodeURIComponent(objectPath);
  const downloadUrl = token
    ? `${storageBaseUrl}/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${token}`
    : `${storageBaseUrl}/v0/b/${bucket}/o/${encodedPath}?alt=media`;

  await db.doc(`bites/${biteId}`).update({
    imagePath: downloadUrl,
    image: '',
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info(`setBiteImagePathOnUpload: imagePath set for bite ${biteId}`);
});
