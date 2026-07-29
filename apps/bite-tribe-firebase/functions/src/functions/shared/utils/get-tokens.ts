import { logger } from 'firebase-functions';
import { PushToken } from '../model/push-token';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const getTokens = async (uids: string[]): Promise<string[]> => {
  if (uids.length === 0) {
    return [];
  }

  const settingSnaps = await db.getAll(
    ...uids.map((uid) => db.doc(`settings/${uid}`)),
  );
  const optedInUids = uids.filter((uid, index) => {
    const pushNotifications = settingSnaps[index]?.data()?.pushNotifications;

    // Preserve delivery for legacy users whose settings predate the flag, but
    // make an explicit product opt-out authoritative across every device and
    // every notification sender.
    return pushNotifications !== false;
  });

  const tokenDocs = await Promise.all(
    optedInUids.map(async (uid) => {
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
