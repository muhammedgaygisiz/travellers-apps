import { onSchedule } from 'firebase-functions/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import {
  freezeLastWeek,
  rebuildWeeklyLeaderboard,
} from '../shared/utils/weekly-leaderboard';
import {
  freezeMostLikedLastWeek,
  rebuildMostLiked,
} from '../shared/utils/weekly-most-liked';
import {
  awardWeeklyBadges,
  bestBadge,
  buildWeeklyAwardBody,
  WeeklyBadge,
} from '../shared/utils/weekly-awards';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

const db = getFirestore();

/**
 * One push per winner, naming their better place (issue #2031). The tap opens
 * the frozen standings the place was won in.
 */
const notifyWinner = async (
  userId: string,
  badges: WeeklyBadge[],
): Promise<void> => {
  const badge = bestBadge(badges);

  await sendLocalizedNotification({
    uids: [userId],
    data: {
      type: 'WEEKLY_AWARD',
      userId,
      board: badge.board === 'thisWeek' ? 'lastWeek' : 'mostLikedLastWeek',
    },
    buildMessage: (translate) => ({
      title: translate('weeklyAward.title'),
      body: buildWeeklyAwardBody(badge, translate),
    }),
  });
};

/**
 * The weekly reset, every Monday at 00:00 UTC (issue #2027).
 *
 * It freezes the week that just ended into `meta/leaderboardLastWeek`, the
 * final standings the app's `Last week` switch shows, and starts the new week
 * with an empty board. The Most liked board (issue #2028) is frozen and
 * restarted the same way. Both steps are safe to repeat: a week already frozen is
 * left as it is, and the running week is rebuilt from its Bites.
 *
 * Then the top 3 of both frozen lists get their badge, the previous week's
 * holders lose theirs, and every winner gets one push (issue #2031). An
 * already awarded week awards and pushes nothing, so a retried run is safe.
 */
export const resetWeeklyLeaderboard = onSchedule(
  {
    schedule: '0 0 * * 1',
    timeZone: 'UTC',
  },
  async (): Promise<void> => {
    const lastWeek = await freezeLastWeek(db);
    const thisWeek = await rebuildWeeklyLeaderboard(db);
    const mostLikedLastWeek = await freezeMostLikedLastWeek(db);
    await rebuildMostLiked(db);

    const winners = await awardWeeklyBadges(
      db,
      lastWeek.week,
      lastWeek.users,
      mostLikedLastWeek.bites,
    );

    for (const [userId, badges] of winners) {
      try {
        await notifyWinner(userId, badges);
      } catch (error) {
        // One failed push must not cost the other winners theirs.
        logger.warn('resetWeeklyLeaderboard: award push failed', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('resetWeeklyLeaderboard: week reset', {
      frozenWeek: lastWeek.week,
      frozenUsers: lastWeek.users.length,
      newWeek: thisWeek.week,
      frozenMostLikedBites: mostLikedLastWeek.bites.length,
      winners: winners.size,
    });
  },
);
