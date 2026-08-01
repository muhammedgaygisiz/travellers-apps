import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

const db = getFirestore();

const USERS_COLLECTION = 'users';

/**
 * Every account in the system, for the triggers that address the whole tribe.
 *
 * Only the ids are read: which of those accounts actually has a delivery
 * address is decided later, when tokens are resolved, so this stays a cheap
 * `users` scan rather than a fan-out over subcollections.
 */
export const getAllUserUids = async (): Promise<string[]> => {
  const usersSnap = await db.collection(USERS_COLLECTION).get();

  logger.info(`--- Number of users: ${usersSnap.size}`);

  return usersSnap.docs.map((doc) => doc.id);
};
