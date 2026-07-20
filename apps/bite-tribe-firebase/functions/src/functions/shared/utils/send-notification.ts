import { BatchResponse, getMessaging } from 'firebase-admin/messaging';

export const sendNotification = async (
  chunk: string[],
  body: string,
  biteId: string,
  authorUid: string,
): Promise<BatchResponse> =>
  await getMessaging().sendEachForMulticast({
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
