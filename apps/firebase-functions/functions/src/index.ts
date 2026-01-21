import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { logger } from 'firebase-functions';
import { BatchResponse } from 'firebase-admin/messaging';

const CHUNK_SIZE = 500;

admin.initializeApp();
const db = admin.firestore();

type Bite = {
  userId: string;
  name: string;
  id: string;
};

type User = {
  displayName: string;
  userId: string;
  public: boolean;
};

type PushToken = {
  enabled: boolean;
};

const getFollowerUids = (
  followersSnap: FirebaseFirestore.QuerySnapshot<
    FirebaseFirestore.DocumentData,
    FirebaseFirestore.DocumentData
  >,
): string[] => followersSnap.docs.map((d) => d.id);

const getTokens = async (followerUids: string[]): Promise<string[]> => {
  const tokenDocs = await Promise.all(
    followerUids.map(async (uid) => {
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

  return tokenDocs.flat().map((t) => t.token);
};

const buildNotificationBody = (authorData: User, bite: Bite): string => {
  const authorName = authorData.displayName ?? 'Someone';
  const title = bite.name ? `: ${bite.name}` : '';

  return `${authorName} just created a new bite${title}`;
};

const buildChunks = (tokens: string[], chunkSize: number): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += chunkSize) {
    chunks.push(tokens.slice(i, i + chunkSize));
  }
  return chunks;
};

const sendNotification = async (
  chunk: string[],
  body: string,
  bite: Bite,
  authorUid: string,
): Promise<BatchResponse> =>
  await admin.messaging().sendEachForMulticast({
    tokens: chunk,
    notification: {
      title: 'New Bite',
      body,
    },
    data: {
      type: 'NEW_BITE',
      biteId: `${bite.id}`,
      authorUid: authorUid,
    },
  });

const getInvalidTokens = (res: BatchResponse, chunk: string[]): string[] => {
  const invalidTokens: string[] = [];
  res.responses.forEach((r, idx) => {
    if (!r.success) {
      const errCode = r.error?.code ?? '';

      logger.error('--- Error sending notification', {
        error: r.error,
        token: chunk[idx],
      });
      if (
        errCode.includes('registration-token-not-registered') ||
        errCode.includes('invalid-argument')
      ) {
        invalidTokens.push(chunk[idx]);
      }
    }
  });
  return invalidTokens;
};

const cleanupInvalidTokens = async (invalidTokens: string[]): Promise<void> => {
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

export const notifyFollowersOnNewBite = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;

    logger.info('--- New bite created, preparing to notify followers');
    if (!snap) {
      return;
    }

    const bite = snap.data() as Bite;
    const authorUid = bite.userId;

    logger.info('--- Author UID:', authorUid);
    if (!authorUid) {
      logger.warn('--- Bite has no author UID, aborting notification');
      return;
    }

    const authorSnap = await db.doc(`users/${authorUid}`).get();

    logger.info('--- Author exist:', authorSnap.exists);
    if (!authorSnap.exists) {
      logger.warn(
        `--- Author does not exist: ${authorSnap.exists}, aborting notification`,
      );
      return;
    }

    const authorData = authorSnap.data() as User;

    logger.info('--- Author:', authorData);
    if (!authorData || !authorData.public) {
      logger.warn(
        '--- Author with no data or not public, aborting notification',
      );
      return;
    }

    const followersSnap = await db
      .collection(`users/${authorUid}/followers`)
      .get();

    logger.info(`--- Number of followers: ${followersSnap.size}`);
    if (followersSnap.empty) {
      logger.warn('--- No followers found, aborting notification');
      return;
    }

    const followerUids = getFollowerUids(followersSnap);

    const tokens = await getTokens(followerUids);
    if (tokens.length === 0) {
      logger.warn('--- No valid push tokens found, aborting notification');
      return;
    }

    const body = buildNotificationBody(authorData, bite);

    logger.info('--- Sending Notification with body:', body);
    const chunks = buildChunks(tokens, CHUNK_SIZE);

    logger.info('--- Chunks:', chunks);
    for (const chunk of chunks) {
      const res = await sendNotification(chunk, body, bite, authorUid);

      const invalidTokens = getInvalidTokens(res, chunk);

      logger.info('--- Invalid tokens to clean up:', invalidTokens);
      if (invalidTokens.length > 0) {
        await cleanupInvalidTokens(invalidTokens);
      }
    }
  },
);
