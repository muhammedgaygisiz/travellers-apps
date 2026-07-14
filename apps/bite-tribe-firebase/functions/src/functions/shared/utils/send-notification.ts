import { BatchResponse } from 'firebase-admin/messaging';
import * as admin from 'firebase-admin';

export const sendNotification = async (
  chunk: string[],
  body: string,
  biteId: string,
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
      biteId: `${biteId}`,
      authorUid: authorUid,
    },
  });
