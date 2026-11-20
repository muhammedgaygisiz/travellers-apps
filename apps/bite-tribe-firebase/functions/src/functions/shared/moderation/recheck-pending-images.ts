import {
  DocumentReference,
  Firestore,
  getFirestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import { createdAtMs } from '../utils/delete-replaced-objects';
import { checkImage, ImageVerdict } from './check-image';
import {
  AppliedImageVerdict,
  applyImageVerdict,
  CHECKED_IMAGE_SUBJECTS,
  CheckedImageSubject,
  clearedImageCheck,
  IMAGE_CHECK_ATTEMPTS_FIELD,
  IMAGE_CHECK_NEXT_AT_FIELD,
  IMAGE_CHECK_PATH_FIELD,
  imageFolderOf,
  ImageVerdictWrite,
  MAX_IMAGE_CHECK_ATTEMPTS,
} from './checked-image-subjects';

/**
 * Checks again the images whose last check answered `unavailable` (GitHub
 * issue #2142, epic #2137).
 *
 * The image check fails closed: when the model cannot answer, the upload
 * trigger keeps the photo unpublished and records on its document when the
 * next attempt is due - `imageCheckAttempts`, `imageCheckNextAt` and
 * `imageCheckPath`, see `checked-image-subjects.ts`. This run finds the
 * documents whose attempt is due across Bites, profiles, restaurants and Bite
 * Trails, calls `checkImage` again, and applies the verdict through the same
 * {@link applyImageVerdict} the upload trigger uses. A further `unavailable`
 * schedules the next attempt, and the last one marks the photo `failed`, the
 * state its uploader's retry starts from.
 */

/** How often the run fires; every recheck delay is a multiple of it. */
export const RECHECK_SCHEDULE = 'every 15 minutes';

/**
 * The most images one run checks. The rest wait for the next run, oldest due
 * first, so a long outage turns into a queue rather than one run that
 * outlasts its timeout.
 */
export const IMAGE_RECHECKS_PER_RUN = 50;

/**
 * How many checks run at once. With the model's 20-second timeout, a run that
 * finds the model still down takes about ten rounds of 20 seconds, well inside
 * {@link RECHECK_TIMEOUT_SECONDS}.
 */
export const RECHECK_CONCURRENCY = 5;

export const RECHECK_TIMEOUT_SECONDS = 540;

export interface RecheckSummary {
  due: number;
  passed: number;
  refused: number;
  waiting: number;
  failed: number;
  /** Documents that no longer wait on the object their record names. */
  dropped: number;
  /** Rechecks that threw, or found their document changed under them. */
  skipped: number;
}

const emptySummary = (): RecheckSummary => ({
  due: 0,
  passed: 0,
  refused: 0,
  waiting: 0,
  failed: 0,
  dropped: 0,
  skipped: 0,
});

interface DueImage {
  subject: CheckedImageSubject;
  doc: QueryDocumentSnapshot;
}

const nextAtOf = ({ doc }: DueImage): number =>
  Number(doc.get(IMAGE_CHECK_NEXT_AT_FIELD));

/**
 * The images due at `now`, oldest first and at most
 * {@link IMAGE_RECHECKS_PER_RUN}. Each collection is read up to the bound and
 * the oldest are taken across all of them, so a backlog of Bites cannot
 * starve a profile photo that has waited longer.
 */
const findDueImages = async (
  db: Firestore,
  now: number,
): Promise<DueImage[]> => {
  const perCollection = await Promise.all(
    CHECKED_IMAGE_SUBJECTS.map(async (subject) => {
      const snapshot = await db
        .collection(subject.collection)
        .where(IMAGE_CHECK_NEXT_AT_FIELD, '<=', now)
        .orderBy(IMAGE_CHECK_NEXT_AT_FIELD)
        .limit(IMAGE_RECHECKS_PER_RUN)
        .get();

      return snapshot.docs.map((doc) => ({ subject, doc }));
    }),
  );

  return perCollection
    .flat()
    .sort((a, b) => nextAtOf(a) - nextAtOf(b))
    .slice(0, IMAGE_RECHECKS_PER_RUN);
};

/**
 * Writes only while the document still waits on the object and attempt this
 * run read, so a recheck can never overwrite what a newer upload's trigger
 * decided while the model was being asked.
 */
const writeWhileWaiting =
  (
    db: Firestore,
    ref: DocumentReference,
    path: unknown,
    attempts: unknown,
  ): ImageVerdictWrite =>
  (update) =>
    db.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);

      if (
        !current.exists ||
        current.get(IMAGE_CHECK_PATH_FIELD) !== path ||
        current.get(IMAGE_CHECK_ATTEMPTS_FIELD) !== attempts
      ) {
        return false;
      }

      transaction.update(ref, update);

      return true;
    });

/** The object's creation time in ms, or `undefined` when it is gone. */
const objectCreatedAt = async (
  bucket: string,
  path: string,
): Promise<number | undefined> => {
  const [exists] = await getStorage().bucket(bucket).file(path).exists();

  if (!exists) {
    return undefined;
  }

  const [metadata] = await getStorage().bucket(bucket).file(path).getMetadata();

  return createdAtMs(metadata.timeCreated);
};

type RecheckOutcome = AppliedImageVerdict | 'dropped' | 'skipped';

const recheckOne = async (
  db: Firestore,
  bucket: string,
  { subject, doc }: DueImage,
  now: Date,
): Promise<RecheckOutcome> => {
  const data = doc.data();
  const path = data[IMAGE_CHECK_PATH_FIELD];
  const attempts = data[IMAGE_CHECK_ATTEMPTS_FIELD];
  const write = writeWhileWaiting(db, doc.ref, path, attempts);
  const target = `${subject.collection}/${doc.id}`;

  // A record that no longer describes a waiting photo - the uploader's
  // client wrote `failed`, or the record is malformed - is dropped, so it
  // stops coming back. Only the object's own folder is ever checked.
  if (
    data[subject.statusField] !== 'pending' ||
    typeof path !== 'string' ||
    !path.startsWith(imageFolderOf(subject, doc.id)) ||
    typeof attempts !== 'number'
  ) {
    const wrote = await write(clearedImageCheck());

    logger.warn(`recheckPendingImages: dropped the wait on ${target}`);

    return wrote ? 'dropped' : 'skipped';
  }

  const attempt = attempts + 1;
  let verdict: ImageVerdict;
  let finalizedAt = NaN;

  try {
    const createdAt = await objectCreatedAt(bucket, path);

    if (createdAt === undefined) {
      // The photo is gone, so no attempt can publish it: the uploader is
      // sent to the retry straight away.
      logger.warn(`recheckPendingImages: ${path} no longer exists`);

      const applied = await applyImageVerdict({
        subject,
        docId: doc.id,
        bucket,
        path,
        finalizedAt,
        verdict: { verdict: 'unavailable' },
        attempt: MAX_IMAGE_CHECK_ATTEMPTS,
        write,
        caller: 'recheckPendingImages',
        now,
      });

      return applied ?? 'skipped';
    }

    finalizedAt = createdAt;
    verdict = await checkImage(db, {
      bucket,
      path,
      surface: subject.surface,
      uid: subject.uploaderOf(doc.id, data),
    });
  } catch (error) {
    // Anything that kept the check from running counts as one more attempt
    // that could not answer, so a fault of its own cannot hold a photo past
    // the last attempt.
    logger.warn(`recheckPendingImages: could not check ${target}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    verdict = { verdict: 'unavailable' };
  }

  const applied = await applyImageVerdict({
    subject,
    docId: doc.id,
    bucket,
    path,
    finalizedAt,
    verdict,
    attempt,
    write,
    caller: 'recheckPendingImages',
    now,
  });

  return applied ?? 'skipped';
};

/** Runs one recheck pass at `now`. Exported for the specs. */
export const recheckPendingImagesAt = async (
  now: Date = new Date(),
): Promise<RecheckSummary> => {
  const db = getFirestore();
  const bucket = getStorage().bucket().name;
  const due = await findDueImages(db, now.getTime());
  const summary = emptySummary();

  summary.due = due.length;

  for (let start = 0; start < due.length; start += RECHECK_CONCURRENCY) {
    const outcomes = await Promise.all(
      due.slice(start, start + RECHECK_CONCURRENCY).map(async (image) => {
        try {
          return await recheckOne(db, bucket, image, now);
        } catch (error) {
          logger.warn(
            `recheckPendingImages: recheck of ${image.subject.collection}/${image.doc.id} failed`,
            { error: error instanceof Error ? error.message : String(error) },
          );

          return 'skipped' as const;
        }
      }),
    );

    for (const outcome of outcomes) {
      summary[outcome] += 1;
    }
  }

  logger.info('recheckPendingImages: run finished', summary);

  return summary;
};

export const recheckPendingImages = onSchedule(
  {
    schedule: RECHECK_SCHEDULE,
    timeZone: 'UTC',
    timeoutSeconds: RECHECK_TIMEOUT_SECONDS,
    memory: '512MiB',
  },
  async (): Promise<void> => {
    await recheckPendingImagesAt();
  },
);
