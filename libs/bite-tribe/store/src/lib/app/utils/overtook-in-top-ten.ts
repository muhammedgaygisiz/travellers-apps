import type { WeeklyLeaderboardSnapshot } from 'bite-tribe/api';
import { LEADERBOARD_TOP_TEN } from './entered-top-ten';

/** The rank the user climbed to and the display name of the user they passed. */
export interface LeaderboardOvertake {
  rank: number;
  user: string;
}

/**
 * The place `userId` just climbed to inside the weekly top ten by passing
 * somebody, and who that was, if a Bite of theirs did it (issue #2016).
 *
 * Both snapshots must be of the same week and list the user, their rank must
 * have improved and their own weekly count must have risen, so a climb that
 * somebody else's lost Bites made celebrates nothing. The user named is the
 * one directly below them now; they must have been above the user in
 * `previous` and now have strictly fewer Bites, so a tie celebrates nothing.
 * Entering the top ten is {@link enteredTopTen}'s moment, never this one,
 * because this one needs the user listed before.
 */
export const overtookInTopTen = (
  previous: WeeklyLeaderboardSnapshot,
  current: WeeklyLeaderboardSnapshot,
  userId: string,
): LeaderboardOvertake | undefined => {
  if (previous.week !== current.week) {
    return undefined;
  }

  const rankIn = (board: WeeklyLeaderboardSnapshot, id: string): number =>
    board.users
      .slice(0, LEADERBOARD_TOP_TEN)
      .findIndex((user) => user.userId === id);

  const was = rankIn(previous, userId);
  const now = rankIn(current, userId);

  if (was < 0 || now < 0 || now >= was) {
    return undefined;
  }

  const me = current.users[now];

  if (me.biteCount <= previous.users[was].biteCount) {
    return undefined;
  }

  const passed = current.users[now + 1];

  if (!passed || !passed.displayName || passed.biteCount >= me.biteCount) {
    return undefined;
  }

  const passedWas = rankIn(previous, passed.userId);

  if (passedWas < 0 || passedWas >= was) {
    return undefined;
  }

  return { rank: now + 1, user: passed.displayName };
};
