import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  onDocumentCreated,
  onDocumentDeleted,
} from 'firebase-functions/firestore';

type FollowCountField = 'followersCount' | 'followingCount';

const USERS_COLLECTION = 'users';

/**
 * Maps an aggregate counter field to the user subcollection it counts, so the
 * migration path can rebuild the counter from the real relationships.
 */
const SUBCOLLECTION_FOR_FIELD: Record<FollowCountField, string> = {
  followersCount: 'followers',
  followingCount: 'following',
};

const db = getFirestore();

/**
 * Applies a follow-count delta to the user document, migrating first when the
 * aggregate does not exist yet.
 *
 * `followersCount` and `followingCount` are new fields, so existing user
 * documents predate them. A blind `FieldValue.increment` would treat the
 * missing field as 0 and write a wrong count (e.g. `1` for a user who already
 * has five followers). To avoid corrupting existing users, the first write for
 * a user whose counter is absent recomputes the value from the subcollection —
 * which already reflects this event, since the trigger fires after the
 * create/delete commits — and skips the delta. This mirrors the self-healing
 * migration used for Bite like aggregates.
 */
const syncOrApplyFollowCountDelta = async (
  userId: string,
  field: FollowCountField,
  delta: number,
  context: string,
): Promise<void> => {
  const userRef = db.doc(`${USERS_COLLECTION}/${userId}`);

  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists) {
      logger.warn(`${context}: user ${userId} not found`);
      return;
    }

    const user = userSnap.data() || {};

    if (typeof user[field] !== 'number') {
      const subSnap = await transaction.get(
        userRef.collection(SUBCOLLECTION_FOR_FIELD[field]),
      );

      transaction.update(userRef, {
        [field]: subSnap.size,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info(`${context}: migrated ${field} for ${userId}`, {
        [field]: subSnap.size,
      });
      return;
    }

    transaction.update(userRef, {
      [field]: Math.max(user[field] + delta, 0),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

export const incrementFollowersCountOnFollowerCreate = onDocumentCreated(
  'users/{userId}/followers/{followerId}',
  async (event) => {
    const { userId, followerId } = event.params;

    await syncOrApplyFollowCountDelta(
      userId,
      'followersCount',
      1,
      'incrementFollowersCountOnFollowerCreate',
    );

    logger.info(
      `incrementFollowersCountOnFollowerCreate: applied +1 followersCount for ${userId} (follower ${followerId})`,
    );
  },
);

export const decrementFollowersCountOnFollowerDelete = onDocumentDeleted(
  'users/{userId}/followers/{followerId}',
  async (event) => {
    const { userId, followerId } = event.params;

    await syncOrApplyFollowCountDelta(
      userId,
      'followersCount',
      -1,
      'decrementFollowersCountOnFollowerDelete',
    );

    logger.info(
      `decrementFollowersCountOnFollowerDelete: applied -1 followersCount for ${userId} (follower ${followerId})`,
    );
  },
);

export const incrementFollowingCountOnFollowingCreate = onDocumentCreated(
  'users/{userId}/following/{followedId}',
  async (event) => {
    const { userId, followedId } = event.params;

    await syncOrApplyFollowCountDelta(
      userId,
      'followingCount',
      1,
      'incrementFollowingCountOnFollowingCreate',
    );

    logger.info(
      `incrementFollowingCountOnFollowingCreate: applied +1 followingCount for ${userId} (followed ${followedId})`,
    );
  },
);

export const decrementFollowingCountOnFollowingDelete = onDocumentDeleted(
  'users/{userId}/following/{followedId}',
  async (event) => {
    const { userId, followedId } = event.params;

    await syncOrApplyFollowCountDelta(
      userId,
      'followingCount',
      -1,
      'decrementFollowingCountOnFollowingDelete',
    );

    logger.info(
      `decrementFollowingCountOnFollowingDelete: applied -1 followingCount for ${userId} (followed ${followedId})`,
    );
  },
);
