import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/firestore';
import { HttpsError } from 'firebase-functions/https';
import { USERS_COLLECTION } from '../shared/utils/user-blocks';
import { acceptFollowRequestForCaller } from './answer-follow-request';
import { FOLLOW_REQUESTS_COLLECTION } from './follow-request';

const FOLLOWERS_SUBCOLLECTION = 'followers';
const FOLLOWING_SUBCOLLECTION = 'following';

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

/**
 * Whether a user document describes a public profile. A profile without the
 * flag is private, the same reading `requestFollow` and the new-Bite push take.
 */
export const isPublicProfile = (
  data: Record<string, unknown> | undefined,
): boolean => data?.['public'] === true;

/**
 * Gives every follower edge of `ownerUid` that lacks `acceptedAt` one, on both
 * `/users/{owner}/followers/{follower}` and `/users/{follower}/following/{owner}`
 * (GitHub issue #2168). Returns the number of followers stamped.
 *
 * Each follower then counts as approved by the owner, which is what the
 * new-Bite push of a private author reads: a follower who followed the profile
 * in one tap while it was public, or before epic #2144, is kept rather than
 * dropped when it turns private.
 *
 * An edge that already carries `acceptedAt` is left alone, so a second run
 * writes nothing. A `following` edge that is missing is not created: an edge
 * written here would be counted by the follow-count triggers as a new follow.
 */
export const stampFollowersAsAccepted = async (
  db: Firestore,
  ownerUid: string,
  now: Date = new Date(),
): Promise<number> => {
  const users = db.collection(USERS_COLLECTION);
  const followers = await users
    .doc(ownerUid)
    .collection(FOLLOWERS_SUBCOLLECTION)
    .get();
  const unstamped = followers.docs.filter(
    (doc) => doc.data()?.['acceptedAt'] === undefined,
  );

  if (unstamped.length === 0) {
    return 0;
  }

  const acceptedAt = now.toISOString();
  // Two writes per follower, so half the batch limit of followers per batch.
  const perBatch = WRITE_BATCH_LIMIT / 2;

  for (let start = 0; start < unstamped.length; start += perBatch) {
    const chunk = unstamped.slice(start, start + perBatch);
    const followingRefs = chunk.map((doc) =>
      users.doc(doc.id).collection(FOLLOWING_SUBCOLLECTION).doc(ownerUid),
    );
    const followingSnaps = await db.getAll(...followingRefs);
    const batch = db.batch();

    chunk.forEach((doc, index) => {
      batch.update(doc.ref, { acceptedAt });

      const following = followingSnaps[index];

      if (following.exists && following.data()?.['acceptedAt'] === undefined) {
        batch.update(following.ref, { acceptedAt });
      }
    });

    await batch.commit();
  }

  return unstamped.length;
};

/**
 * Turns every request addressed to `ownerUid` into a follow (GitHub issue
 * #2168): both edges with `acceptedAt`, and the request deleted, through the
 * same transaction `acceptFollowRequest` runs. The follow-count triggers raise
 * both counts by one per request. Returns the number of requests accepted.
 *
 * No acceptance push is sent: the owner did not answer the requests one by
 * one, and following a public profile sends the follower nothing either. A
 * request withdrawn between the read and its transaction is skipped.
 */
export const acceptAllFollowRequests = async (
  db: Firestore,
  ownerUid: string,
  now: Date = new Date(),
): Promise<number> => {
  const requests = await db
    .collection(FOLLOW_REQUESTS_COLLECTION)
    .where('ownerUid', '==', ownerUid)
    .get();
  let accepted = 0;

  for (const request of requests.docs) {
    const requesterUid = request.data()?.['requesterUid'];

    if (typeof requesterUid !== 'string' || !requesterUid) {
      continue;
    }

    try {
      await acceptFollowRequestForCaller(db, ownerUid, requesterUid, now);
      accepted += 1;
    } catch (error) {
      if (error instanceof HttpsError && error.code === 'not-found') {
        continue;
      }

      throw error;
    }
  }

  return accepted;
};

/**
 * Fires on every user document update and acts only when `public` changed
 * (GitHub issue #2168). A trigger rather than a rule or a callable, because the
 * flag is a plain client write from profile edit that the rules already allow,
 * and the follow edges and requests it touches are not the owner's to write.
 *
 * - Turning private keeps every follower, each stamped as accepted.
 * - Turning public accepts every pending request.
 *
 * Both are idempotent, so a retried event writes nothing new.
 */
export const applyFollowVisibilityOnUserUpdate = onDocumentUpdated(
  `${USERS_COLLECTION}/{uid}`,
  async (event) => {
    const wasPublic = isPublicProfile(event.data?.before.data());
    const isPublic = isPublicProfile(event.data?.after.data());

    if (wasPublic === isPublic) {
      return;
    }

    const uid = event.params.uid;
    const db = getFirestore();

    if (isPublic) {
      const accepted = await acceptAllFollowRequests(db, uid);

      logger.info('applyFollowVisibilityOnUserUpdate: turned public', {
        uid,
        accepted,
      });

      return;
    }

    const stamped = await stampFollowersAsAccepted(db, uid);

    logger.info('applyFollowVisibilityOnUserUpdate: turned private', {
      uid,
      stamped,
    });
  },
);
