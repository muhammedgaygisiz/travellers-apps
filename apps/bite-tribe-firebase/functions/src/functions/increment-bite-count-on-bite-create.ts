import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  onDocumentCreated,
  onDocumentDeleted,
} from 'firebase-functions/firestore';
import { Bite } from './model/bite';
import { rebuildLeaderboard } from './utils/leaderboard';

const db = admin.firestore();

export const incrementBiteCountOnBiteCreate = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;
    const biteId = event.params.biteId;

    if (!snap) {
      logger.warn('incrementBiteCountOnBiteCreate: no bite snapshot found');
      return;
    }

    const bite = snap.data() as Bite;
    const authorUid = bite.userId;

    if (!authorUid) {
      logger.warn(
        `incrementBiteCountOnBiteCreate: bite ${biteId} has no author UID`,
      );
      return;
    }

    await db.doc(`users/${authorUid}`).set(
      {
        biteCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    logger.info(
      `incrementBiteCountOnBiteCreate: incremented biteCount for ${authorUid}`,
    );

    await rebuildLeaderboard(db);
  },
);

export const decrementBiteCountOnBiteDelete = onDocumentDeleted(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;
    const biteId = event.params.biteId;

    if (!snap) {
      logger.warn('decrementBiteCountOnBiteDelete: no bite snapshot found');
      return;
    }

    const bite = snap.data() as Bite;
    const authorUid = bite.userId;

    if (!authorUid) {
      logger.warn(
        `decrementBiteCountOnBiteDelete: bite ${biteId} has no author UID`,
      );
      return;
    }

    const userRef = db.doc(`users/${authorUid}`);

    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) {
        logger.warn(
          `decrementBiteCountOnBiteDelete: user ${authorUid} not found`,
        );
        return;
      }

      const user = userSnap.data() || {};
      const currentBiteCount =
        typeof user['biteCount'] === 'number' ? user['biteCount'] : 0;

      transaction.update(userRef, {
        biteCount: Math.max(currentBiteCount - 1, 0),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    logger.info(
      `decrementBiteCountOnBiteDelete: decremented biteCount for ${authorUid}`,
    );

    await rebuildLeaderboard(db);
  },
);
