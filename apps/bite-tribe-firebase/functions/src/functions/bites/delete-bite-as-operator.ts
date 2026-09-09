import {
  DocumentData,
  DocumentReference,
  FieldValue,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';

const BITES_COLLECTION = 'bites';
const BITE_TRAILS_COLLECTION = 'biteTrails';
const BUCKETLISTS_COLLECTION = 'bucketlists';
const LIKES_COLLECTION = 'likes';
const RESTAURANT_CANDIDATES_COLLECTION = 'restaurantCandidates';
const REVIEWS_COLLECTION = 'reviews';

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

/**
 * Long enough for "reported as not food, ticket 88 — advertising", short enough
 * that nobody pastes a conversation into a log line. The same limit
 * `setUserSubscriptionTier` uses, because it is the same kind of field.
 */
const MAX_REASON_LENGTH = 500;

/** Storage prefix holding every image ever uploaded for one Bite. */
const biteImagePrefix = (biteId: string): string =>
  `images/${BITES_COLLECTION}/${biteId}/`;

interface DeleteBiteAsOperatorRequest {
  biteId?: unknown;
  reason?: unknown;
}

export interface DeleteBiteAsOperatorResult {
  biteId: string;
  deletedLikes: number;
  deletedReviews: number;
  deletedImages: number;
  updatedRestaurantCandidates: number;
  updatedBucketlists: number;
  updatedBiteTrails: number;
}

const parseBiteId = (value: unknown): string => {
  const biteId = typeof value === 'string' ? value.trim() : '';

  if (!biteId) {
    throw new HttpsError('invalid-argument', 'biteId is required.');
  }

  return biteId;
};

/**
 * The reason is required, not optional.
 *
 * Cloud Logging is the only record this action leaves, and the deletion is
 * irreversible: there is no document left to inspect and nothing to show an
 * author who disputes it. An entry that does not say why is not worth reading
 * later, which is the whole point of keeping the trail (epic #1471).
 */
const parseReason = (value: unknown): string => {
  const reason = typeof value === 'string' ? value.trim() : '';

  if (!reason) {
    throw new HttpsError('invalid-argument', 'reason is required.');
  }

  if (reason.length > MAX_REASON_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `reason must be at most ${MAX_REASON_LENGTH} characters.`,
    );
  }

  return reason;
};

const deleteRefs = async (
  db: Firestore,
  refs: DocumentReference[],
): Promise<void> => {
  for (let index = 0; index < refs.length; index += WRITE_BATCH_LIMIT) {
    const batch = db.batch();
    refs
      .slice(index, index + WRITE_BATCH_LIMIT)
      .forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

/**
 * Deletes the Bite's likes.
 *
 * Firestore does not delete a subcollection with its parent, so likes left
 * behind would be unreachable documents under a path nothing resolves. They go
 * while the Bite still exists, so `decrementBiteLikeCountOnLikeDelete` has a
 * document to correct rather than a warning to log — the counts are wasted
 * writes on a Bite about to disappear, but a trigger that finds its target
 * missing is the shape that hides real bugs.
 */
export const deleteLikesForBite = async (
  db: Firestore,
  biteId: string,
): Promise<number> => {
  const likes = await db
    .collection(BITES_COLLECTION)
    .doc(biteId)
    .collection(LIKES_COLLECTION)
    .get();

  await deleteRefs(
    db,
    likes.docs.map((like) => like.ref),
  );

  return likes.size;
};

/**
 * Deletes every review and reply written on the Bite.
 *
 * Reviews are a top-level collection keyed back to the Bite, so they survive it
 * unless they are removed deliberately. Replies carry the same `biteId` as
 * their root, so one query takes whole threads and nothing has to walk the
 * parent chain.
 *
 * `biteId` is stored as the document path `/bites/{id}` by the client that
 * writes reviews, and the bare id is matched as well: it is the shape the read
 * path does *not* query, so such a review is already invisible in the app and
 * would be left behind as text about a Bite nobody can open.
 */
export const deleteReviewsForBite = async (
  db: Firestore,
  biteId: string,
): Promise<number> => {
  const reviews = await db
    .collection(REVIEWS_COLLECTION)
    .where('biteId', 'in', [`/${BITES_COLLECTION}/${biteId}`, biteId])
    .get();

  await deleteRefs(
    db,
    reviews.docs.map((review) => review.ref),
  );

  return reviews.size;
};

/**
 * The Storage path a download URL points at, or nothing when the value is not
 * one.
 *
 * `imagePath` holds a download URL rather than an object path — that is what
 * `setBiteImagePathOnUpload` writes — so the object it names has to be read out
 * of it. The Functions project carries none of the workspace path mappings, so
 * this repeats `libs/common/utils/src/lib/storage-path-from-download-url.ts`
 * rather than importing it, the way `shared/roles.ts` repeats the role list.
 */
export const storagePathFromDownloadUrl = (
  value: unknown,
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const match = /\/o\/([^?]+)/.exec(value);

  return match ? decodeURIComponent(match[1]) : undefined;
};

/**
 * Deletes the Bite's images from Storage.
 *
 * An orphaned object costs money forever, and on an improper Bite it may be the
 * very content being removed, so it cannot outlive the document.
 *
 * Two sources, unioned, because neither alone is complete. The prefix listing
 * catches every upload the Bite ever had — an edited Bite leaves the replaced
 * object behind, and each upload is a fresh UUID under the same prefix — while
 * `imagePath` names the one object that is certainly the Bite's current image,
 * including a Bite whose image predates the prefix or was migrated into place.
 *
 * The named path is added unconditionally rather than only when it falls
 * outside the prefix. It is the object whose survival would actually be visible,
 * so it must not depend on the listing succeeding; the set makes the overlap
 * free.
 *
 * Returns the object names that were removed, so the log says what went rather
 * than how many things went.
 */
export const deleteImagesForBite = async (
  biteId: string,
  bite: DocumentData,
): Promise<string[]> => {
  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles({ prefix: biteImagePrefix(biteId) });
  const paths = new Set(files.map((file) => file.name));
  const namedPath = storagePathFromDownloadUrl(bite['imagePath']);

  if (namedPath) {
    paths.add(namedPath);
  }

  await Promise.all(
    [...paths].map((path) =>
      bucket.file(path).delete({ ignoreNotFound: true }),
    ),
  );

  return [...paths];
};

/**
 * Drops the Bite from every restaurant candidate that cited it as evidence.
 *
 * `verifyRestaurantCandidate` already tolerates a missing Bite, deliberately,
 * so a deleted one cannot wedge a candidate in `pending`. What it does not do
 * is remove the id, and `evidence.biteCount` is the length of that array — so a
 * candidate left alone keeps claiming evidence it no longer has, and an
 * operator deciding whether to verify it reads a number that is wrong.
 *
 * The array is rewritten rather than `arrayRemove`d because the count has to be
 * derived from what is left, and the two have to agree.
 */
export const removeBiteFromRestaurantCandidates = async (
  db: Firestore,
  biteId: string,
): Promise<number> => {
  const candidates = await db
    .collection(RESTAURANT_CANDIDATES_COLLECTION)
    .where('biteIds', 'array-contains', biteId)
    .get();

  if (candidates.empty) {
    return 0;
  }

  const now = new Date();
  const batch = db.batch();

  candidates.docs.forEach((candidate) => {
    const stored = candidate.data()['biteIds'];
    const biteIds = (Array.isArray(stored) ? stored : []).filter(
      (id: unknown) => id !== biteId,
    );

    batch.update(candidate.ref, {
      biteIds,
      'evidence.biteCount': biteIds.length,
      updatedAt: now.toISOString(),
      updatedAtTimestamp: now.getTime(),
    });
  });

  await batch.commit();

  return candidates.size;
};

/**
 * Drops the Bite from every bucket list holding it, including the record of
 * having tried it out.
 *
 * Not named by issue #1475, and removed anyway, because a stale id in a bucket
 * list does not disappear on its own: `loadBitesByBucketlist` resolves each id
 * and its filter cannot drop a missing one — the loader returns an object
 * carrying the id and nothing else — so the entry renders as a nameless,
 * imageless Bite rather than being absent. The epic's criterion is that nothing
 * downstream is left referring to a deleted Bite.
 */
export const removeBiteFromBucketlists = async (
  db: Firestore,
  biteId: string,
): Promise<number> => {
  const bucketlists = await db
    .collection(BUCKETLISTS_COLLECTION)
    .where('biteIds', 'array-contains', biteId)
    .get();

  if (bucketlists.empty) {
    return 0;
  }

  const now = new Date();
  const batch = db.batch();

  bucketlists.docs.forEach((bucketlist) => {
    const storedTriedOut = bucketlist.data()['triedOutBites'];
    const triedOutBites = (
      Array.isArray(storedTriedOut) ? storedTriedOut : []
    ).filter((entry: unknown) => (entry as DocumentData)?.biteId !== biteId);

    batch.update(bucketlist.ref, {
      biteIds: FieldValue.arrayRemove(biteId),
      triedOutBites,
      updatedAt: now.toISOString(),
      updatedAtTimestamp: now.getTime(),
    });
  });

  await batch.commit();

  return bucketlists.size;
};

/**
 * Drops the Bite from every BiteTrail listing it.
 *
 * A BiteTrail is somebody else's curated list, and possibly a sold one, so this
 * changes a product a buyer already owns. It is still the lesser of the two:
 * the alternative is a trail with a stop that renders as an empty card, and
 * `soldCount` and the `sells` records are untouched either way.
 */
export const removeBiteFromBiteTrails = async (
  db: Firestore,
  biteId: string,
): Promise<number> => {
  const biteTrails = await db
    .collection(BITE_TRAILS_COLLECTION)
    .where('biteIds', 'array-contains', biteId)
    .get();

  if (biteTrails.empty) {
    return 0;
  }

  const now = new Date();
  const batch = db.batch();

  biteTrails.docs.forEach((biteTrail) => {
    batch.update(biteTrail.ref, {
      biteIds: FieldValue.arrayRemove(biteId),
      updatedAt: now.toISOString(),
      updatedAtTimestamp: now.getTime(),
    });
  });

  await batch.commit();

  return biteTrails.size;
};

/**
 * Deletes a Bite that should not be on BiteTribe.
 *
 * Operator-only. A Bite can otherwise only be deleted by its author, so content
 * that has to come down — abusive, illegal, or simply not food — had no removal
 * path short of the Firebase console (issue #1475).
 *
 * **The Bite is deleted outright, not hidden.** That is a decision, not a
 * shortcut: hiding needs a flag respected by every read path, and every read
 * path is the expensive part. The cost accepted in exchange is that a wrongly
 * deleted Bite cannot be restored, which is why the reason is required.
 *
 * The hard part is not the delete, it is what a Bite is connected to.
 * `decrementBiteCountOnBiteDelete` already fires on delete, so the author's
 * Bite count and the leaderboard self-correct; nothing else does. The likes and
 * reviews hanging off the Bite, its image in Storage, and the restaurant
 * candidates, bucket lists and BiteTrails that name its id all have to be
 * cleared here.
 *
 * **The Bite document goes last.** Every read path resolves through it, so
 * while it exists the Bite is still findable and a failed run is a retry; the
 * other way round, a failure halfway would leave an image, a set of likes and a
 * pile of reviews with no document left to reach them from. This is the order
 * `deleteOwnAccount` uses for the same reason.
 */
export const deleteBiteAsOperatorHandler = async (
  request: CallableRequest<DeleteBiteAsOperatorRequest>,
): Promise<DeleteBiteAsOperatorResult> => {
  requireAdmin(request);
  const biteId = parseBiteId(request.data?.biteId);
  const reason = parseReason(request.data?.reason);

  const db = getFirestore();
  const biteRef = db.collection(BITES_COLLECTION).doc(biteId);
  const snapshot = await biteRef.get();

  // Before anything is touched, so a mistyped id is a clean refusal rather
  // than a half-finished cascade over a Bite that never existed.
  if (!snapshot.exists) {
    throw new HttpsError('not-found', `No Bite found for ${biteId}.`);
  }

  const bite = snapshot.data() ?? {};

  logOperatorAction(request, {
    action: 'deleteBiteAsOperator',
    targetType: 'bite',
    targetId: biteId,
    outcome: 'started',
    reason,
  });

  const deletedLikes = await deleteLikesForBite(db, biteId);
  const deletedReviews = await deleteReviewsForBite(db, biteId);
  const deletedImagePaths = await deleteImagesForBite(biteId, bite);
  const updatedRestaurantCandidates = await removeBiteFromRestaurantCandidates(
    db,
    biteId,
  );
  const updatedBucketlists = await removeBiteFromBucketlists(db, biteId);
  const updatedBiteTrails = await removeBiteFromBiteTrails(db, biteId);

  await biteRef.delete();

  const result: DeleteBiteAsOperatorResult = {
    biteId,
    deletedLikes,
    deletedReviews,
    deletedImages: deletedImagePaths.length,
    updatedRestaurantCandidates,
    updatedBucketlists,
    updatedBiteTrails,
  };

  logOperatorAction(request, {
    action: 'deleteBiteAsOperator',
    targetType: 'bite',
    targetId: biteId,
    outcome: 'succeeded',
    reason,
    details: {
      deletedLikes,
      deletedReviews,
      updatedRestaurantCandidates,
      updatedBucketlists,
      updatedBiteTrails,
      // The Bite is gone, so the log entry is the only place its author and
      // name survive. `imagePaths` names the objects rather than counting
      // them, because the image is often the content that had to come down.
      authorUid: typeof bite['userId'] === 'string' ? bite['userId'] : '',
      name: typeof bite['name'] === 'string' ? bite['name'] : '',
      imagePaths: deletedImagePaths,
    },
  });

  return result;
};

export const deleteBiteAsOperator = onAppCheck<DeleteBiteAsOperatorRequest>(
  deleteBiteAsOperatorHandler,
);
