import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  onDocumentCreated,
  onDocumentDeleted,
} from 'firebase-functions/firestore';
import { RESTAURANT_COLLECTION } from './restaurant-authority';

/** Where a guest's follow of a restaurant lives (GitHub issue #2132). */
export const FOLLOWED_RESTAURANTS_SUBCOLLECTION = 'followedRestaurants';

const FOLLOW_PATH = `users/{userId}/${FOLLOWED_RESTAURANTS_SUBCOLLECTION}/{restaurantId}`;

/**
 * Moves a restaurant's `followersCount` by one (GitHub issue #2132).
 *
 * No migration like the user follow counts need: restaurants could not be
 * followed before this count existed, so a restaurant without one has no
 * followers and the missing field is a true 0. Read and written in a
 * transaction rather than with `FieldValue.increment` so that a delete
 * processed before its create - triggers are not ordered - leaves 0, not -1.
 *
 * The restaurant's `updatedAt` is left alone: it says when the restaurant's
 * own details last changed, and a guest following it changes none of them.
 * A follow of a restaurant that has since been deleted moves nothing.
 */
export const applyRestaurantFollowersDelta = async (
  restaurantId: string,
  delta: 1 | -1,
): Promise<void> => {
  const db = getFirestore();
  const restaurantRef = db.doc(`${RESTAURANT_COLLECTION}/${restaurantId}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(restaurantRef);

    if (!snapshot.exists) {
      logger.warn(
        `applyRestaurantFollowersDelta: restaurant ${restaurantId} not found`,
      );
      return;
    }

    const current = snapshot.data()?.['followersCount'];
    const count = typeof current === 'number' ? current : 0;

    transaction.update(restaurantRef, {
      followersCount: Math.max(count + delta, 0),
    });
  });
};

export const incrementRestaurantFollowersOnFollow = onDocumentCreated(
  FOLLOW_PATH,
  async (event) => {
    await applyRestaurantFollowersDelta(event.params.restaurantId, 1);
  },
);

export const decrementRestaurantFollowersOnUnfollow = onDocumentDeleted(
  FOLLOW_PATH,
  async (event) => {
    await applyRestaurantFollowersDelta(event.params.restaurantId, -1);
  },
);
