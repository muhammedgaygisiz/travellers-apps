import { ErrorHandler, Injectable, inject } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  DocumentData,
  GetDocumentResult,
} from '@capacitor-firebase/firestore';
import { filter, map, type Observable } from 'rxjs';
import {
  snapshotListener,
  type SnapshotDelivery,
} from '../utils/snapshot-listener';

/** The running week's board, which the backend rewrites on every Bite write. */
export const WEEKLY_LEADERBOARD = 'meta/leaderboardWeekly';

/** One ranked user as the weekly board stores them. */
export interface WeeklyLeaderboardEntry {
  userId: string;
  /** The Bites the user created in this week, not the all-time count. */
  biteCount: number;
}

/** The running week's board, best first, as one snapshot delivers it. */
export interface WeeklyLeaderboardSnapshot {
  /** The week's Monday as `YYYY-MM-DD`; a new key means the board was reset. */
  week: string;
  users: WeeklyLeaderboardEntry[];
}

@Injectable({ providedIn: 'root' })
export class LeaderboardApiService {
  private readonly errorHandler = inject(ErrorHandler);

  /**
   * `/meta/leaderboardWeekly` for as long as someone is subscribed (issue
   * #2015).
   *
   * Every member can read the document, and `rebuildWeeklyLeaderboard`
   * rewrites it seconds after `incrementBiteCountOnBiteCreate` counts a Bite,
   * on a Bite delete, an account deletion and the Monday reset. A listener
   * bills one read for its first snapshot and one per rewrite after it, so an
   * open app pays one read per rewrite. The listener is removed when the
   * subscription ends. A snapshot that is missing or malformed is skipped.
   */
  readonly weeklyLeaderboard$: Observable<WeeklyLeaderboardSnapshot> =
    snapshotListener<GetDocumentResult<DocumentData>>(
      (callback) =>
        FirebaseFirestore.addDocumentSnapshotListener(
          { reference: WEEKLY_LEADERBOARD },
          callback,
        ),
      (error) => this.errorHandler.handleError(error),
    ).pipe(
      map(toWeeklyLeaderboard),
      filter((board): board is WeeklyLeaderboardSnapshot => !!board),
    );
}

const isEntry = (value: unknown): value is WeeklyLeaderboardEntry => {
  const entry = value as Partial<WeeklyLeaderboardEntry> | null;

  return (
    typeof entry?.userId === 'string' &&
    typeof entry.biteCount === 'number' &&
    Number.isFinite(entry.biteCount)
  );
};

const toWeeklyLeaderboard = (
  delivery: SnapshotDelivery<GetDocumentResult<DocumentData>>,
): WeeklyLeaderboardSnapshot | undefined => {
  const data = delivery.event?.snapshot?.data;

  if (!data || typeof data['week'] !== 'string') {
    return undefined;
  }

  const users: unknown[] = Array.isArray(data['users']) ? data['users'] : [];

  return {
    week: data['week'],
    users: users
      .filter(isEntry)
      .map(({ userId, biteCount }) => ({ userId, biteCount })),
  };
};
