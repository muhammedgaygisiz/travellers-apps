import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { storageDownloadUrl } from '../utils/storage-download-url';
import {
  createdAtMs,
  deleteReplacedObjects,
} from '../utils/delete-replaced-objects';
import { checkImage } from './check-image';
import { ImageSurface } from './content-refusal';

/** The finalized object, as a Storage trigger hands it over. */
export interface FinalizedObject {
  name?: string;
  bucket: string;
  timeCreated?: unknown;
}

/**
 * Publishes a photo kept in its document's own folder,
 * `images/{collection}/{docId}/`, once the image check has passed it: the
 * restaurant photo and the Bite Trail photo (GitHub issue #2141).
 *
 * The trigger that calls this is the only writer of `imagePath`, of
 * `imageRefusalCategory`, and of the `uploaded` and `refused` statuses; the
 * rules refuse them from every client but an operator's. So the photo reaches
 * a member only through here, and only once `checkImage` passed it.
 *
 * - `passed`: writes the download URL and `imageStatus: uploaded`, and deletes
 *   the older objects in the folder, so it holds only the current photo.
 * - `refused`: deletes the new object and writes `imageStatus: refused` with
 *   the category. `imagePath` keeps the previous photo, or stays absent, so no
 *   member sees any change.
 * - `unavailable`: writes `imageStatus: pending`. The photo stays unpublished
 *   until it can be checked again.
 *
 * A document that does not exist is left alone, and so is its object.
 */
export const publishCheckedFolderPhoto = async ({
  object,
  pathPattern,
  collection,
  surface,
  uploaderOf,
  caller,
}: {
  object: FinalizedObject;
  /** Matches the object path, with the document id as its first group. */
  pathPattern: RegExp;
  collection: string;
  surface: ImageSurface;
  /** The account the refusal log names, read from the document. */
  uploaderOf: (data: Record<string, unknown>) => string;
  /** Names the trigger in its log lines. */
  caller: string;
}): Promise<void> => {
  const objectPath = object.name;
  const docId = objectPath?.match(pathPattern)?.[1];

  if (!objectPath || !docId) {
    return;
  }

  const db = getFirestore();
  const ref = db.doc(`${collection}/${docId}`);
  const snap = await ref.get();

  if (!snap.exists) {
    logger.warn(`${caller}: ${collection}/${docId} does not exist`);
    return;
  }

  const check = await checkImage(db, {
    bucket: object.bucket,
    path: objectPath,
    surface,
    uid: uploaderOf(snap.data() ?? {}),
  });

  if (check.verdict === 'unavailable') {
    await ref.update({ imageStatus: 'pending' });
    logger.warn(
      `${caller}: image check unavailable, ${collection}/${docId} stays pending`,
    );
    return;
  }

  if (check.verdict === 'refused') {
    await getStorage()
      .bucket(object.bucket)
      .file(objectPath)
      .delete({ ignoreNotFound: true });

    await ref.update({
      imageStatus: 'refused',
      imageRefusalCategory: check.category,
    });

    logger.info(`${caller}: photo refused for ${collection}/${docId}`);
    return;
  }

  const imagePath = await storageDownloadUrl(object.bucket, objectPath);

  await ref.update({
    imagePath,
    imageStatus: 'uploaded',
    imageRefusalCategory: FieldValue.delete(),
  });

  await deleteReplacedObjects({
    bucketName: object.bucket,
    prefix: `images/${collection}/${docId}/`,
    objectPath,
    finalizedAt: createdAtMs(object.timeCreated),
    caller,
  });

  logger.info(`${caller}: imagePath set for ${collection}/${docId}`);
};
