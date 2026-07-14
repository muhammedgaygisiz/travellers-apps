import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from 'firebase-functions/firestore';

type LikeType = 'thumbup' | 'drooling' | 'mindblown';

type Like = {
  likeType?: unknown;
};

type LikeCounts = Record<LikeType, number>;

const LIKE_TYPES: LikeType[] = ['thumbup', 'drooling', 'mindblown'];
const BITE_COLLECTION = 'bites';

const db = admin.firestore();

const isLikeType = (value: unknown): value is LikeType =>
  LIKE_TYPES.includes(value as LikeType);

const hasAggregateLikeCounts = (bite: admin.firestore.DocumentData): boolean =>
  LIKE_TYPES.every((likeType) => typeof bite[likeType] === 'number');

const getEmptyLikeCounts = (): LikeCounts => ({
  thumbup: 0,
  drooling: 0,
  mindblown: 0,
});

const countLikes = (
  likesSnap: admin.firestore.QuerySnapshot<admin.firestore.DocumentData>,
): LikeCounts =>
  likesSnap.docs.reduce<LikeCounts>((counts, likeSnap) => {
    const like = likeSnap.data() as Like;
    const likeType = like.likeType;

    if (isLikeType(likeType)) {
      counts[likeType] += 1;
    }

    return counts;
  }, getEmptyLikeCounts());

const syncOrApplyLikeCountDelta = async (
  biteId: string,
  deltas: Partial<Record<LikeType, number>>,
): Promise<void> => {
  const biteRef = db.doc(`${BITE_COLLECTION}/${biteId}`);

  await db.runTransaction(async (transaction) => {
    const biteSnap = await transaction.get(biteRef);

    if (!biteSnap.exists) {
      logger.warn('updateBiteLikeCountOnLikeWrite: bite not found', {
        biteId,
      });
      return;
    }

    const bite = biteSnap.data() || {};

    if (!hasAggregateLikeCounts(bite)) {
      const likesSnap = await transaction.get(biteRef.collection('likes'));
      const counts = countLikes(likesSnap);

      transaction.update(biteRef, counts);

      logger.info('updateBiteLikeCountOnLikeWrite: migrated like counts', {
        biteId,
        ...counts,
      });
      return;
    }

    const updates = LIKE_TYPES.reduce<Record<string, number>>(
      (result, likeType) => {
        const delta = deltas[likeType] || 0;

        if (delta === 0) {
          return result;
        }

        const currentCount =
          typeof bite[likeType] === 'number' ? bite[likeType] : 0;
        result[likeType] = Math.max(currentCount + delta, 0);

        return result;
      },
      {},
    );

    if (Object.keys(updates).length > 0) {
      transaction.update(biteRef, updates);
    }
  });
};

export const incrementBiteLikeCountOnLikeCreate = onDocumentCreated(
  'bites/{biteId}/likes/{likeId}',
  async (event) => {
    const like = event.data?.data() as Like | undefined;
    const likeType = like?.likeType;

    if (!isLikeType(likeType)) {
      logger.warn('incrementBiteLikeCountOnLikeCreate: invalid like type', {
        biteId: event.params.biteId,
        likeId: event.params.likeId,
        likeType,
      });
      await syncOrApplyLikeCountDelta(event.params.biteId, {});
      return;
    }

    await syncOrApplyLikeCountDelta(event.params.biteId, { [likeType]: 1 });
  },
);

export const decrementBiteLikeCountOnLikeDelete = onDocumentDeleted(
  'bites/{biteId}/likes/{likeId}',
  async (event) => {
    const like = event.data?.data() as Like | undefined;
    const likeType = like?.likeType;

    if (!isLikeType(likeType)) {
      logger.warn('decrementBiteLikeCountOnLikeDelete: invalid like type', {
        biteId: event.params.biteId,
        likeId: event.params.likeId,
        likeType,
      });
      await syncOrApplyLikeCountDelta(event.params.biteId, {});
      return;
    }

    await syncOrApplyLikeCountDelta(event.params.biteId, { [likeType]: -1 });
  },
);

export const updateBiteLikeCountOnLikeUpdate = onDocumentUpdated(
  'bites/{biteId}/likes/{likeId}',
  async (event) => {
    const beforeLike = event.data?.before.data() as Like | undefined;
    const afterLike = event.data?.after.data() as Like | undefined;
    const beforeLikeType = beforeLike?.likeType;
    const afterLikeType = afterLike?.likeType;

    if (beforeLikeType === afterLikeType) {
      await syncOrApplyLikeCountDelta(event.params.biteId, {});
      return;
    }

    const deltas: Partial<Record<LikeType, number>> = {};

    if (isLikeType(beforeLikeType)) {
      deltas[beforeLikeType] = -1;
    }

    if (isLikeType(afterLikeType)) {
      deltas[afterLikeType] = (deltas[afterLikeType] || 0) + 1;
    }

    if (Object.keys(deltas).length === 0) {
      logger.warn('updateBiteLikeCountOnLikeUpdate: invalid like types', {
        biteId: event.params.biteId,
        likeId: event.params.likeId,
        beforeLikeType,
        afterLikeType,
      });
      await syncOrApplyLikeCountDelta(event.params.biteId, {});
      return;
    }

    await syncOrApplyLikeCountDelta(event.params.biteId, deltas);
  },
);
