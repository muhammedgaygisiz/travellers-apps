import {
  DocumentReference,
  FieldValue,
  Firestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { Translate } from '../i18n/translate';
import {
  LeaderboardUser,
  META_COLLECTION,
  USERS_COLLECTION,
} from './leaderboard';
import { MostLikedBite } from './weekly-most-liked';

/** How many places of each weekly list earn a badge (issue #2031). */
export const AWARD_PLACES = 3;

/**
 * The record of the last awarded week: which week, and who holds a badge for
 * it. The next reset takes the badges back from exactly these users.
 */
export const WEEKLY_AWARDS_DOC = 'weeklyAwards';

/** The two weekly lists that award badges; All time has no week to win. */
export type AwardBoard = 'thisWeek' | 'mostLiked';

/**
 * A badge on a user's profile, held for the week after it was won: a place
 * from 1 to 3 on one weekly list, and the week it was won in.
 */
export interface WeeklyBadge {
  board: AwardBoard;
  place: number;
  week: string;
}

/**
 * Works out every winner's badges from the two frozen boards of one week.
 *
 * - **This week** gives its top 3 users a badge each.
 * - **Most liked** gives the creators of its top 3 Bites a badge, one per
 *   creator for their best place, however many of the three are theirs.
 *
 * A user can hold one badge per list. The This week badge comes first.
 */
export const computeWeeklyBadges = (
  week: string,
  users: LeaderboardUser[],
  bites: MostLikedBite[],
): Map<string, WeeklyBadge[]> => {
  const badges = new Map<string, WeeklyBadge[]>();
  const give = (userId: string, badge: WeeklyBadge): void => {
    if (!userId) {
      return;
    }

    const held = badges.get(userId) ?? [];

    if (!held.some((b) => b.board === badge.board)) {
      badges.set(userId, [...held, badge]);
    }
  };

  users
    .slice(0, AWARD_PLACES)
    .forEach((user, index) =>
      give(user.userId, { board: 'thisWeek', place: index + 1, week }),
    );
  bites
    .slice(0, AWARD_PLACES)
    .forEach((bite, index) =>
      give(bite.userId, { board: 'mostLiked', place: index + 1, week }),
    );

  return badges;
};

/**
 * The badge a winner's push and celebration name: the better place, and on a
 * tie the This week one.
 */
export const bestBadge = (badges: WeeklyBadge[]): WeeklyBadge =>
  [...badges].sort(
    (a, b) =>
      a.place - b.place ||
      Number(a.board === 'mostLiked') - Number(b.board === 'mostLiked'),
  )[0];

/** The push body for a winner's best badge, in their language. */
export const buildWeeklyAwardBody = (
  badge: WeeklyBadge,
  translate: Translate,
): string =>
  translate(
    badge.board === 'thisWeek'
      ? 'weeklyAward.bodyMostBites'
      : 'weeklyAward.bodyMostLiked',
    { place: badge.place },
  );

/**
 * Moves the badges to the week's winners: last week's holders lose theirs and
 * this week's winners get theirs, on their user documents, where the profile
 * reads them. A week already awarded is left alone and returns nothing, so a
 * retried reset neither rewrites the badges nor pushes twice.
 *
 * Returns the badges handed out, by user id.
 */
export const awardWeeklyBadges = async (
  db: Firestore,
  week: string,
  users: LeaderboardUser[],
  bites: MostLikedBite[],
): Promise<Map<string, WeeklyBadge[]>> => {
  const recordRef = db.collection(META_COLLECTION).doc(WEEKLY_AWARDS_DOC);
  const record = (await recordRef.get()).data();

  if (record?.['week'] === week) {
    logger.info('awardWeeklyBadges: week already awarded', { week });

    return new Map();
  }

  const badges = computeWeeklyBadges(week, users, bites);
  const previousHolders: string[] = Array.isArray(record?.['userIds'])
    ? (record['userIds'] as string[])
    : [];
  const batch = db.batch();
  const userDoc = (uid: string): DocumentReference =>
    db.collection(USERS_COLLECTION).doc(uid);
  const losers = previousHolders.filter((uid) => !badges.has(uid));
  const winners = [...badges.keys()];
  const docs = [...losers, ...winners].length
    ? await db.getAll(...[...losers, ...winners].map(userDoc))
    : [];

  // Only documents that still exist are written: an account deleted since
  // must not come back as an empty user document.
  docs.slice(0, losers.length).forEach((doc) => {
    if (doc.exists) {
      batch.update(doc.ref, { weeklyBadges: FieldValue.delete() });
    }
  });

  const awarded = new Map<string, WeeklyBadge[]>();

  docs.slice(losers.length).forEach((doc, index) => {
    const uid = winners[index];

    if (doc.exists) {
      batch.update(doc.ref, { weeklyBadges: badges.get(uid) });
      awarded.set(uid, badges.get(uid) ?? []);
    }
  });

  batch.set(recordRef, {
    week,
    userIds: [...awarded.keys()],
    awardedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  logger.info('awardWeeklyBadges: badges moved', {
    week,
    winners: awarded.size,
    previousHolders: previousHolders.length,
  });

  return awarded;
};
