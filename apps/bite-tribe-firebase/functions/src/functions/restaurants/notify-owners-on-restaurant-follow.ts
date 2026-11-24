import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';
import { RESTAURANT_COLLECTION } from './restaurant-authority';

/**
 * When a restaurant's owners were last told about a new follower, one
 * document per restaurant. Written here alone; the rules refuse every client.
 */
export const RESTAURANT_FOLLOWER_PUSHES_COLLECTION = 'restaurantFollowerPushes';

/** At most one new-follower push per restaurant in this window. */
export const RESTAURANT_FOLLOWER_PUSH_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Claims the restaurant's push for this window, or reports it taken. A
 * transaction, so two follows landing together send one push between them.
 */
export const claimRestaurantFollowerPush = async (
  restaurantId: string,
  now: number,
): Promise<boolean> => {
  const db = getFirestore();
  const ref = db.doc(
    `${RESTAURANT_FOLLOWER_PUSHES_COLLECTION}/${restaurantId}`,
  );

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const last = snapshot.data()?.['lastSentAtTimestamp'];

    if (
      typeof last === 'number' &&
      now - last < RESTAURANT_FOLLOWER_PUSH_WINDOW_MS
    ) {
      return false;
    }

    transaction.set(ref, {
      restaurantId,
      lastSentAt: new Date(now).toISOString(),
      lastSentAtTimestamp: now,
    });

    return true;
  });
};

/**
 * Tells a restaurant's owners that somebody started following it (GitHub
 * issue #2318), at most once a day per restaurant.
 *
 * The push names the restaurant, never the guest: owners see how many follow,
 * never who (#2132). An owner following their own restaurant tells nobody
 * about it. The owners are `ownerUserIds`; staff are not told.
 *
 * The window is claimed only once there is somebody to tell, so a follow of
 * an unheld restaurant does not use up the day for the owner it gets later.
 * `sendLocalizedNotification` reaches only the devices that still have push
 * on, in each owner's language.
 */
export const notifyOwnersOnRestaurantFollow = onDocumentCreated(
  'users/{userId}/followedRestaurants/{restaurantId}',
  async (event) => {
    const { userId, restaurantId } = event.params;
    const snapshot = await getFirestore()
      .doc(`${RESTAURANT_COLLECTION}/${restaurantId}`)
      .get();
    const restaurant = snapshot.data();

    if (!restaurant) {
      return;
    }

    const owners: unknown = restaurant['ownerUserIds'];
    const ownerUids = (Array.isArray(owners) ? owners : []).filter(
      (uid): uid is string =>
        typeof uid === 'string' && uid.length > 0 && uid !== userId,
    );

    if (ownerUids.length === 0) {
      return;
    }

    if (!(await claimRestaurantFollowerPush(restaurantId, Date.now()))) {
      logger.info(
        `notifyOwnersOnRestaurantFollow: ${restaurantId} was told within the window`,
      );
      return;
    }

    const name =
      typeof restaurant['name'] === 'string' ? restaurant['name'] : '';

    await sendLocalizedNotification({
      uids: ownerUids,
      data: { type: 'RESTAURANT_NEW_FOLLOWER', restaurantId },
      buildMessage: (translate) => ({
        title: translate('restaurantFollower.title'),
        body: translate('restaurantFollower.body', { restaurant: name }),
      }),
    });
  },
);
