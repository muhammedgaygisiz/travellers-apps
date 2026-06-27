import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { Bite } from './model/bite';

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
  },
);
