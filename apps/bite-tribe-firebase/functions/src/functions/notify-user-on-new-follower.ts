import { onDocumentCreated } from 'firebase-functions/firestore';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { User } from './model/user';
import { getInvalidTokens } from './utils/get-invalid-tokens';
import { cleanupInvalidTokens } from './utils/cleanup-invalid-tokens';
import { getTokens } from './utils/get-tokens';
import { buildChunks } from './utils/build-chunks';
import { CHUNK_SIZE } from './utils/chunk-size';

const db = admin.firestore();

type FollowRelationship = {
  createdAt: string;
  followerUid: string;
  followedUid: string;
};
export const notifyUserOnNewFollower = onDocumentCreated(
  'users/{userId}/followers/{followerId}',
  async (event) => {
    const snap = event.data;

    logger.info('--- New follower provided, preparing to notify user');
    if (!snap) {
      return;
    }

    const followRelationship = snap.data() as FollowRelationship;
    const newFollowerUid = followRelationship.followerUid;

    logger.info('--- Follower UID:', newFollowerUid);
    if (!newFollowerUid) {
      logger.warn('--- Follower has no UID, aborting notification');
      return;
    }

    const followerSnap = await db.doc(`users/${newFollowerUid}`).get();

    logger.info('--- Follower exist:', followerSnap.exists);
    if (!followerSnap.exists) {
      logger.warn(
        `--- Follower does not exist: ${followerSnap.exists}, aborting notification`,
      );
      return;
    }

    const followerData = followerSnap.data() as User;

    logger.info('--- Follower:', followerData);
    if (!followerData || !followerData.public) {
      logger.warn(
        '--- Follower with no data or not public, aborting notification',
      );
      return;
    }

    const userId = event.params.userId;
    const userSnap = await db.doc(`users/${userId}`).get();

    logger.info('--- User exist:', userSnap.exists);
    if (!userSnap.exists) {
      logger.warn(
        `--- User does not exist: ${userSnap.exists}, aborting notification`,
      );
      return;
    }

    if (followRelationship.followedUid !== userId) {
      logger.warn(
        `--- Follower (${followRelationship.followedUid}) does not match event userId (${userId}), aborting notification`,
      );
      return;
    }

    const userData = userSnap.data() as User;

    logger.info('--- User:', userData);
    if (!userData || !userData.public) {
      logger.warn('--- User with no data or not public, aborting notification');
      return;
    }

    const tokens = await getTokens([userId]);
    if (tokens.length === 0) {
      logger.warn('--- No valid push tokens found, aborting notification');
      return;
    }

    const chunks = buildChunks(tokens, CHUNK_SIZE);

    logger.info('--- Chunks:', chunks);
    for (const chunk of chunks) {
      const res = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: 'New Follower!',
          body: `${followerData.displayName} is now following you.`,
        },
        data: {
          type: 'NEW_FOLLOWER',
          biteId: `${userId}`,
          likeCreatorId: `${newFollowerUid}`,
        },
      });

      const invalidTokens = getInvalidTokens(res, chunk);
      logger.info('--- Invalid tokens to clean up:', invalidTokens);
      if (invalidTokens.length > 0) {
        await cleanupInvalidTokens(invalidTokens);
      }
    }
  },
);
