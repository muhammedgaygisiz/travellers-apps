import { onSchedule } from 'firebase-functions/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { getInvalidTokens } from '../shared/utils/get-invalid-tokens';
import { cleanupInvalidTokens } from '../shared/utils/cleanup-invalid-tokens';
import { getTokens } from '../shared/utils/get-tokens';
import { buildChunks } from '../shared/utils/build-chunks';
import { CHUNK_SIZE } from '../shared/utils/chunk-size';
import { getPreviousWeekBounds, ZURICH_TZ } from '../shared/utils/week-bounds';

const db = getFirestore();

const getAllUserUids = async (): Promise<string[]> => {
  const usersSnap = await db.collection('users').get();

  logger.info(`--- Number of users: ${usersSnap.size}`);

  return usersSnap.docs.map((doc) => doc.id);
};

/**
 * Scheduled Cloud Function that runs every Monday evening (18:00 Europe/Zurich).
 * It counts the bites created during the previous calendar week and sends a
 * push notification to all users with enabled push tokens.
 */
export const sendWeeklyBiteNotification = onSchedule(
  {
    schedule: '0 18 * * 1',
    timeZone: ZURICH_TZ,
  },
  async (): Promise<void> => {
    logger.info('--- Starting weekly bite notification');

    const { start, end } = getPreviousWeekBounds();

    logger.info(
      `--- Querying bites from ${new Date(start).toISOString()} to ${new Date(end).toISOString()}`,
    );

    const countSnap = await db
      .collection('bites')
      .where('createdAtTimestamp', '>=', start)
      .where('createdAtTimestamp', '<=', end)
      .count()
      .get();

    const biteCount = countSnap.data().count;

    logger.info(`--- Found ${biteCount} bites from last week`);

    if (biteCount === 0) {
      logger.info('--- No bites found for last week, skipping notification');
      return;
    }

    const userUids = await getAllUserUids();
    if (userUids.length === 0) {
      logger.warn('--- No users found, aborting notification');
      return;
    }

    const tokens = await getTokens(userUids);
    if (tokens.length === 0) {
      logger.warn('--- No valid push tokens found, aborting notification');
      return;
    }

    const body =
      biteCount === 1
        ? 'The BiteTribe shared 1 new bite last week'
        : `The BiteTribe shared ${biteCount} new bites last week`;

    const chunks = buildChunks(tokens, CHUNK_SIZE);

    logger.info(
      `--- Sending weekly bite notification to ${tokens.length} tokens`,
    );
    logger.info('--- Chunks:', chunks);

    for (const chunk of chunks) {
      const res = await getMessaging().sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: "🍽️ This week's bites are here 🤩",
          body,
        },
        // The bounds travel with the notification so a tap opens exactly the
        // week the message talks about, even when the user gets to it days
        // later and "the previous week" has already moved on.
        data: {
          type: 'WEEKLY_BITE_SUMMARY',
          biteCount: `${biteCount}`,
          weekStart: `${start}`,
          weekEnd: `${end}`,
        },
      });

      const invalidTokens = getInvalidTokens(res, chunk);

      logger.info('--- Invalid tokens to clean up:', invalidTokens);
      if (invalidTokens.length > 0) {
        await cleanupInvalidTokens(invalidTokens);
      }
    }

    logger.info('--- Weekly bite notification sent successfully');
  },
);
