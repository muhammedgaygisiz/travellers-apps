import { getAuth } from 'firebase-admin/auth';
import {
  DocumentData,
  DocumentReference,
  FieldValue,
  Firestore,
  Query,
  getFirestore,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  LEADERBOARD_DAILY_DOC,
  LeaderboardUser,
  META_COLLECTION,
  rebuildLeaderboard,
} from '../shared/utils/leaderboard';
import {
  DISPLAY_NAMES_COLLECTION,
  USERS_COLLECTION,
  normalizeDisplayName,
} from './display-name-utils';

const BITES_COLLECTION = 'bites';
const BITE_TRAILS_COLLECTION = 'biteTrails';
const BUCKETLISTS_COLLECTION = 'bucketlists';
const LIKES_COLLECTION = 'likes';
const RATINGS_COLLECTION = 'ratings';
const REVIEWS_COLLECTION = 'reviews';
const SELLS_COLLECTION = 'sells';
const SETTINGS_COLLECTION = 'settings';

const FOLLOWERS_SUBCOLLECTION = 'followers';
const FOLLOWING_SUBCOLLECTION = 'following';
const PUSH_TOKENS_SUBCOLLECTION = 'pushTokens';

export const ACCOUNT_DELETIONS_COLLECTION = 'accountDeletions';

/** Storage prefix holding a user's profile images. */
const userImagePrefix = (uid: string): string =>
  `images/${USERS_COLLECTION}/${uid}/`;

/**
 * How recently the caller must have signed in for the deletion to run. Firebase
 * enforces the same idea client-side for `deleteUser`, but the cascade runs with
 * admin privileges, so the recency has to be proven from the ID token instead.
 */
export const REAUTH_MAX_AGE_SECONDS = 5 * 60;

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

export type AccountDeletionStatus = 'running' | 'completed' | 'failed';

export interface DeleteOwnAccountResult {
  status: AccountDeletionStatus;
}

/**
 * Applies `mutate` to every document matched by `query`, committing in batches.
 *
 * The query is re-run after each commit rather than paged with a cursor: every
 * mutation either deletes the document or clears the field the query filters
 * on, so the matching set always shrinks and re-running converges. Returns the
 * number of documents written.
 */
const applyToQuery = async (
  db: Firestore,
  query: Query,
  mutate: (batch: FirebaseFirestore.WriteBatch, ref: DocumentReference) => void,
): Promise<number> => {
  let written = 0;

  for (;;) {
    const snapshot = await query.limit(WRITE_BATCH_LIMIT).get();

    if (snapshot.empty) {
      return written;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => mutate(batch, doc.ref));
    await batch.commit();

    written += snapshot.size;

    if (snapshot.size < WRITE_BATCH_LIMIT) {
      return written;
    }
  }
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
 * Clears the author from every Bite the user created, keeping the Bite itself.
 *
 * Bites are shared content: other users' bucket lists and BiteTrails reference
 * them by id, and the discovery surfaces are built from them. Dropping the
 * `userId` removes the link to the person without tearing holes in that graph.
 * The Bite then renders the way a private user's Bite does.
 */
export const anonymizeBitesByUser = (
  db: Firestore,
  uid: string,
): Promise<number> =>
  applyToQuery(
    db,
    db.collection(BITES_COLLECTION).where('userId', '==', uid),
    (batch, ref) => batch.update(ref, { userId: FieldValue.delete() }),
  );

/**
 * Deletes every like the user gave. The like-count triggers on the Bite keep
 * `thumbup`/`drooling`/`mindblown` correct as the documents go.
 *
 * Likes live at `/bites/{biteId}/likes/{uid}`, so they can only be found across
 * every Bite with a collection-group query. Firestore indexes single fields at
 * collection scope by default, so `likes.userId` needs the collection-group
 * exemption in `firestore.indexes.json` or this query fails with `FAILED_PRECONDITION`.
 */
export const deleteLikesByUser = (
  db: Firestore,
  uid: string,
): Promise<number> =>
  applyToQuery(
    db,
    db.collectionGroup(LIKES_COLLECTION).where('userId', '==', uid),
    (batch, ref) => batch.delete(ref),
  );

/**
 * Deletes every review the user wrote. Reviews store the author's display name
 * alongside the id, so they cannot survive the account.
 */
export const deleteReviewsByUser = (
  db: Firestore,
  uid: string,
): Promise<number> =>
  applyToQuery(
    db,
    db.collection(REVIEWS_COLLECTION).where('authorId', '==', uid),
    (batch, ref) => batch.delete(ref),
  );

export const deleteBucketlistsByUser = (
  db: Firestore,
  uid: string,
): Promise<number> =>
  applyToQuery(
    db,
    db.collection(BUCKETLISTS_COLLECTION).where('userId', '==', uid),
    (batch, ref) => batch.delete(ref),
  );

/**
 * Deletes the user's BiteTrail ratings.
 *
 * A rating lives at `/biteTrails/{id}/ratings/{uid}` and carries no `userId`
 * field, so it cannot be found with a collection-group filter. The BiteTrail
 * collection is small enough to walk instead.
 */
export const deleteBiteTrailRatingsByUser = async (
  db: Firestore,
  uid: string,
): Promise<number> => {
  const biteTrails = await db.collection(BITE_TRAILS_COLLECTION).get();

  const ratingRefs = biteTrails.docs.map((biteTrail) =>
    biteTrail.ref.collection(RATINGS_COLLECTION).doc(uid),
  );

  const existing = await Promise.all(
    ratingRefs.map(async (ref) => ((await ref.get()).exists ? ref : undefined)),
  );

  const refsToDelete = existing.filter(
    (ref): ref is DocumentReference => ref !== undefined,
  );

  await deleteRefs(db, refsToDelete);

  return refsToDelete.length;
};

/**
 * Strips the buyer from the user's BiteTrail purchase records without removing
 * them. The seller's `soldCount` is derived from the number of documents in
 * `/biteTrails/{id}/sells`, so deleting them would silently reduce another
 * user's sales figure.
 *
 * Like {@link deleteLikesByUser}, this reaches into a subcollection, so
 * `sells.userId` needs the collection-group exemption in `firestore.indexes.json`.
 */
export const anonymizeBiteTrailSalesByUser = (
  db: Firestore,
  uid: string,
): Promise<number> =>
  applyToQuery(
    db,
    db.collectionGroup(SELLS_COLLECTION).where('userId', '==', uid),
    (batch, ref) => batch.update(ref, { userId: FieldValue.delete() }),
  );

/**
 * Removes the user from both sides of every follow relationship. The follow
 * write triggers keep `followersCount`/`followingCount` correct on the users
 * who remain.
 */
export const deleteFollowEdgesForUser = async (
  db: Firestore,
  uid: string,
): Promise<number> => {
  const userRef = db.collection(USERS_COLLECTION).doc(uid);

  const [followers, following] = await Promise.all([
    userRef.collection(FOLLOWERS_SUBCOLLECTION).get(),
    userRef.collection(FOLLOWING_SUBCOLLECTION).get(),
  ]);

  const refs: DocumentReference[] = [];

  followers.docs.forEach((follower) => {
    refs.push(follower.ref);
    refs.push(
      db
        .collection(USERS_COLLECTION)
        .doc(follower.id)
        .collection(FOLLOWING_SUBCOLLECTION)
        .doc(uid),
    );
  });

  following.docs.forEach((followed) => {
    refs.push(followed.ref);
    refs.push(
      db
        .collection(USERS_COLLECTION)
        .doc(followed.id)
        .collection(FOLLOWERS_SUBCOLLECTION)
        .doc(uid),
    );
  });

  await deleteRefs(db, refs);

  return refs.length;
};

export const deletePushTokensForUser = async (
  db: Firestore,
  uid: string,
): Promise<number> => {
  const tokens = await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(PUSH_TOKENS_SUBCOLLECTION)
    .get();

  await deleteRefs(
    db,
    tokens.docs.map((token) => token.ref),
  );

  return tokens.size;
};

/**
 * Deletes the public profile and releases the display-name claim so the name
 * becomes available again. The claim is only released when it still points at
 * this user, so a name already re-claimed by someone else is left alone.
 */
export const deleteUserProfileAndClaim = async (
  db: Firestore,
  uid: string,
): Promise<void> => {
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const userSnapshot = await userRef.get();
  const user: DocumentData | undefined = userSnapshot.data();

  const storedNormalized =
    typeof user?.['normalizedDisplayName'] === 'string'
      ? (user['normalizedDisplayName'] as string)
      : '';
  const storedDisplayName =
    typeof user?.['displayName'] === 'string'
      ? (user['displayName'] as string)
      : '';
  const normalized =
    storedNormalized || normalizeDisplayName(storedDisplayName);

  if (normalized) {
    const claimRef = db.collection(DISPLAY_NAMES_COLLECTION).doc(normalized);
    const claimSnapshot = await claimRef.get();

    if (claimSnapshot.exists && claimSnapshot.data()?.['userId'] === uid) {
      await claimRef.delete();
    }
  }

  await userRef.delete();
};

export const deleteSettingsForUser = (
  db: Firestore,
  uid: string,
): Promise<FirebaseFirestore.WriteResult> =>
  db.collection(SETTINGS_COLLECTION).doc(uid).delete();

export const deleteProfileImagesForUser = async (
  uid: string,
): Promise<void> => {
  await getStorage()
    .bucket()
    .deleteFiles({ prefix: userImagePrefix(uid) });
};

/**
 * Removes the user from both persisted leaderboard snapshots.
 *
 * The leaderboard is a cached document, not a live query, and it stores each
 * entry's display name, email and photo. Nothing rebuilds it except a Bite
 * create or delete — and this flow keeps the Bites — so without this step a
 * deleted user's personal data would sit in `/meta/leaderboard` until some
 * unrelated user happens to post. The daily baseline is pruned in place so the
 * next notification run does not treat the account as a user who dropped rank.
 */
export const refreshLeaderboardsAfterDeletion = async (
  db: Firestore,
  uid: string,
): Promise<void> => {
  const dailyRef = db.collection(META_COLLECTION).doc(LEADERBOARD_DAILY_DOC);
  const dailySnapshot = await dailyRef.get();
  const dailyUsers = dailySnapshot.data()?.['users'];

  if (Array.isArray(dailyUsers)) {
    const remaining = (dailyUsers as LeaderboardUser[]).filter(
      (user) => user?.userId !== uid,
    );

    if (remaining.length !== dailyUsers.length) {
      await dailyRef.set({ users: remaining }, { merge: true });
    }
  }

  await rebuildLeaderboard(db);
};

/**
 * Runs the full account deletion cascade for `uid`.
 *
 * Data is removed before the Firebase Auth account so a failure always leaves a
 * signed-in user who can retry, never an orphaned data set nobody can reach.
 * Progress is recorded in `/accountDeletions/{uid}`, and an already completed
 * job returns immediately so a retried call is a no-op rather than a second
 * pass.
 */
export const deleteAccountForUser = async (
  uid: string,
  now: Date = new Date(),
): Promise<DeleteOwnAccountResult> => {
  const db = getFirestore();
  const jobRef = db.collection(ACCOUNT_DELETIONS_COLLECTION).doc(uid);
  const job = await jobRef.get();

  if (job.data()?.['status'] === 'completed') {
    logger.info('deleteOwnAccount: account already deleted', { uid });

    return { status: 'completed' };
  }

  const startedAt = now.toISOString();

  await jobRef.set(
    {
      userId: uid,
      status: 'running',
      startedAt,
      startedAtTimestamp: now.getTime(),
    },
    { merge: true },
  );

  try {
    const anonymizedBites = await anonymizeBitesByUser(db, uid);
    const deletedLikes = await deleteLikesByUser(db, uid);
    const deletedReviews = await deleteReviewsByUser(db, uid);
    const deletedBucketlists = await deleteBucketlistsByUser(db, uid);
    const deletedRatings = await deleteBiteTrailRatingsByUser(db, uid);
    const anonymizedSales = await anonymizeBiteTrailSalesByUser(db, uid);
    const deletedFollowEdges = await deleteFollowEdgesForUser(db, uid);
    const deletedPushTokens = await deletePushTokensForUser(db, uid);

    await deleteSettingsForUser(db, uid);
    await deleteProfileImagesForUser(uid);
    await deleteUserProfileAndClaim(db, uid);
    await refreshLeaderboardsAfterDeletion(db, uid);

    await getAuth().deleteUser(uid);

    const completedAt = new Date();

    await jobRef.set(
      {
        status: 'completed',
        completedAt: completedAt.toISOString(),
        completedAtTimestamp: completedAt.getTime(),
        anonymizedBites,
        deletedLikes,
        deletedReviews,
        deletedBucketlists,
        deletedRatings,
        anonymizedSales,
        deletedFollowEdges,
        deletedPushTokens,
      },
      { merge: true },
    );

    logger.info('deleteOwnAccount: account deleted', {
      uid,
      anonymizedBites,
      deletedLikes,
      deletedReviews,
      deletedBucketlists,
      deletedRatings,
      anonymizedSales,
      deletedFollowEdges,
      deletedPushTokens,
    });

    return { status: 'completed' };
  } catch (error) {
    logger.error('deleteOwnAccount: account deletion failed', { uid, error });

    await jobRef.set(
      {
        status: 'failed',
        failedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { merge: true },
    );

    throw new HttpsError('internal', 'account_deletion_failed');
  }
};

/**
 * Rejects callers whose sign-in is older than {@link REAUTH_MAX_AGE_SECONDS}.
 * The app turns `reauth_required` into a fresh provider login and retries.
 */
export const assertRecentSignIn = (
  authTime: unknown,
  now: Date = new Date(),
): void => {
  if (typeof authTime !== 'number') {
    throw new HttpsError('failed-precondition', 'reauth_required');
  }

  const ageInSeconds = Math.floor(now.getTime() / 1000) - authTime;

  if (ageInSeconds > REAUTH_MAX_AGE_SECONDS) {
    throw new HttpsError('failed-precondition', 'reauth_required');
  }
};

export const deleteOwnAccountHandler = async (
  request: CallableRequest<unknown>,
): Promise<DeleteOwnAccountResult> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to delete your account.',
    );
  }

  assertRecentSignIn(request.auth.token.auth_time);

  return deleteAccountForUser(request.auth.uid);
};

/**
 * Deletes the calling user's own account and the data owned by it.
 *
 * The contract is deliberate per data category: Bites survive with the author
 * cleared, BiteTrail purchase records survive with the buyer cleared, and
 * everything else that identifies the user is removed. See
 * `ssot/pages/UC - Use Account And Legal Flows.md`.
 */
export const deleteOwnAccount = onAppCheck(
  { timeoutSeconds: 540, memory: '512MiB' },
  deleteOwnAccountHandler,
);
