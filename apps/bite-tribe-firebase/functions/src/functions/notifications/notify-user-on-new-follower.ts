import { onDocumentCreated } from 'firebase-functions/firestore';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { User } from '../shared/model/user';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

const db = getFirestore();

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

    await sendLocalizedNotification({
      uids: [userId],
      data: {
        type: 'NEW_FOLLOWER',
        userId: `${userId}`,
        followerUid: `${newFollowerUid}`,
      },
      buildMessage: (translate) => ({
        title: translate('newFollower.title'),
        body: translate('newFollower.body', {
          follower: followerData.displayName ?? translate('common.someone'),
        }),
      }),
    });
  },
);
