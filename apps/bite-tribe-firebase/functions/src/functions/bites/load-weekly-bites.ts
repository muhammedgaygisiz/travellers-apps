import {
  DocumentData,
  QueryDocumentSnapshot,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { getPreviousWeekBounds } from '../shared/utils/week-bounds';

const BITE_COLLECTION = 'bites';
const MAX_RESULTS = 200;

interface LoadWeeklyBitesRequest {
  weekStart?: unknown;
  weekEnd?: unknown;
}

interface WeeklyBite extends DocumentData {
  id: string;
  likes: unknown[];
}

export interface WeeklyBitesResponse {
  weekStart: number;
  weekEnd: number;
  bites: WeeklyBite[];
}

const toWeeklyBite = (doc: QueryDocumentSnapshot): WeeklyBite => ({
  ...doc.data(),
  id: doc.id,
  likes: [],
});

const toTimestamp = (value: unknown): number | undefined => {
  const parsed = typeof value === 'string' ? Number(value) : value;

  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
};

/**
 * Resolves the week the caller asked for.
 *
 * The weekly summary notification carries the exact bounds it counted, so a tap
 * shows that week no matter when it happens. A request without a usable range —
 * the page opened from somewhere else, or a malformed deep link — falls back to
 * the previous calendar week, which is the week the most recent notification
 * talked about.
 */
export const resolveWeekBounds = (
  request: LoadWeeklyBitesRequest,
  now: Date = new Date(),
): { start: number; end: number } => {
  const start = toTimestamp(request.weekStart);
  const end = toTimestamp(request.weekEnd);

  if (start === undefined || end === undefined || start > end) {
    return getPreviousWeekBounds(now);
  }

  return { start, end };
};

/**
 * Callable that returns the bites created within one calendar week, newest
 * first. It backs the weekly bites page the summary notification opens.
 */
export const loadWeeklyBites = onAppCheck<LoadWeeklyBitesRequest>(
  async (request) => {
    if (!request.auth) {
      logger.warn('loadWeeklyBites: unauthenticated request rejected');

      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to load the weekly bites.',
      );
    }

    const { start, end } = resolveWeekBounds(request.data ?? {});

    const snapshot = await getFirestore()
      .collection(BITE_COLLECTION)
      .where('createdAtTimestamp', '>=', start)
      .where('createdAtTimestamp', '<=', end)
      .orderBy('createdAtTimestamp', 'desc')
      .limit(MAX_RESULTS)
      .get();

    logger.info('loadWeeklyBites: query finished', {
      uid: request.auth.uid,
      weekStart: start,
      weekEnd: end,
      returnedBites: snapshot.size,
    });

    return {
      weekStart: start,
      weekEnd: end,
      bites: snapshot.docs.map(toWeeklyBite),
    } satisfies WeeklyBitesResponse;
  },
);
