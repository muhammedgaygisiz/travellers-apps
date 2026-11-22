import {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { storagePathFromDownloadUrl } from '../../bites/delete-bite-as-operator';
import { onAppCheck } from '../callable-options';
import { logOperatorAction } from '../operator-log';
import { requireAdmin } from '../roles';
import { checkImage } from './check-image';
import {
  CHECKED_IMAGE_SUBJECTS,
  CheckedImageSubject,
} from './checked-image-subjects';

/**
 * Checks once every photo published before the image check existed (GitHub
 * issue #2143, epic #2137).
 *
 * The upload triggers check what is uploaded from now on. Every Bite, profile,
 * restaurant and Bite Trail photo stored before them was published without a
 * check, and nothing would look at it again unless a member reported it. This
 * walks `images/bites/`, `images/users/`, `images/restaurants/` and
 * `images/biteTrails/`, and calls `checkImage` on each object that is the
 * current published image of its document - the one its download URL names.
 * An older object in the same folder, or one still waiting for its own
 * check, is not published and is counted as `skipped`.
 *
 * **Report first, then apply.** Settled by the maintainer on 20 November 2026
 * in `Current State - Open Questions`, `Image Moderation Questions`. A run in
 * `report` mode changes nothing: it counts what the check passes and refuses
 * and lists the refused documents in its operator log entry. Only once a
 * report run has finished does `apply` mode run, and it takes each refused
 * photo down the way a refused upload is: the object is deleted, the
 * document's published URL is removed, and its status becomes `refused` with
 * the category, so the uploader is told. The check is not run twice for
 * nothing: a verdict is kept in `contentChecks` by the image's hash, so the
 * apply run answers from what the report run judged.
 *
 * **Resumable.** A call works for at most {@link BACKFILL_TIME_BUDGET_MS},
 * keeps where it got to in `migrationRuns`, and says whether the run is
 * complete. The next call carries on from there - after a timeout or a
 * crash as well - and the call after a complete run starts a new one.
 *
 * An `unavailable` verdict is left for a later run: a stored photo is never
 * marked `failed`, because it was published and nothing about it failed.
 */

/** The server-only store of migration progress. Denied to every client. */
export const MIGRATION_RUNS_COLLECTION = 'migrationRuns';

export type ImageModerationBackfillMode = 'report' | 'apply';

/** The progress document of each mode. */
export const IMAGE_MODERATION_RUN_DOCS: Record<
  ImageModerationBackfillMode,
  string
> = {
  report: 'image-moderation-report',
  apply: 'image-moderation-backfill',
};

/** Objects listed per page; progress is saved after each. */
export const BACKFILL_PAGE_SIZE = 50;

/** Checks run at once, as in the scheduled recheck. */
export const BACKFILL_CONCURRENCY = 5;

/**
 * How long one call keeps starting pages. A page of 50 checks at the model's
 * 20-second timeout takes about 200 seconds at worst, so a call ends inside
 * {@link BACKFILL_TIMEOUT_SECONDS}.
 */
export const BACKFILL_TIME_BUDGET_MS = 5 * 60 * 1000;

export const BACKFILL_TIMEOUT_SECONDS = 540;

/**
 * The most refused documents a run lists. The count goes on past it; a run
 * that refuses more than this many stored photos needs a look at the check
 * rather than a longer list.
 */
export const MAX_LISTED_REFUSALS = 500;

export interface ImageModerationBackfillCounts {
  /** Published photos the check answered for or could not answer for. */
  checked: number;
  passed: number;
  /** Refused photos: listed in `report` mode, taken down in `apply` mode. */
  refused: number;
  /** Photos the check could not answer for, left for a later run. */
  unavailable: number;
  /** Objects on the four paths that are not their document's published photo. */
  skipped: number;
}

export interface ImageModerationBackfillResult extends ImageModerationBackfillCounts {
  mode: ImageModerationBackfillMode;
  /** False while objects are left to walk; call again to continue. */
  complete: boolean;
}

export interface ImageModerationBackfillRequest {
  mode?: unknown;
}

/** What `migrationRuns/{doc}` keeps between calls. */
interface BackfillRun {
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  /** The index in {@link CHECKED_IMAGE_SUBJECTS} of the prefix being walked. */
  subjectIndex: number;
  /** The Storage listing's token for the next page of that prefix. */
  pageToken?: string;
  counts: ImageModerationBackfillCounts;
  /** `{collection}/{docId}` of each refused photo, up to the cap. */
  refusedTargets: string[];
}

const emptyCounts = (): ImageModerationBackfillCounts => ({
  checked: 0,
  passed: 0,
  refused: 0,
  unavailable: 0,
  skipped: 0,
});

const freshRun = (now: number): BackfillRun => ({
  startedAt: now,
  updatedAt: now,
  subjectIndex: 0,
  counts: emptyCounts(),
  refusedTargets: [],
});

const runRef = (
  db: Firestore,
  mode: ImageModerationBackfillMode,
): DocumentReference =>
  db.collection(MIGRATION_RUNS_COLLECTION).doc(IMAGE_MODERATION_RUN_DOCS[mode]);

const readRun = async (
  db: Firestore,
  mode: ImageModerationBackfillMode,
): Promise<BackfillRun | undefined> => {
  const snapshot = await runRef(db, mode).get();

  return snapshot.exists ? (snapshot.data() as BackfillRun) : undefined;
};

/** The document id an object on the subject's path belongs to. */
const docIdOf = (
  subject: CheckedImageSubject,
  objectPath: string,
): string | undefined => {
  const prefix = `images/${subject.collection}/`;
  const rest = objectPath.startsWith(prefix)
    ? objectPath.slice(prefix.length).split('/')
    : [];

  return rest.length === 2 && rest[0] && rest[1] ? rest[0] : undefined;
};

/** Whether the document publishes exactly this object. */
const publishes = (
  subject: CheckedImageSubject,
  snapshot: DocumentSnapshot | undefined,
  objectPath: string,
): boolean =>
  !!snapshot?.exists &&
  storagePathFromDownloadUrl(snapshot.get(subject.publishedUrlField)) ===
    objectPath;

/**
 * Takes down one refused stored photo, as a refused upload is taken down.
 *
 * The object goes first: once it is gone, its URL reaches nothing wherever a
 * copy of it lives. The document is then changed only while it still
 * publishes that object, so a newer photo published meanwhile is kept. A
 * document whose newer upload is still waiting for its own check loses only
 * the URL, and keeps the status that upload's verdict will settle.
 */
const takeDownStoredPhoto = async (
  db: Firestore,
  bucket: string,
  subject: CheckedImageSubject,
  ref: DocumentReference,
  objectPath: string,
  category: string,
): Promise<void> => {
  await getStorage()
    .bucket(bucket)
    .file(objectPath)
    .delete({ ignoreNotFound: true });

  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);

    if (!publishes(subject, current, objectPath)) {
      return;
    }

    const refused = subject.storedRefusedUpdate(category);

    transaction.update(
      ref,
      current.get(subject.statusField) === 'pending'
        ? { [subject.publishedUrlField]: refused[subject.publishedUrlField] }
        : refused,
    );
  });

  logger.info(`imageModerationBackfill: stored photo refused for ${ref.path}`);
};

interface PageOutcome {
  counts: ImageModerationBackfillCounts;
  refusedTargets: string[];
}

/** Checks one page of objects on one subject's path. */
const checkPage = async (
  db: Firestore,
  bucket: string,
  subject: CheckedImageSubject,
  objectPaths: string[],
  mode: ImageModerationBackfillMode,
): Promise<PageOutcome> => {
  const outcome: PageOutcome = { counts: emptyCounts(), refusedTargets: [] };
  const docIds = [
    ...new Set(
      objectPaths
        .map((path) => docIdOf(subject, path))
        .filter((id): id is string => !!id),
    ),
  ];
  const snapshots = new Map<string, DocumentSnapshot>();

  if (docIds.length > 0) {
    const read = await db.getAll(
      ...docIds.map((id) => db.collection(subject.collection).doc(id)),
    );

    read.forEach((snapshot) => snapshots.set(snapshot.id, snapshot));
  }

  const checkOne = async (objectPath: string): Promise<void> => {
    const docId = docIdOf(subject, objectPath);
    const snapshot = docId ? snapshots.get(docId) : undefined;

    if (!docId || !snapshot || !publishes(subject, snapshot, objectPath)) {
      outcome.counts.skipped += 1;
      return;
    }

    outcome.counts.checked += 1;

    try {
      const verdict = await checkImage(db, {
        bucket,
        path: objectPath,
        surface: subject.surface,
        uid: subject.uploaderOf(docId, snapshot.data() ?? {}),
        stage: 'backfill',
        recordRefusal: mode === 'apply',
      });

      if (verdict.verdict === 'passed') {
        outcome.counts.passed += 1;
        return;
      }

      if (verdict.verdict === 'unavailable') {
        outcome.counts.unavailable += 1;
        return;
      }

      if (mode === 'apply') {
        await takeDownStoredPhoto(
          db,
          bucket,
          subject,
          snapshot.ref,
          objectPath,
          verdict.category,
        );
      }

      outcome.counts.refused += 1;
      outcome.refusedTargets.push(`${subject.collection}/${docId}`);
    } catch (error) {
      // Left for a later run, as an `unavailable` verdict is. In `apply` mode
      // the object may already be gone, so the document is named here.
      logger.warn(
        `imageModerationBackfill: could not check ${subject.collection}/${docId}`,
        {
          path: objectPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      outcome.counts.unavailable += 1;
    }
  };

  for (
    let start = 0;
    start < objectPaths.length;
    start += BACKFILL_CONCURRENCY
  ) {
    await Promise.all(
      objectPaths.slice(start, start + BACKFILL_CONCURRENCY).map(checkOne),
    );
  }

  return outcome;
};

const addCounts = (
  into: ImageModerationBackfillCounts,
  add: ImageModerationBackfillCounts,
): ImageModerationBackfillCounts => ({
  checked: into.checked + add.checked,
  passed: into.passed + add.passed,
  refused: into.refused + add.refused,
  unavailable: into.unavailable + add.unavailable,
  skipped: into.skipped + add.skipped,
});

/**
 * Runs one call of the backfill in `mode`: continues the stored run, or
 * starts a new one when there is none or the last one is complete. Returns
 * the run's counts so far and whether it is complete. `onStart` and
 * `onComplete` are told when a run starts and ends, for the operator log.
 */
export const runImageModerationBackfill = async ({
  mode,
  now = (): number => Date.now(),
  onStart,
  onComplete,
}: {
  mode: ImageModerationBackfillMode;
  now?: () => number;
  onStart?: () => void;
  onComplete?: (run: BackfillRun) => void;
}): Promise<ImageModerationBackfillResult> => {
  const db = getFirestore();
  const bucket = getStorage().bucket();
  const startedAt = now();

  if (mode === 'apply') {
    const report = await readRun(db, 'report');

    if (report?.completedAt === undefined) {
      throw new HttpsError(
        'failed-precondition',
        'Run the stored photo check as a report first, and let it finish.',
      );
    }
  }

  const stored = await readRun(db, mode);
  let run: BackfillRun;

  if (!stored || stored.completedAt !== undefined) {
    run = freshRun(startedAt);
    await runRef(db, mode).set(run);
    onStart?.();
  } else {
    run = stored;
  }

  while (
    run.subjectIndex < CHECKED_IMAGE_SUBJECTS.length &&
    now() - startedAt < BACKFILL_TIME_BUDGET_MS
  ) {
    const subject = CHECKED_IMAGE_SUBJECTS[run.subjectIndex];
    const [files, nextQuery] = await bucket.getFiles({
      prefix: `images/${subject.collection}/`,
      maxResults: BACKFILL_PAGE_SIZE,
      autoPaginate: false,
      ...(run.pageToken ? { pageToken: run.pageToken } : {}),
    });
    const page = await checkPage(
      db,
      bucket.name,
      subject,
      files.map((file) => file.name),
      mode,
    );
    const nextPageToken = (nextQuery as { pageToken?: string } | null)
      ?.pageToken;
    const room = MAX_LISTED_REFUSALS - run.refusedTargets.length;

    run = {
      ...run,
      updatedAt: now(),
      counts: addCounts(run.counts, page.counts),
      refusedTargets: [
        ...run.refusedTargets,
        ...page.refusedTargets.slice(0, Math.max(room, 0)),
      ],
      ...(nextPageToken
        ? { pageToken: nextPageToken }
        : { subjectIndex: run.subjectIndex + 1, pageToken: undefined }),
    };

    if (run.subjectIndex >= CHECKED_IMAGE_SUBJECTS.length) {
      run.completedAt = now();
    }

    const { pageToken, ...saved } = run;

    await runRef(db, mode).set({
      ...saved,
      ...(pageToken ? { pageToken } : {}),
    });
  }

  const complete = run.completedAt !== undefined;

  logger.info(`imageModerationBackfill: ${mode} call finished`, {
    complete,
    ...run.counts,
  });

  if (complete) {
    onComplete?.(run);
  }

  return { mode, complete, ...run.counts };
};

const modeOf = (value: unknown): ImageModerationBackfillMode => {
  if (value === 'report' || value === 'apply') {
    return value;
  }

  throw new HttpsError('invalid-argument', 'mode must be report or apply.');
};

/**
 * Runs one call of the stored-photo backfill.
 *
 * Operator-only: it reads every stored photo and, in `apply` mode, takes down
 * the refused ones whoever uploaded them. A run logs one operator action -
 * `started` when it begins, `succeeded` with its counts and the refused
 * documents when it completes - however many calls it takes. A `started`
 * with no `succeeded` is a run that has not finished yet.
 */
export const imageModerationBackfillHandler = async (
  request: CallableRequest<ImageModerationBackfillRequest | undefined>,
): Promise<ImageModerationBackfillResult> => {
  requireAdmin(request);

  const mode = modeOf(request.data?.mode);

  return runImageModerationBackfill({
    mode,
    onStart: () =>
      logOperatorAction(request, {
        action: 'imageModerationBackfill',
        targetType: 'image',
        outcome: 'started',
        details: { mode },
      }),
    onComplete: (run) =>
      logOperatorAction(request, {
        action: 'imageModerationBackfill',
        targetType: 'image',
        outcome: 'succeeded',
        details: {
          mode,
          ...run.counts,
          refusedTargets: run.refusedTargets,
          refusedTargetsTruncated:
            run.counts.refused > run.refusedTargets.length,
        },
      }),
  });
};

export const imageModerationBackfillCallable = onAppCheck(
  { timeoutSeconds: BACKFILL_TIMEOUT_SECONDS, memory: '512MiB' },
  imageModerationBackfillHandler,
);
