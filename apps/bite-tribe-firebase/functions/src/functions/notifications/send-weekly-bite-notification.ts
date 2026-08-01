import { onSchedule } from 'firebase-functions/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';
import { getAllUserUids } from '../shared/utils/get-all-user-uids';
import { getPreviousWeekBounds, ZURICH_TZ } from '../shared/utils/week-bounds';

const db = getFirestore();

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

    const tokenCount = await sendLocalizedNotification({
      uids: userUids,
      // The bounds travel with the notification so a tap opens exactly the
      // week the message talks about, even when the user gets to it days
      // later and "the previous week" has already moved on.
      data: {
        type: 'WEEKLY_BITE_SUMMARY',
        biteCount: `${biteCount}`,
        weekStart: `${start}`,
        weekEnd: `${end}`,
      },
      buildMessage: (translate) => ({
        title: translate('weeklyBites.title'),
        body:
          biteCount === 1
            ? translate('weeklyBites.bodyOne')
            : translate('weeklyBites.bodyMany', { count: biteCount }),
      }),
    });

    logger.info(`--- Weekly bite notification sent to ${tokenCount} tokens`);
  },
);
