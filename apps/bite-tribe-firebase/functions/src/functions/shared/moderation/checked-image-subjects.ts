import { DocumentReference, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { storageDownloadUrl } from '../utils/storage-download-url';
import { deleteReplacedObjects } from '../utils/delete-replaced-objects';
import { ImageVerdict } from './check-image';
import { ImageSurface } from './content-refusal';

/**
 * What the image check's verdict does to the document an image was uploaded
 * for (epic #2137). The upload triggers and the scheduled recheck,
 * `recheckPendingImages` (issue #2142), both go through
 * {@link applyImageVerdict}, so a photo checked again is published, refused
 * or held exactly as the upload trigger would have done it.
 */

/**
 * The waits between one `unavailable` answer and the next attempt, in order
 * (issue #2142). The upload trigger makes the first attempt; one recheck
 * follows each wait, so an image gets seven checks over about 16 hours before
 * it is marked `failed`. Settled by the maintainer on 20 November 2026, in
 * `Current State - Open Questions`, `Image Moderation Questions`.
 */
export const IMAGE_RECHECK_DELAYS_MS: readonly number[] = [
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  2 * 60 * 60 * 1000,
  4 * 60 * 60 * 1000,
  8 * 60 * 60 * 1000,
];

/** Every check an image gets: the upload's, then one per recheck delay. */
export const MAX_IMAGE_CHECK_ATTEMPTS = IMAGE_RECHECK_DELAYS_MS.length + 1;

/**
 * The fields that say an image is waiting for its next check. Written only by
 * the backend; the rules refuse them from every client but an operator's.
 *
 * - `imageCheckAttempts`: the checks made so far, all answering `unavailable`.
 * - `imageCheckNextAt`: when the next is due, in milliseconds since the epoch.
 *   The scheduled recheck queries it, and the clients read its presence as a
 *   photo still waiting rather than an upload that stalled.
 * - `imageCheckPath`: the Storage object the check is about.
 */
export const IMAGE_CHECK_ATTEMPTS_FIELD = 'imageCheckAttempts';
export const IMAGE_CHECK_NEXT_AT_FIELD = 'imageCheckNextAt';
export const IMAGE_CHECK_PATH_FIELD = 'imageCheckPath';

/** The writes that end a wait: every verdict but a further `unavailable`. */
export const clearedImageCheck = (): Record<string, unknown> => ({
  [IMAGE_CHECK_ATTEMPTS_FIELD]: FieldValue.delete(),
  [IMAGE_CHECK_NEXT_AT_FIELD]: FieldValue.delete(),
  [IMAGE_CHECK_PATH_FIELD]: FieldValue.delete(),
});

export type CheckedImageCollection =
  'bites' | 'users' | 'restaurants' | 'biteTrails';

/** One kind of document whose uploaded photo the image check guards. */
export interface CheckedImageSubject {
  collection: CheckedImageCollection;
  surface: ImageSurface;
  /** The status field the photo's state lives in. */
  statusField: 'imageStatus' | 'photoStatus';
  /** The account the refusal log names. */
  uploaderOf: (docId: string, data: Record<string, unknown>) => string;
  /** What a passed photo writes, given its download URL. */
  passedUpdate: (downloadUrl: string) => Record<string, unknown>;
  /** What a refused photo writes. */
  refusedUpdate: (category: string) => Record<string, unknown>;
  /**
   * Whether a passed photo removes the older objects in the document's
   * folder, so the folder holds only the current photo.
   */
  deletesReplacedObjects: boolean;
}

/**
 * A Bite photo (issue #2139). `passed` is the only write that makes a Bite
 * listable; `refused` also removes any `imagePath` the Bite still carries.
 */
export const BITE_PHOTO: CheckedImageSubject = {
  collection: 'bites',
  surface: 'bitePhoto',
  statusField: 'imageStatus',
  uploaderOf: (_docId, data) => String(data['userId'] ?? ''),
  passedUpdate: (downloadUrl) => ({
    imagePath: downloadUrl,
    image: '',
    imageStatus: 'uploaded',
    imageRefusalCategory: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  }),
  refusedUpdate: (category) => ({
    imagePath: FieldValue.delete(),
    image: '',
    imageStatus: 'refused',
    imageRefusalCategory: category,
    updatedAt: FieldValue.serverTimestamp(),
  }),
  deletesReplacedObjects: false,
};

/**
 * A profile photo (issue #2140). A refusal keeps `photoUrl` on the previous
 * photo, or empty for an account that had none.
 */
export const PROFILE_PHOTO: CheckedImageSubject = {
  collection: 'users',
  surface: 'profilePhoto',
  statusField: 'photoStatus',
  uploaderOf: (docId) => docId,
  passedUpdate: (downloadUrl) => ({
    photoUrl: downloadUrl,
    photoStatus: 'uploaded',
    photoRefusalCategory: FieldValue.delete(),
  }),
  refusedUpdate: (category) => ({
    photoStatus: 'refused',
    photoRefusalCategory: category,
  }),
  deletesReplacedObjects: true,
};

const folderPhotoUpdates = {
  statusField: 'imageStatus',
  passedUpdate: (downloadUrl: string) => ({
    imagePath: downloadUrl,
    imageStatus: 'uploaded',
    imageRefusalCategory: FieldValue.delete(),
  }),
  refusedUpdate: (category: string) => ({
    imageStatus: 'refused',
    imageRefusalCategory: category,
  }),
  deletesReplacedObjects: true,
} as const;

/**
 * A restaurant photo (issue #2141). A refusal keeps `imagePath` on the
 * previous photo. The refusal log names the first owner.
 */
export const RESTAURANT_PHOTO: CheckedImageSubject = {
  ...folderPhotoUpdates,
  collection: 'restaurants',
  surface: 'restaurantPhoto',
  uploaderOf: (_docId, data) => {
    const owners = data['ownerUserIds'];

    return Array.isArray(owners) && typeof owners[0] === 'string'
      ? owners[0]
      : '';
  },
};

/** A Bite Trail photo (issue #2141), kept like a restaurant photo. */
export const BITE_TRAIL_PHOTO: CheckedImageSubject = {
  ...folderPhotoUpdates,
  collection: 'biteTrails',
  surface: 'biteTrailPhoto',
  uploaderOf: (_docId, data) => String(data['ownerId'] ?? ''),
};

/** Every subject, in the order the scheduled recheck reads them. */
export const CHECKED_IMAGE_SUBJECTS: readonly CheckedImageSubject[] = [
  BITE_PHOTO,
  PROFILE_PHOTO,
  RESTAURANT_PHOTO,
  BITE_TRAIL_PHOTO,
];

/** The folder a subject's photos are uploaded to. */
export const imageFolderOf = (
  subject: CheckedImageSubject,
  docId: string,
): string => `images/${subject.collection}/${docId}/`;

/**
 * Commits one verdict's Firestore update and says whether it landed. The
 * upload trigger always writes; the recheck writes only while the document
 * still waits on the object it checked.
 */
export type ImageVerdictWrite = (
  update: Record<string, unknown>,
) => Promise<boolean>;

export type AppliedImageVerdict = 'passed' | 'refused' | 'waiting' | 'failed';

const deleteObject = (bucket: string, path: string): Promise<unknown> =>
  getStorage().bucket(bucket).file(path).delete({ ignoreNotFound: true });

/**
 * Applies the image check's verdict on attempt number `attempt` (1 is the
 * upload trigger's) to the document the photo belongs to.
 *
 * - `passed`: writes the download URL and the `uploaded` status, and, for a
 *   subject that keeps one photo per folder, deletes the older objects.
 * - `refused`: deletes the object and writes the `refused` status and its
 *   category. The document keeps the photo it had.
 * - `unavailable` before the last attempt: writes the `pending` status and
 *   schedules the next attempt. The photo stays unpublished.
 * - `unavailable` on the last attempt: deletes the unchecked object and
 *   writes `failed`, the state the uploader's retry starts from.
 *
 * Every write but the scheduling one clears the wait.
 */
export const applyImageVerdict = async ({
  subject,
  docId,
  bucket,
  path,
  finalizedAt,
  verdict,
  attempt,
  write,
  caller,
  now = new Date(),
}: {
  subject: CheckedImageSubject;
  docId: string;
  bucket: string;
  path: string;
  /** The object's creation time in ms; `NaN` keeps the older objects. */
  finalizedAt: number;
  verdict: ImageVerdict;
  attempt: number;
  write: ImageVerdictWrite;
  /** Names the function in its log lines. */
  caller: string;
  now?: Date;
}): Promise<AppliedImageVerdict | undefined> => {
  const target = `${subject.collection}/${docId}`;

  if (verdict.verdict === 'unavailable') {
    if (attempt < MAX_IMAGE_CHECK_ATTEMPTS) {
      const wrote = await write({
        [subject.statusField]: 'pending',
        [IMAGE_CHECK_ATTEMPTS_FIELD]: attempt,
        [IMAGE_CHECK_NEXT_AT_FIELD]:
          now.getTime() + IMAGE_RECHECK_DELAYS_MS[attempt - 1],
        [IMAGE_CHECK_PATH_FIELD]: path,
      });

      if (!wrote) {
        return undefined;
      }

      logger.warn(
        `${caller}: image check unavailable, ${target} stays pending (attempt ${attempt} of ${MAX_IMAGE_CHECK_ATTEMPTS})`,
      );

      return 'waiting';
    }

    const wrote = await write({
      [subject.statusField]: 'failed',
      ...clearedImageCheck(),
    });

    if (!wrote) {
      return undefined;
    }

    await deleteObject(bucket, path);

    logger.warn(
      `${caller}: image check unavailable after ${attempt} attempts, ${target} marked failed`,
    );

    return 'failed';
  }

  if (verdict.verdict === 'refused') {
    await deleteObject(bucket, path);

    const wrote = await write({
      ...subject.refusedUpdate(verdict.category),
      ...clearedImageCheck(),
    });

    if (!wrote) {
      return undefined;
    }

    logger.info(`${caller}: photo refused for ${target}`);

    return 'refused';
  }

  const downloadUrl = await storageDownloadUrl(bucket, path);
  const wrote = await write({
    ...subject.passedUpdate(downloadUrl),
    ...clearedImageCheck(),
  });

  if (!wrote) {
    return undefined;
  }

  if (subject.deletesReplacedObjects) {
    await deleteReplacedObjects({
      bucketName: bucket,
      prefix: imageFolderOf(subject, docId),
      objectPath: path,
      finalizedAt,
      caller,
    });
  }

  logger.info(`${caller}: photo published for ${target}`);

  return 'passed';
};

/** The upload trigger's write: unconditional, as the latest upload wins. */
export const updateDocument =
  (ref: DocumentReference): ImageVerdictWrite =>
  async (update) => {
    await ref.update(update);

    return true;
  };
