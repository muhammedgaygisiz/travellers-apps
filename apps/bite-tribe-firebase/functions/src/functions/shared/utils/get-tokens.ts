import { logger } from 'firebase-functions';
import { PushToken } from '../model/push-token';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * One delivery address, paired with the account that owns it.
 *
 * The owning uid travels with the token because delivery decisions that come
 * after collection - which language to send in, above all - are account-level
 * (issue \#1200).
 */
export interface UserPushToken {
  uid: string;
  token: string;
}

export const getTokens = async (uids: string[]): Promise<UserPushToken[]> => {
  const tokenDocs = await Promise.all(
    uids.map(async (uid) => {
      const tokenSnap = await db.collection(`users/${uid}/pushTokens`).get();

      logger.info('--- Number Push tokens:', tokenSnap.size);
      return tokenSnap.docs
        .filter((t) => {
          const data = t.data() as PushToken | undefined;

          logger.info('--- Push token enabled:', data?.enabled);
          return data?.enabled ?? true;
        })
        .map((t) => ({
          uid,
          token: t.id,
        }));
    }),
  );

  return tokenDocs.flat();
};
