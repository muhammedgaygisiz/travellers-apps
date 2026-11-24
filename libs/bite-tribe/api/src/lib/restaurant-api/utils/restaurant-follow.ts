import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { USERS_COLLECTION } from '../../utils/user-collection-key';

/**
 * A guest's follow of a restaurant (GitHub issue #2132), kept under the guest
 * and named by the restaurant's id. The rules let only the guest read it, so
 * the owner learns how many follow - the backend's `followersCount` - and never
 * who.
 */
const followReference = (userId: string, restaurantId: string): string =>
  `${USERS_COLLECTION}/${userId}/followedRestaurants/${restaurantId}`;

/** Whether the account follows the restaurant. A failed read throws. */
export const isFollowingRestaurant = async (
  userId: string,
  restaurantId: string,
): Promise<boolean> => {
  const result = await FirebaseFirestore.getDocument({
    reference: followReference(userId, restaurantId),
  });

  return Boolean(result.snapshot?.data);
};

/** Follows the restaurant. The rules refuse a place that is not one. */
export const followRestaurant = async (
  userId: string,
  restaurantId: string,
  now = new Date(),
): Promise<void> => {
  await FirebaseFirestore.setDocument({
    reference: followReference(userId, restaurantId),
    data: {
      restaurantId,
      createdAt: now.toISOString(),
      createdAtTimestamp: now.getTime(),
    },
  });
};

export const unfollowRestaurant = async (
  userId: string,
  restaurantId: string,
): Promise<void> => {
  await FirebaseFirestore.deleteDocument({
    reference: followReference(userId, restaurantId),
  });
};
