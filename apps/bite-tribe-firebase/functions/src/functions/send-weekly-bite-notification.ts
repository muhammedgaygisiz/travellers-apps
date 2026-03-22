import { onSchedule } from 'firebase-functions/scheduler';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const db = admin.firestore();

const WEEKLY_BITES_TOPIC = 'weekly-bites';
const ZURICH_TZ = 'Europe/Zurich';

/**
 * Returns the UTC timestamp (ms) for 00:00:00.000 on the given calendar date
 * in the Europe/Zurich timezone, correctly accounting for DST.
 *
 * @param year  Full calendar year (e.g. 2025).
 * @param month 1-indexed month (1 = January … 12 = December).
 * @param day   Day of the month (1-indexed).
 */
export const toMidnightZurich = (
  year: number,
  month: number,
  day: number,
): number => {
  // Start from UTC midnight of the requested date
  const utcMidnight = new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`,
  );

  // Find out what wall-clock time that UTC instant corresponds to in Zurich
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ZURICH_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const [h, m, s] = timeFormatter.format(utcMidnight).split(':').map(Number);

  // Zurich is always ahead of UTC (UTC+1 or UTC+2).
  // UTC midnight therefore appears as 01:00 or 02:00 in Zurich.
  // To get Zurich midnight we subtract that offset.
  const offsetMs = (h * 3600 + m * 60 + s) * 1000;

  return utcMidnight.getTime() - offsetMs;
};

/**
 * Returns the UTC timestamp (ms) for 23:59:59.999 on the given calendar date
 * in the Europe/Zurich timezone, correctly accounting for DST.
 *
 * @param year  Full calendar year (e.g. 2025).
 * @param month 1-indexed month (1 = January … 12 = December).
 * @param day   Day of the month (1-indexed).
 */
export const toEndOfDayZurich = (
  year: number,
  month: number,
  day: number,
): number => {
  // The end of day is 1 ms before the start of the next day.
  // Use a Date so JavaScript handles month/year overflow automatically.
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

  return (
    toMidnightZurich(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
    ) - 1
  );
};

/**
 * Returns the [start, end] Unix-ms bounds for the previous calendar week
 * (Monday 00:00:00 – Sunday 23:59:59.999) in Europe/Zurich time.
 *
 * This function is called when the scheduler fires on a Monday, so "today"
 * is Monday and the previous week runs from the Monday 7 days ago through
 * the Sunday 1 day ago.
 */
export const getPreviousWeekBounds = (): { start: number; end: number } => {
  const now = new Date();

  // Determine today's calendar date in Zurich timezone
  const todayZurich = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZURICH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // "YYYY-MM-DD"

  const [yearStr, monthStr, dayStr] = todayZurich.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed
  const day = parseInt(dayStr, 10);

  // Previous Monday = today – 7 days; Previous Sunday = today – 1 day.
  // Use Date.UTC so JavaScript handles month/year roll-overs correctly.
  const prevMonday = new Date(Date.UTC(year, month - 1, day - 7));
  const prevSunday = new Date(Date.UTC(year, month - 1, day - 1));

  return {
    start: toMidnightZurich(
      prevMonday.getUTCFullYear(),
      prevMonday.getUTCMonth() + 1,
      prevMonday.getUTCDate(),
    ),
    end: toEndOfDayZurich(
      prevSunday.getUTCFullYear(),
      prevSunday.getUTCMonth() + 1,
      prevSunday.getUTCDate(),
    ),
  };
};

/**
 * Scheduled Cloud Function that runs every Monday evening (18:00 Europe/Zurich).
 * It counts the bites created during the previous calendar week and sends a
 * single FCM topic notification to all users subscribed to 'weekly-bites'.
 */
export const sendWeeklyBiteNotification = onSchedule(
  {
    schedule: '0 18 * * 1',
    timeZone: ZURICH_TZ,
  },
  async () => {
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

    const body =
      biteCount === 1
        ? '🍽️ The BiteTribe shared 1 new bite last week 🤩'
        : `🍽️ The BiteTribe shared ${biteCount} new bites last week 🤩`;

    logger.info('--- Sending topic notification to:', WEEKLY_BITES_TOPIC);

    await admin.messaging().send({
      topic: WEEKLY_BITES_TOPIC,
      notification: {
        title: "🍽️ This week's bites are here",
        body,
      },
      data: {
        type: 'WEEKLY_BITE_SUMMARY',
        biteCount: `${biteCount}`,
      },
    });

    logger.info('--- Weekly bite notification sent successfully');
  },
);
