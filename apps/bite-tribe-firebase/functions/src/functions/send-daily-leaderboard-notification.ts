import { onSchedule } from 'firebase-functions/scheduler';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getInvalidTokens } from './utils/get-invalid-tokens';
import { cleanupInvalidTokens } from './utils/cleanup-invalid-tokens';
import { getTokens } from './utils/get-tokens';
import { buildChunks } from './utils/build-chunks';
import { CHUNK_SIZE } from './utils/chunk-size';
import {
  buildLeaderboardNotificationBody,
  computeRankChanges,
  LeaderboardRankChange,
  LeaderboardUser,
  LEADERBOARD_DAILY_DOC,
  LEADERBOARD_DOC,
  META_COLLECTION,
} from './utils/leaderboard';

const db = admin.firestore();

const ZURICH_TZ = 'Europe/Zurich';

/**
 * Reads the persisted `users` ranking from a meta document. Returns `null` when
 * the document does not exist yet (used to detect the first daily run, where
 * there is no baseline to compare against), and an empty array when the
 * document exists but holds no ranking.
 */
const readRanking = async (
  docId: string,
): Promise<LeaderboardUser[] | null> => {
  const snap = await db.collection(META_COLLECTION).doc(docId).get();

  if (!snap.exists) {
    return null;
  }

  const users = snap.data()?.['users'];

  return Array.isArray(users) ? (users as LeaderboardUser[]) : [];
};

/**
 * Overwrites the daily baseline with the given ranking so tomorrow's run can
 * diff against today.
 */
const storeBaseline = async (users: LeaderboardUser[]): Promise<void> => {
  await db.collection(META_COLLECTION).doc(LEADERBOARD_DAILY_DOC).set({
    users,
    computedAt: FieldValue.serverTimestamp(),
  });
};

const notifyUser = async (change: LeaderboardRankChange): Promise<void> => {
  const tokens = await getTokens([change.userId]);

  if (tokens.length === 0) {
    logger.warn(
      `--- No valid push tokens for ${change.userId}, skipping leaderboard notification`,
    );
    return;
  }

  const body = buildLeaderboardNotificationBody(change);
  const chunks = buildChunks(tokens, CHUNK_SIZE);

  for (const chunk of chunks) {
    const res = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: {
        title: 'Leaderboard Update',
        body,
      },
      data: {
        type: 'LEADERBOARD_RANK_CHANGE',
        userId: `${change.userId}`,
      },
    });

    const invalidTokens = getInvalidTokens(res, chunk);
    if (invalidTokens.length > 0) {
      await cleanupInvalidTokens(invalidTokens);
    }
  }
};

/**
 * Scheduled Cloud Function that runs every day at 09:00 Europe/Zurich.
 *
 * It compares the live persisted leaderboard against the ranking captured on
 * the previous run and sends each user whose rank changed since yesterday a
 * single push notification. The very first run only seeds the baseline so users
 * are not notified about a ranking they were never told about before.
 */
export const sendDailyLeaderboardNotification = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: ZURICH_TZ,
  },
  async (): Promise<void> => {
    logger.info('--- Starting daily leaderboard notification');

    const currentUsers = (await readRanking(LEADERBOARD_DOC)) ?? [];
    const baselineUsers = await readRanking(LEADERBOARD_DAILY_DOC);

    if (baselineUsers === null) {
      logger.info(
        '--- No baseline yet; seeding today as baseline and skipping notifications',
      );
      await storeBaseline(currentUsers);
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
    await storeBaseline(currentUsers);

    logger.info('--- Daily leaderboard notification finished', {
      notifiedUsers: changes.length,
    });
  },
);
