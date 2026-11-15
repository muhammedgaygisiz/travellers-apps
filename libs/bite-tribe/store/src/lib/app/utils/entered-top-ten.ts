import { Preferences } from '@capacitor/preferences';
import type { WeeklyLeaderboardSnapshot } from 'bite-tribe/api';

/** The places the weekly board lists; `LEADERBOARD_LIMIT` in the backend. */
export const LEADERBOARD_TOP_TEN = 10;

/** Device storage of the last week a top-ten entry was celebrated, per account. */
export const CELEBRATED_TOP_TEN_KEY_PREFIX = 'leaderboard-top-ten-celebrated:';

/**
 * The most Bites `userId` can have had this week while `previous` did not
 * list them: the count of the last place on a full board, and none at all on
 * a board with places left, because every public user with a Bite this week
 * is listed there. A board from another week says nothing about this one, so
 * the new week starts from none.
 */
const highestUnlistedCount = (
  previous: WeeklyLeaderboardSnapshot,
  current: WeeklyLeaderboardSnapshot,
): number => {
  if (previous.week !== current.week) {
    return 0;
  }

  return previous.users.length >= LEADERBOARD_TOP_TEN
    ? (previous.users[LEADERBOARD_TOP_TEN - 1]?.biteCount ?? 0)
    : 0;
};

/**
 * The rank `userId` just entered the weekly top ten at, if a Bite of theirs
 * took them there (issue #2015).
 *
 * The user has entered when `previous` does not list them - or is a board of
 * an earlier week - and `current` does. That alone would also celebrate a
 * place freed by somebody else, who deleted Bites, deleted their account or
 * went private, so the user's own weekly count must also have risen: it has to
 * be above the most they can have had while unlisted (see
 * {@link highestUnlistedCount}). A user who stays listed, or drops out,
 * answers nothing. A private profile is never listed, so it never enters.
 */
export const enteredTopTen = (
  previous: WeeklyLeaderboardSnapshot,
  current: WeeklyLeaderboardSnapshot,
  userId: string,
): number | undefined => {
  const index = current.users.findIndex((user) => user.userId === userId);

  if (index < 0 || index >= LEADERBOARD_TOP_TEN) {
    return undefined;
  }

  const wasListed =
    previous.week === current.week &&
    previous.users.some((user) => user.userId === userId);

  if (wasListed) {
    return undefined;
  }

  return current.users[index].biteCount >
    highestUnlistedCount(previous, current)
    ? index + 1
    : undefined;
};

/**
 * Whether entering the top ten in `week` may still be celebrated for
 * `userId` on this device, claiming the week when it may. Entering is
 * celebrated at most once per week (issue #2015), so dropping out and coming
 * back in the same week, or a restart in between, does not replay it.
 */
export const claimTopTenWeek = async (
  userId: string,
  week: string,
): Promise<boolean> => {
  const key = `${CELEBRATED_TOP_TEN_KEY_PREFIX}${userId}`;

  try {
    const { value } = await Preferences.get({ key });

    if (value === week) {
      return false;
    }

    await Preferences.set({ key, value: week });
  } catch {
    // Storage that cannot be read or written does not cost the user the
    // moment; at worst it plays again later in the week.
  }

  return true;
};
