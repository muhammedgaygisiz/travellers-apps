import { onDocumentCreated } from 'firebase-functions/firestore';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { User } from '../shared/model/user';
import { Bite } from '../shared/model/bite';
import { getInvalidTokens } from '../shared/utils/get-invalid-tokens';
import { cleanupInvalidTokens } from '../shared/utils/cleanup-invalid-tokens';
import { getTokens } from '../shared/utils/get-tokens';
import { buildChunks } from '../shared/utils/build-chunks';
import { CHUNK_SIZE } from '../shared/utils/chunk-size';

const db = getFirestore();

type Like = {
  biteId: string;
  likeType: 'thumbup' | 'drooling' | 'mindblown';
  userId: string;
};

export const notifyBiteCreatorOnLike = onDocumentCreated(
  'bites/{biteId}/likes/{likeId}',
  async (event) => {
    const snap = event.data;

    logger.info('--- New like created, preparing to notify bite creator');
    if (!snap) {
      return;
    }

    const like = snap.data() as Like;
    const likeCreator = like.userId;

    logger.info('--- Like creator UID:', likeCreator);
    if (!likeCreator) {
      logger.warn('--- Like has no creator UID, aborting notification');
      return;
    }

    const likeCreatorSnap = await db.doc(`users/${likeCreator}`).get();

    logger.info('--- Like creator exist:', likeCreatorSnap.exists);
    if (!likeCreatorSnap.exists) {
      logger.warn(
        `--- Like creator does not exist: ${likeCreatorSnap.exists}, aborting notification`,
      );
      return;
    }

    const creatorData = likeCreatorSnap.data() as User;

    logger.info('--- Like creator:', creatorData);
    if (!creatorData || !creatorData.public) {
      logger.warn(
        '--- Like creator with no data or not public, aborting notification',
      );
      return;
    }

    const biteId = event.params.biteId;
    const biteSnap = await db.doc(`bites/${biteId}`).get();

    logger.info('--- Bite exist:', biteSnap.exists);
    if (!biteSnap.exists) {
      logger.warn(
        `--- Bite does not exist: ${biteSnap.exists}, aborting notification`,
      );
      return;
    }

    const biteData = biteSnap.data() as Bite;
    const biteCreatorUid = biteData?.userId;

    logger.info('--- Bite creator UID:', biteCreatorUid);
    if (!biteCreatorUid) {
      logger.warn('--- Bite has no creator UID, aborting notification');
      return;
    }

    const biteCreatorSnap = await db.doc(`users/${biteCreatorUid}`).get();

    logger.info('--- Bite creator exist:', biteCreatorSnap.exists);
    if (!biteCreatorSnap.exists) {
      logger.warn(
        `--- Bite creator does not exist: ${biteCreatorSnap.exists}, aborting notification`,
      );
      return;
    }

    const biteCreatorData = biteCreatorSnap.data() as User;

    logger.info('--- Bite creator:', biteCreatorData);
    if (!biteCreatorData || !biteCreatorData.public) {
      logger.warn(
        '--- Bite creator with no data or not public, aborting notification',
      );
      return;
    }

    const tokens = await getTokens([biteCreatorUid]);
    if (tokens.length === 0) {
      logger.warn('--- No valid push tokens found, aborting notification');
      return;
    }

    const chunks = buildChunks(tokens, CHUNK_SIZE);

    logger.info('--- Chunks:', chunks);
    for (const chunk of chunks) {
      const res = await getMessaging().sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: 'New Like on Your Bite!',
          body: `${creatorData.displayName} liked your Bite "${biteData.name}".`,
        },
        data: {
          type: 'NEW_BITE_LIKE',
          biteId: `${biteId}`,
          likeCreatorId: `${biteCreatorUid}`,
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
