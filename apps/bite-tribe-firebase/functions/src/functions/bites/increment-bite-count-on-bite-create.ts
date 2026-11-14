import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  onDocumentCreated,
  onDocumentDeleted,
} from 'firebase-functions/firestore';
import { Bite } from '../shared/model/bite';
import { removeBiteCountryIfUnused } from '../shared/utils/bite-countries';
import { rebuildLeaderboard } from '../shared/utils/leaderboard';
import {
  rebuildWeeklyLeaderboard,
  weekOf,
} from '../shared/utils/weekly-leaderboard';
import { removeCountryCodeFromUser } from '../shared/utils/user-country-codes';

const db = getFirestore();

/**
 * Rebuilds the running week's board when the Bite belongs to it (issue
 * #2027). A Bite from an earlier week cannot move this week's ranking, and
 * the frozen last week is never rebuilt. A failure here must not fail the
 * trigger: the all-time count and board are already written, and the weekly
 * board is rebuilt again on the next read of a stale week.
 */
const rebuildWeeklyIfCurrent = async (
  biteId: string,
  createdAtTimestamp: unknown,
): Promise<void> => {
  const week = weekOf(Date.now());

  if (
    typeof createdAtTimestamp !== 'number' ||
    createdAtTimestamp < week.start ||
    createdAtTimestamp >= week.end
  ) {
    return;
  }

  try {
    await rebuildWeeklyLeaderboard(db);
  } catch (error) {
    logger.warn('failed to rebuild the weekly leaderboard', {
      biteId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const incrementBiteCountOnBiteCreate = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;
    const biteId = event.params.biteId;

    if (!snap) {
      logger.warn('incrementBiteCountOnBiteCreate: no bite snapshot found');
      return;
    }

    const bite = snap.data() as Bite;
    const authorUid = bite.userId;

    if (!authorUid) {
      logger.warn(
        `incrementBiteCountOnBiteCreate: bite ${biteId} has no author UID`,
      );
      return;
    }

    await db.doc(`users/${authorUid}`).set(
      {
        biteCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    logger.info(
      `incrementBiteCountOnBiteCreate: incremented biteCount for ${authorUid}`,
    );

    await rebuildLeaderboard(db);
    await rebuildWeeklyIfCurrent(biteId, bite.createdAtTimestamp);
  },
);

export const decrementBiteCountOnBiteDelete = onDocumentDeleted(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;
    const biteId = event.params.biteId;

    if (!snap) {
      logger.warn('decrementBiteCountOnBiteDelete: no bite snapshot found');
      return;
    }

    const bite = snap.data() as Bite;
    const authorUid = bite.userId;

    if (!authorUid) {
      logger.warn(
        `decrementBiteCountOnBiteDelete: bite ${biteId} has no author UID`,
      );
      return;
    }

    const userRef = db.doc(`users/${authorUid}`);

    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) {
        logger.warn(
          `decrementBiteCountOnBiteDelete: user ${authorUid} not found`,
        );
        return;
      }

      const user = userSnap.data() || {};
      const currentBiteCount =
        typeof user['biteCount'] === 'number' ? user['biteCount'] : 0;

      transaction.update(userRef, {
        biteCount: Math.max(currentBiteCount - 1, 0),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    logger.info(
      `decrementBiteCountOnBiteDelete: decremented biteCount for ${authorUid}`,
    );

    await removeCountryCodeFromUser(db, authorUid, bite.countryCode);

    // The About page's globe drops the country with its last Bite (#1893).
    // A failure here must not cost the leaderboard rebuild below.
    try {
      await removeBiteCountryIfUnused(db, bite.countryCode);
    } catch (error) {
      logger.warn(
        'decrementBiteCountOnBiteDelete: failed to update the Bite countries',
        {
          biteId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    await rebuildLeaderboard(db);
    await rebuildWeeklyIfCurrent(biteId, bite.createdAtTimestamp);
  },
);
