import { Bite } from '../model/bite';
import { BatchResponse } from 'firebase-admin/messaging';
import * as admin from 'firebase-admin';

export const sendNotification = async (
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
