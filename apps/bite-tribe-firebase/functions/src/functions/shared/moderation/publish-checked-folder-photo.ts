import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { createdAtMs } from '../utils/delete-replaced-objects';
import { checkImage } from './check-image';
import {
  applyImageVerdict,
  CheckedImageSubject,
  updateDocument,
} from './checked-image-subjects';

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
 * `imageRefusalCategory`, and of the `uploaded` and `refused` statuses, with
 * the scheduled recheck that applies the same verdicts (#2142); the rules
 * refuse them from every client but an operator's. So the photo reaches a
 * member only through here, and only once `checkImage` passed it.
 *
 * - `passed`: writes the download URL and `imageStatus: uploaded`, and deletes
 *   the older objects in the folder, so it holds only the current photo.
 * - `refused`: deletes the new object and writes `imageStatus: refused` with
 *   the category. `imagePath` keeps the previous photo, or stays absent, so no
 *   member sees any change.
 * - `unavailable`: writes `imageStatus: pending` and schedules the photo for
 *   `recheckPendingImages` (#2142). It stays unpublished until then.
 *
 * A document that does not exist is left alone, and so is its object.
 */
export const publishCheckedFolderPhoto = async ({
  object,
  pathPattern,
  subject,
  caller,
}: {
  object: FinalizedObject;
  /** Matches the object path, with the document id as its first group. */
  pathPattern: RegExp;
  subject: CheckedImageSubject;
  /** Names the trigger in its log lines. */
  caller: string;
}): Promise<void> => {
  const objectPath = object.name;
  const docId = objectPath?.match(pathPattern)?.[1];

  if (!objectPath || !docId) {
    return;
  }

  const db = getFirestore();
  const ref = db.doc(`${subject.collection}/${docId}`);
  const snap = await ref.get();

  if (!snap.exists) {
    logger.warn(`${caller}: ${subject.collection}/${docId} does not exist`);
    return;
  }

  const verdict = await checkImage(db, {
    bucket: object.bucket,
    path: objectPath,
    surface: subject.surface,
    uid: subject.uploaderOf(docId, snap.data() ?? {}),
  });

  await applyImageVerdict({
    subject,
    docId,
    bucket: object.bucket,
    path: objectPath,
    finalizedAt: createdAtMs(object.timeCreated),
    verdict,
    attempt: 1,
    write: updateDocument(ref),
    caller,
  });
};
