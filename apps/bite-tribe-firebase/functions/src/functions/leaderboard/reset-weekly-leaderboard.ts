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

const db = getFirestore();

/**
 * The weekly reset, every Monday at 00:00 UTC (issue #2027).
 *
 * It freezes the week that just ended into `meta/leaderboardLastWeek`, the
 * final standings the app's `Last week` switch shows, and starts the new week
 * with an empty board. The Most liked board (issue #2028) is frozen and
 * restarted the same way. Both steps are safe to repeat: a week already frozen is
 * left as it is, and the running week is rebuilt from its Bites.
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

    logger.info('resetWeeklyLeaderboard: week reset', {
      frozenWeek: lastWeek.week,
      frozenUsers: lastWeek.users.length,
      newWeek: thisWeek.week,
      frozenMostLikedBites: mostLikedLastWeek.bites.length,
    });
  },
);
