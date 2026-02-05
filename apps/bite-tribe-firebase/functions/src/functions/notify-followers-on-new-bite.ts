import { onDocumentCreated } from 'firebase-functions/firestore';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { User } from './model/user';
import { Bite } from './model/bite';
import { getInvalidTokens } from './utils/get-invalid-tokens';
import { buildChunks } from './utils/build-chunks';
import { sendNotification } from './utils/send-notification';
import { cleanupInvalidTokens } from './utils/cleanup-invalid-tokens';
import { getTokens } from './utils/get-tokens';
import { CHUNK_SIZE } from './utils/chunk-size';

const db = admin.firestore();

const getFollowerUids = (
  followersSnap: FirebaseFirestore.QuerySnapshot<
    FirebaseFirestore.DocumentData,
    FirebaseFirestore.DocumentData
  >,
): string[] => followersSnap.docs.map((d) => d.id);

const buildNotificationBody = (authorData: User, bite: Bite): string => {
  const authorName = authorData.displayName ?? 'Someone';
  const title = bite.name ? `: ${bite.name}` : '';

  return `${authorName} just created a new bite${title}`;
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
