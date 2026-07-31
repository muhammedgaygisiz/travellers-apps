import { onDocumentCreated } from 'firebase-functions/firestore';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { User } from '../shared/model/user';
import { Bite } from '../shared/model/bite';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

const db = getFirestore();

type Review = {
  biteId: string;
  authorId: string;
  author: string;
  review: string;
};

export const notifyBiteCreatorOnReview = onDocumentCreated(
  'reviews/{reviewId}',
  async (event) => {
    const snap = event.data;

    logger.info('--- New review created, preparing to notify bite creator');
    if (!snap) {
      return;
    }

    const review = snap.data() as Review;
    const reviewAuthorId = review.authorId;

    logger.info('--- Review author UID:', reviewAuthorId);
    if (!reviewAuthorId) {
      logger.warn('--- Review has no author UID, aborting notification');
      return;
    }

    const reviewAuthorSnap = await db.doc(`users/${reviewAuthorId}`).get();

    logger.info('--- Review author exist:', reviewAuthorSnap.exists);
    if (!reviewAuthorSnap.exists) {
      logger.warn(
        `--- Review author does not exist: ${reviewAuthorSnap.exists}, aborting notification`,
      );
      return;
    }

    const reviewAuthorData = reviewAuthorSnap.data() as User;

    logger.info('--- Review author:', reviewAuthorData);
    if (!reviewAuthorData || !reviewAuthorData.public) {
      logger.warn(
        '--- Review author with no data or not public, aborting notification',
      );
      return;
    }

    const rawBiteId = review.biteId;
    const biteId = rawBiteId?.split('/').pop();

    logger.info('--- Bite ID:', biteId);
    if (!biteId) {
      logger.warn('--- Review has no valid biteId, aborting notification');
      return;
    }

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

    if (biteCreatorUid === reviewAuthorId) {
      logger.info(
        '--- Review author is the bite creator, skipping self-notification',
      );
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

    await sendLocalizedNotification({
      uids: [biteCreatorUid],
      data: {
        type: 'NEW_BITE_REVIEW',
        biteId: `${biteId}`,
        reviewAuthorId: `${reviewAuthorId}`,
      },
      buildMessage: (translate) => ({
        title: translate('newReview.title'),
        body: translate('newReview.body', {
          reviewer: reviewAuthorData.displayName ?? translate('common.someone'),
          bite: biteData.name,
        }),
      }),
    });
  },
);
