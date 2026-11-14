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
import {
  BiteRankChange,
  buildMostLikedNotificationBody,
  computeBiteRankChanges,
  MostLikedBite,
  readMostLiked,
} from '../shared/utils/weekly-most-liked';

/** The Most liked board as of the last daily run (issue #2028). */
const MOST_LIKED_DAILY_DOC = 'leaderboardMostLikedDaily';

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
 * Tells a creator one of their Bites moved on the Most liked board. The
 * payload names the board and the Bite: the tap opens the Most liked tab, and
 * the Bite keeps one Bite's move from replacing another's in the drawer.
 */
const notifyBiteOwner = async (change: BiteRankChange): Promise<void> => {
  await sendLocalizedNotification({
    uids: [change.userId],
    data: {
      type: 'LEADERBOARD_RANK_CHANGE',
      userId: `${change.userId}`,
      board: 'mostLiked',
      biteId: change.biteId,
    },
    buildMessage: (translate) => ({
      title: translate('leaderboard.title'),
      body: buildMostLikedNotificationBody(change, translate),
    }),
  });
};

/** The users' weekly board: one notification per user who moved. */
const notifyUserBoard = async (): Promise<number> => {
  const { week, users: currentUsers } = await readWeeklyLeaderboard(db);
  const baselineUsers = await readBaseline(week);

  if (baselineUsers === null) {
    logger.info(
      '--- No baseline for this week yet; seeding today as baseline and skipping notifications',
      { week },
    );
    await storeBaseline(week, currentUsers);
    return 0;
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

  return changes.length;
};

/**
 * The Most liked board: one notification per Bite that moved, to its creator.
 * Its baseline follows the same week rule as the users' board.
 */
const notifyMostLikedBoard = async (): Promise<number> => {
  const { week, bites } = await readMostLiked(db);
  const ref = db.collection(META_COLLECTION).doc(MOST_LIKED_DAILY_DOC);
  const baseline = (await ref.get()).data();
  const store = (): Promise<unknown> =>
    ref.set({ week, bites, computedAt: FieldValue.serverTimestamp() });

  if (baseline?.['week'] !== week || !Array.isArray(baseline['bites'])) {
    await store();
    return 0;
  }

  const changes = computeBiteRankChanges(
    baseline['bites'] as MostLikedBite[],
    bites,
  );

  for (const change of changes) {
    await notifyBiteOwner(change);
  }

  await store();

  return changes.length;
};

/**
 * Scheduled Cloud Function that runs every day at 09:00 Europe/Zurich.
 *
 * It compares the running week's boards against the rankings captured on the
 * previous run and notifies each user whose rank changed since yesterday, and
 * each creator whose Bite moved on the Most liked board (issue #2028). The very
 * first run, and the first run of every week, only seeds the baseline: there
 * is nothing in the same week to compare against, and the reset itself is not
 * news to anyone (issue #2027).
 */
export const sendDailyLeaderboardNotification = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: ZURICH_TZ,
  },
  async (): Promise<void> => {
    logger.info('--- Starting daily leaderboard notification');

    const notifiedUsers = await notifyUserBoard();
    const notifiedBites = await notifyMostLikedBoard();

    logger.info('--- Daily leaderboard notification finished', {
      notifiedUsers,
      notifiedBites,
    });
  },
);
