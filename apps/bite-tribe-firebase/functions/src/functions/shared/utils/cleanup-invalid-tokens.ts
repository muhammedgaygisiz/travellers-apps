import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();
import { logger } from 'firebase-functions';

export const cleanupInvalidTokens = async (
  invalidTokens: string[],
): Promise<void> => {
  await Promise.all(
    invalidTokens.map(async (token) => {
      try {
        const indexRef = db.doc(`pushTokens/${token}`);
        const indexSnap = await indexRef.get();

        if (!indexSnap.exists) {
          // Index already gone -> nothing to clean
          return;
        }

        const { userUid } = indexSnap.data() as { userUid: string };

        const userTokenRef = db.doc(`users/${userUid}/pushTokens/${token}`);
        await Promise.all([userTokenRef.delete(), indexRef.delete()]);

        logger.info('Deleted invalid push token', { userUid, token });
      } catch (error) {
        logger.error('Failed to clean up invalid token', {
          token,
          error,
        });
      }
    }),
  );
};
