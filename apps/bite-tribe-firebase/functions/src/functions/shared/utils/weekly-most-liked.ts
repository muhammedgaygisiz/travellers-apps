import {
  FieldValue,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { Translate } from '../i18n/translate';
import {
  computeRankChanges,
  LEADERBOARD_LIMIT,
  LeaderboardRankChange,
  LeaderboardUser,
  META_COLLECTION,
  USERS_COLLECTION,
} from './leaderboard';
import {
  LeaderboardWeek,
  previousWeekOf,
  weekKey,
  weekOf,
} from './weekly-leaderboard';

const BITES_COLLECTION = 'bites';

/**
 * One document per Bite and week, `{week}_{biteId}`, counting the likes the
 * backend saw arrive in that week (issue #2028). Server-only: no client reads
 * or writes it.
 */
export const WEEKLY_BITE_LIKES_COLLECTION = 'weeklyBiteLikes';

/**
 * One document per like, `{biteId}_{likerUid}`, naming the week the like was
 * counted in. Removing the like takes it off that week only if that week is
 * still running; a frozen week is never touched. Server-only.
 */
export const LIKE_WEEKS_COLLECTION = 'likeWeeks';

/** The running week's most-liked Bites, rebuilt on every counted like. */
export const LEADERBOARD_MOST_LIKED_DOC = 'leaderboardMostLiked';

/** Last week's most-liked Bites, frozen at the Monday reset. */
export const LEADERBOARD_MOST_LIKED_LAST_WEEK_DOC =
  'leaderboardMostLikedLastWeek';

/** How many candidate Bites are read per page while filling the board. */
const SCAN_PAGE_SIZE = 30;

/** One Bite on the Most liked board, with what the row shows. */
export interface MostLikedBite {
  biteId: string;
  name: string;
  /** The photo address, `imagePath` or the legacy `image`. */
  imageUrl: string;
  userId: string;
  displayName: string;
  likeCount: number;
}

/** A Most liked board as stored in `/meta` and returned to the app. */
export interface MostLikedBoard {
  week: string;
  start: number;
  end: number;
  bites: MostLikedBite[];
}

const weeklyLikesId = (week: string, biteId: string): string =>
  `${week}_${biteId}`;

const likeWeekId = (biteId: string, likerUid: string): string =>
  `${biteId}_${likerUid}`;

/**
 * Counts a new like for the week the backend sees it in - not the `createdAt`
 * the client wrote, which a client could set to anything. Safe to repeat: a
 * retried trigger finds the like already counted for this week.
 */
export const recordLike = async (
  db: Firestore,
  biteId: string,
  likerUid: string,
  now: number = Date.now(),
): Promise<boolean> => {
  const week = weekKey(weekOf(now));
  const markRef = db
    .collection(LIKE_WEEKS_COLLECTION)
    .doc(likeWeekId(biteId, likerUid));
  const countRef = db
    .collection(WEEKLY_BITE_LIKES_COLLECTION)
    .doc(weeklyLikesId(week, biteId));

  return db.runTransaction(async (transaction) => {
    const mark = await transaction.get(markRef);

    if (mark.exists && mark.data()?.['week'] === week) {
      return false;
    }

    transaction.set(markRef, { week, biteId });
    transaction.set(
      countRef,
      { week, biteId, likes: FieldValue.increment(1) },
      { merge: true },
    );

    return true;
  });
};

/**
 * Takes a removed like off the week it was counted in, if that week is still
 * running. Returns whether the running week's count changed.
 */
export const removeLike = async (
  db: Firestore,
  biteId: string,
  likerUid: string,
  now: number = Date.now(),
): Promise<boolean> => {
  const week = weekKey(weekOf(now));
  const markRef = db
    .collection(LIKE_WEEKS_COLLECTION)
    .doc(likeWeekId(biteId, likerUid));
  const countRef = db
    .collection(WEEKLY_BITE_LIKES_COLLECTION)
    .doc(weeklyLikesId(week, biteId));

  return db.runTransaction(async (transaction) => {
    // A transaction reads everything before it writes anything.
    const mark = await transaction.get(markRef);
    const count = await transaction.get(countRef);
    const countedWeek = mark.data()?.['week'];

    if (!mark.exists) {
      return false;
    }

    transaction.delete(markRef);

    if (countedWeek !== week) {
      return false;
    }

    const likes = count.data()?.['likes'];

    transaction.set(
      countRef,
      {
        week,
        biteId,
        likes: Math.max((typeof likes === 'number' ? likes : 1) - 1, 0),
      },
      { merge: true },
    );

    return true;
  });
};

/**
 * A Bite other people may see: not one whose photo is still uploading or
 * failed (issue #1717), the same rule every other listing follows.
 */
const isListable = (bite: Record<string, unknown>): boolean =>
  bite['imageStatus'] !== 'pending' && bite['imageStatus'] !== 'failed';

/**
 * Builds the top {@link LEADERBOARD_LIMIT} Bites of one week by the likes they
 * received in it. One user may hold several places. A deleted Bite, one that
 * is not listable, and one whose author is private or gone are skipped.
 */
export const collectMostLiked = async (
  db: Firestore,
  week: LeaderboardWeek,
): Promise<MostLikedBite[]> => {
  const key = weekKey(week);
  const ranking: MostLikedBite[] = [];
  let cursor: QueryDocumentSnapshot | undefined;

  while (ranking.length < LEADERBOARD_LIMIT) {
    let query = db
      .collection(WEEKLY_BITE_LIKES_COLLECTION)
      .where('week', '==', key)
      .where('likes', '>', 0)
      .orderBy('likes', 'desc')
      .limit(SCAN_PAGE_SIZE);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const counts = await query.get();

    if (counts.empty) {
      break;
    }

    const biteIds = counts.docs.map((doc) => doc.data()['biteId'] as string);
    const bites = await db.getAll(
      ...biteIds.map((id) => db.collection(BITES_COLLECTION).doc(id)),
    );
    const authorIds = [
      ...new Set(
        bites
          .map((bite) => bite.data()?.['userId'])
          .filter((id): id is string => typeof id === 'string' && !!id),
      ),
    ];
    const authors = new Map(
      (authorIds.length
        ? await db.getAll(
            ...authorIds.map((id) => db.collection(USERS_COLLECTION).doc(id)),
          )
        : []
      ).map((doc) => [doc.id, doc.data()]),
    );

    counts.docs.forEach((count, index) => {
      const bite = bites[index].data();
      const author = bite ? authors.get(bite['userId'] as string) : undefined;

      if (
        ranking.length >= LEADERBOARD_LIMIT ||
        !bite ||
        !isListable(bite) ||
        author?.['public'] !== true
      ) {
        return;
      }

      ranking.push({
        biteId: bites[index].id,
        name: typeof bite['name'] === 'string' ? bite['name'] : '',
        imageUrl:
          (typeof bite['imagePath'] === 'string' && bite['imagePath']) ||
          (typeof bite['image'] === 'string' ? bite['image'] : ''),
        userId: bite['userId'] as string,
        displayName:
          typeof author['displayName'] === 'string'
            ? author['displayName']
            : '',
        likeCount: count.data()['likes'] as number,
      });
    });

    if (counts.size < SCAN_PAGE_SIZE) {
      break;
    }

    cursor = counts.docs[counts.docs.length - 1];
  }

  return ranking;
};

const toBoard = (
  week: LeaderboardWeek,
  bites: MostLikedBite[],
): MostLikedBoard => ({
  week: weekKey(week),
  start: week.start,
  end: week.end,
  bites,
});

/** Recomputes the running week's board into `meta/leaderboardMostLiked`. */
export const rebuildMostLiked = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<MostLikedBoard> => {
  const week = weekOf(now);
  const board = toBoard(week, await collectMostLiked(db, week));

  await db
    .collection(META_COLLECTION)
    .doc(LEADERBOARD_MOST_LIKED_DOC)
    .set({ ...board, updatedAt: FieldValue.serverTimestamp() });

  logger.info('rebuildMostLiked: most-liked board persisted', {
    week: board.week,
    returnedBites: board.bites.length,
  });

  return board;
};

const readBoard = async (
  db: Firestore,
  docId: string,
): Promise<MostLikedBoard | null> => {
  const data = (await db.collection(META_COLLECTION).doc(docId).get()).data();

  if (
    !data ||
    typeof data['week'] !== 'string' ||
    !Array.isArray(data['bites'])
  ) {
    return null;
  }

  return {
    week: data['week'],
    start: data['start'] as number,
    end: data['end'] as number,
    bites: data['bites'] as MostLikedBite[],
  };
};

/**
 * The running week's board; a stored board from an earlier week is rebuilt,
 * which reads empty right after the reset.
 */
export const readMostLiked = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<MostLikedBoard> => {
  const stored = await readBoard(db, LEADERBOARD_MOST_LIKED_DOC);

  if (stored && stored.week === weekKey(weekOf(now))) {
    return stored;
  }

  return rebuildMostLiked(db, now);
};

/**
 * Freezes last week's most-liked Bites. A no-op once that week is frozen, so
 * the standings people saw are never rewritten.
 */
export const freezeMostLikedLastWeek = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<MostLikedBoard> => {
  const week = previousWeekOf(now);
  const stored = await readBoard(db, LEADERBOARD_MOST_LIKED_LAST_WEEK_DOC);

  if (stored && stored.week === weekKey(week)) {
    return stored;
  }

  const board = toBoard(week, await collectMostLiked(db, week));

  await db
    .collection(META_COLLECTION)
    .doc(LEADERBOARD_MOST_LIKED_LAST_WEEK_DOC)
    .set({ ...board, frozenAt: FieldValue.serverTimestamp() });

  logger.info('freezeMostLikedLastWeek: last week frozen', {
    week: board.week,
    returnedBites: board.bites.length,
  });

  return board;
};

/**
 * Rewrites the creator's name on every entry of one stored board. Entries
 * carry a copy of it, and the board is readable by every member.
 */
export const renameInMostLiked = async (
  db: Firestore,
  docId: string,
  uid: string,
  displayName: string,
): Promise<boolean> => {
  const board = await readBoard(db, docId);

  if (
    !board?.bites.some(
      (bite) => bite.userId === uid && bite.displayName !== displayName,
    )
  ) {
    return false;
  }

  await db
    .collection(META_COLLECTION)
    .doc(docId)
    .set(
      {
        bites: board.bites.map((bite) =>
          bite.userId === uid ? { ...bite, displayName } : bite,
        ),
      },
      { merge: true },
    );

  return true;
};

/** Drops a deleted account's Bites from one stored board, in place. */
export const pruneMostLiked = async (
  db: Firestore,
  docId: string,
  uid: string,
): Promise<void> => {
  const board = await readBoard(db, docId);
  const remaining = board?.bites.filter((bite) => bite.userId !== uid);

  if (board && remaining && remaining.length !== board.bites.length) {
    await db
      .collection(META_COLLECTION)
      .doc(docId)
      .set({ bites: remaining }, { merge: true });
  }
};

/** How one Bite moved between two stored Most liked boards. */
export interface BiteRankChange extends Omit<LeaderboardRankChange, 'userId'> {
  biteId: string;
  /** The Bite's creator, who is notified. */
  userId: string;
  /** The dish name the message names. */
  name: string;
}

/**
 * Compares two Most liked boards Bite by Bite, so a creator with several
 * Bites on the board hears about each one (issue #2028). The rank logic is the
 * user board's, keyed by Bite instead of by user.
 */
export const computeBiteRankChanges = (
  previous: MostLikedBite[],
  current: MostLikedBite[],
): BiteRankChange[] => {
  const asRanking = (bites: MostLikedBite[]): LeaderboardUser[] =>
    bites.map((bite) => ({
      userId: bite.biteId,
      displayName: '',
      photoUrl: '',
      biteCount: bite.likeCount,
    }));
  const byId = new Map(
    [...previous, ...current].map((bite) => [bite.biteId, bite]),
  );

  return computeRankChanges(asRanking(previous), asRanking(current)).flatMap(
    (change) => {
      const bite = byId.get(change.userId);

      return bite
        ? [
            {
              ...change,
              biteId: bite.biteId,
              userId: bite.userId,
              name: bite.name,
            },
          ]
        : [];
    },
  );
};

/** The push body for one Bite's move, in the recipient's language. */
export const buildMostLikedNotificationBody = (
  change: BiteRankChange,
  translate: Translate,
): string => {
  const params = { dish: change.name, limit: LEADERBOARD_LIMIT };

  if (change.currentRank === null) {
    return translate('leaderboard.mostLikedDroppedOut', params);
  }

  if (change.previousRank === null) {
    return translate('leaderboard.mostLikedEnteredTop', {
      ...params,
      rank: change.currentRank,
    });
  }

  return translate(
    change.direction === 'up'
      ? 'leaderboard.mostLikedClimbed'
      : 'leaderboard.mostLikedDropped',
    { ...params, rank: change.currentRank },
  );
};
