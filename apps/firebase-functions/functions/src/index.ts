import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { logger } from 'firebase-functions';

admin.initializeApp();
const db = admin.firestore();

type Bite = {
  userId: string;
  name: string;
};

type User = {
  displayName: string;
  userId: string;
  public: boolean;
};

type PushToken = {
  enabled: boolean;
};

export const notifyFollowersOnNewBite = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;

    if (!snap) {
      return;
    }

    const bite = snap.data() as Bite;
    const authorUid = bite.userId;
    if (!authorUid) {
      return;
    }

    const authorSnap = await db.doc(`users/${authorUid}`).get();

    if (!authorSnap.exists) {
      return;
    }

    const authorData = authorSnap.data() as User;

    if (!authorData || !authorData.public) {
      return;
    }

    const followersSnap = await db
      .collection(`users/${authorUid}/followers`)
      .get();

    if (followersSnap.empty) {
      return;
    }

    const followerUids = followersSnap.docs.map((d) => d.id);

    const tokenDocs = await Promise.all(
      followerUids.map(async (uid) => {
        const tokenSnap = await db.collection(`users/${uid}/pushTokens`).get();
        return tokenSnap.docs
          .filter((t) => {
            const data = t.data() as PushToken | undefined;

            return data?.enabled ?? true;
          })
          .map((t) => ({
            uid,
            token: t.id,
          }));
      }),
    );

    const tokens = tokenDocs.flat().map((t) => t.token);
    if (tokens.length === 0) {
      return;
    }

    const authorName = authorData.displayName ?? 'Someone';
    const title = bite.name ? `: ${bite.name}` : '';
    const body = `${authorName} just created a new bite${title}`;

    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const res = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: 'New Bite',
          body,
        },
        data: {
          type: 'NEW_BITE',
          biteId: snap.id,
          authorUid: authorUid,
        },
      });

      const invalidTokens: string[] = [];
      res.responses.forEach((r, idx) => {
        if (!r.success) {
          const errCode = r.error?.code ?? '';

          if (
            errCode.includes('registration-token-not-registered') ||
            errCode.includes('invalid-argument')
          ) {
            invalidTokens.push(chunk[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
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

              const userTokenRef = db.doc(
                `users/${userUid}/pushTokens/${token}`,
              );
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
      }
    }
  },
);
