import { logger } from 'firebase-functions';
import { PushToken } from '../model/push-token';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const getTokens = async (uids: string[]): Promise<string[]> => {
  const tokenDocs = await Promise.all(
    uids.map(async (uid) => {
      const tokenSnap = await db.collection(`users/${uid}/pushTokens`).get();

      logger.info('--- Number Push tokens:', tokenSnap.size);
      return tokenSnap.docs
        .filter((t: any) => {
          const data = t.data() as PushToken | undefined;

          logger.info('--- Push token enabled:', data?.enabled);
          return data?.enabled ?? true;
        })
        .map((t: any) => ({
          uid,
          token: t.id,
        }));
    }),
  );

  return tokenDocs.flat().map((t: any) => t.token);
};
