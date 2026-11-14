import { onSchedule } from 'firebase-functions/scheduler';
import { logger } from 'firebase-functions';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';
import {
  buildLeaderboardNotificationBody,
  computeRankChanges,
  LeaderboardRankChange,
  LeaderboardUser,
  LEADERBOARD_DAILY_DOC,
  META_COLLECTION,
} from '../shared/utils/leaderboard';
import { readWeeklyLeaderboard } from '../shared/utils/weekly-leaderboard';

const db = getFirestore();

const ZURICH_TZ = 'Europe/Zurich';

/**
 * Reads the daily baseline ranking. Returns `null` when there is nothing to
 * compare against: the document does not exist yet (the first daily run), or
 * it was taken in another week than `week`. A baseline from before the Monday
 * reset would report every ranked user as having dropped out, so a new week
 * starts from a fresh baseline instead (issue #2027). A baseline written
 * before the board became weekly carries no week and counts as another week.
 */
const readBaseline = async (
  week: string,
): Promise<LeaderboardUser[] | null> => {
  const snap = await db
    .collection(META_COLLECTION)
    .doc(LEADERBOARD_DAILY_DOC)
    .get();

  if (!snap.exists || snap.data()?.['week'] !== week) {
    return null;
  }

  const users = snap.data()?.['users'];

  return Array.isArray(users) ? (users as LeaderboardUser[]) : [];
};

/**
 * Overwrites the daily baseline with the given ranking so tomorrow's run can
 * diff against today.
 */
const storeBaseline = async (
  week: string,
  users: LeaderboardUser[],
): Promise<void> => {
  await db.collection(META_COLLECTION).doc(LEADERBOARD_DAILY_DOC).set({
    week,
    users,
    computedAt: FieldValue.serverTimestamp(),
  });
};

const notifyUser = async (change: LeaderboardRankChange): Promise<void> => {
  await sendLocalizedNotification({
    uids: [change.userId],
    data: {
      type: 'LEADERBOARD_RANK_CHANGE',
      userId: `${change.userId}`,
    },
    buildMessage: (translate) => ({
      title: translate('leaderboard.title'),
      body: buildLeaderboardNotificationBody(change, translate),
    }),
  });
};

/**
 * Scheduled Cloud Function that runs every day at 09:00 Europe/Zurich.
 *
 * It compares the running week's leaderboard against the ranking captured on
 * the previous run and sends each user whose rank changed since yesterday a
 * single push notification. The very first run, and the first run of every
 * week, only seeds the baseline: there is nothing in the same week to compare
 * against, and the reset itself is not news to anyone (issue #2027).
 */
export const sendDailyLeaderboardNotification = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: ZURICH_TZ,
  },
  async (): Promise<void> => {
    logger.info('--- Starting daily leaderboard notification');

    const { week, users: currentUsers } = await readWeeklyLeaderboard(db);
    const baselineUsers = await readBaseline(week);

    if (baselineUsers === null) {
      logger.info(
        '--- No baseline for this week yet; seeding today as baseline and skipping notifications',
        { week },
      );
      await storeBaseline(week, currentUsers);
      return;
    }

    const changes = computeRankChanges(baselineUsers, currentUsers);

    logger.info('--- Leaderboard rank changes since yesterday:', changes);

    for (const change of changes) {
      await notifyUser(change);
    }

    // Commit today's ranking as tomorrow's baseline only after notifications
    // have been dispatched, so a mid-run failure retries against the same
    // baseline instead of silently swallowing the changes.
    await storeBaseline(week, currentUsers);

    logger.info('--- Daily leaderboard notification finished', {
      notifiedUsers: changes.length,
    });
  },
);
