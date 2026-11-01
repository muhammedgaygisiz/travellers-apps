import { getAuth } from 'firebase-admin/auth';
import {
  DocumentData,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import {
  USER_REPORT_REASONS,
  USER_REPORTS_COLLECTION,
  UserReportReason,
  isUserReportReason,
} from './user-report';

const BITES_COLLECTION = 'bites';
const USERS_COLLECTION = 'users';

/** The most open reports one listing reads, as for the Bite queue. */
export const MAX_OPEN_USER_REPORTS = 500;

/**
 * How many of a reported account's Bites the listing carries.
 *
 * Enough to see a pattern across them, which is what a profile report is often
 * about, and few enough that a long queue stays one read per account.
 */
export const RECENT_BITES_PER_USER = 6;

/** `getUsers` takes at most 100 identifiers per call. */
const AUTH_LOOKUP_LIMIT = 100;

/** The same limit the Bite queue puts on a dismissal reason. */
const MAX_REASON_LENGTH = 500;

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

export interface ReportedUserBite {
  biteId: string;
  name: string;
  /** The download URL, or the pending base64 copy - whichever the Bite holds. */
  imageSrc: string;
}

/**
 * One reported profile, with what an operator needs to judge it.
 *
 * Aggregated per account, as the Bite queue aggregates per Bite. **Who
 * reported it is not returned.**
 */
export interface ReportedUser {
  uid: string;
  /** False when the profile document is gone and its reports remain. */
  exists: boolean;
  displayName: string;
  photoUrl: string;
  about: string;
  /** The account is already blocked from signing in. */
  blocked: boolean;
  recentBites: ReportedUserBite[];
  reportCount: number;
  reasons: Record<UserReportReason, number>;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface ListUserReportsResult {
  users: ReportedUser[];
  /** True when there were more open reports than one listing reads. */
  truncated: boolean;
}

const stringOf = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const emptyReasons = (): Record<UserReportReason, number> =>
  Object.fromEntries(
    USER_REPORT_REASONS.map((reason) => [reason, 0]),
  ) as Record<UserReportReason, number>;

/**
 * The account's newest Bites. Sorted here as well as in the query, so a Bite
 * written before `createdAtTimestamp` existed cannot reorder the rest.
 */
const recentBitesOf = async (
  db: Firestore,
  uid: string,
): Promise<ReportedUserBite[]> => {
  const bites = await db
    .collection(BITES_COLLECTION)
    .where('userId', '==', uid)
    .orderBy('createdAtTimestamp', 'desc')
    .limit(RECENT_BITES_PER_USER)
    .get();

  return bites.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .sort(
      (a, b) =>
        (Number(b.data['createdAtTimestamp']) || 0) -
        (Number(a.data['createdAtTimestamp']) || 0),
    )
    .map(({ id, data }) => ({
      biteId: id,
      name: stringOf(data['name']),
      imageSrc: stringOf(data['imagePath']) || stringOf(data['image']),
    }));
};

/** Which of these accounts are blocked. An unknown account counts as not. */
const blockedAmong = async (uids: string[]): Promise<Set<string>> => {
  const blocked = new Set<string>();

  for (let index = 0; index < uids.length; index += AUTH_LOOKUP_LIMIT) {
    const { users } = await getAuth().getUsers(
      uids.slice(index, index + AUTH_LOOKUP_LIMIT).map((uid) => ({ uid })),
    );

    users
      .filter((user) => user.disabled)
      .forEach((user) => blocked.add(user.uid));
  }

  return blocked;
};

/**
 * Lists every profile with an open report (GitHub issue #1829).
 *
 * A callable for the reason `listBiteReports` is one: the answer is a join of
 * the reports, the profile, its Bites and the account's sign-in state, which is
 * a handful of batched reads here and a read per row in the client.
 *
 * Most-reported first, then oldest first, as in the Bite queue.
 */
export const listUserReportsHandler = async (
  request: CallableRequest<unknown>,
): Promise<ListUserReportsResult> => {
  requireAdmin(request);

  const db = getFirestore();
  const reports = await db
    .collection(USER_REPORTS_COLLECTION)
    .where('status', '==', 'open')
    .limit(MAX_OPEN_USER_REPORTS + 1)
    .get();

  const truncated = reports.size > MAX_OPEN_USER_REPORTS;
  const byUser = new Map<
    string,
    { reasons: Record<UserReportReason, number>; dates: string[] }
  >();

  reports.docs.slice(0, MAX_OPEN_USER_REPORTS).forEach((doc) => {
    const report = doc.data();
    const uid = stringOf(report['reportedUid']);

    if (!uid) {
      return;
    }

    const entry = byUser.get(uid) ?? { reasons: emptyReasons(), dates: [] };
    const reason = report['reason'];

    entry.reasons[isUserReportReason(reason) ? reason : 'other'] += 1;
    entry.dates.push(stringOf(report['createdAt']));
    byUser.set(uid, entry);
  });

  const uids = [...byUser.keys()];

  if (uids.length === 0) {
    return { users: [], truncated };
  }

  const profileSnapshots = await db.getAll(
    ...uids.map((uid) => db.collection(USERS_COLLECTION).doc(uid)),
  );
  const profiles = new Map<string, DocumentData>();

  profileSnapshots.forEach((snapshot) => {
    if (snapshot.exists) {
      profiles.set(snapshot.id, snapshot.data() ?? {});
    }
  });

  const [blocked, recentBites] = await Promise.all([
    blockedAmong(uids),
    Promise.all(uids.map((uid) => recentBitesOf(db, uid))),
  ]);

  const result = uids.map((uid, index): ReportedUser => {
    const { reasons, dates } = byUser.get(uid) ?? {
      reasons: emptyReasons(),
      dates: [],
    };
    const profile = profiles.get(uid);
    const sortedDates = [...dates].sort();

    return {
      uid,
      exists: profile !== undefined,
      displayName: stringOf(profile?.['displayName']),
      photoUrl: stringOf(profile?.['photoUrl']),
      about: stringOf(profile?.['about']),
      blocked: blocked.has(uid),
      recentBites: recentBites[index],
      reportCount: dates.length,
      reasons,
      firstReportedAt: sortedDates[0] ?? '',
      lastReportedAt: sortedDates[sortedDates.length - 1] ?? '',
    };
  });

  result.sort(
    (a, b) =>
      b.reportCount - a.reportCount ||
      a.firstReportedAt.localeCompare(b.firstReportedAt),
  );

  return { users: result, truncated };
};

export const listUserReports = onAppCheck(listUserReportsHandler);

interface DismissUserReportsRequest {
  uid?: unknown;
  reason?: unknown;
}

export interface DismissUserReportsResult {
  uid: string;
  dismissedReports: number;
}

const parseUid = (value: unknown): string => {
  const uid = typeof value === 'string' ? value.trim() : '';

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required.');
  }

  return uid;
};

/** Required: the log entry is the only record of why the reports closed. */
const parseReason = (value: unknown): string => {
  const reason = typeof value === 'string' ? value.trim() : '';

  if (!reason) {
    throw new HttpsError('invalid-argument', 'reason is required.');
  }

  if (reason.length > MAX_REASON_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `reason must be at most ${MAX_REASON_LENGTH} characters.`,
    );
  }

  return reason;
};

/**
 * Closes the open reports on a profile (GitHub issue #1829).
 *
 * The answer once an operator has decided, whichever way: the profile is fine,
 * or the account was blocked through `setUserBlocked` and nothing is left to
 * do. A block on its own leaves the reports open, because unblocking is
 * possible and the queue should not forget a profile until someone says it is
 * done with. The reports are kept as `dismissed`, so the accounts that filed
 * them cannot put the profile straight back in the queue.
 */
export const dismissUserReportsHandler = async (
  request: CallableRequest<DismissUserReportsRequest>,
): Promise<DismissUserReportsResult> => {
  requireAdmin(request);
  const uid = parseUid(request.data?.uid);
  const reason = parseReason(request.data?.reason);

  const db = getFirestore();
  const reports = await db
    .collection(USER_REPORTS_COLLECTION)
    .where('reportedUid', '==', uid)
    .get();
  const open = reports.docs.filter((doc) => doc.data()['status'] === 'open');

  if (open.length === 0) {
    throw new HttpsError(
      'not-found',
      `No open reports found for profile ${uid}.`,
    );
  }

  const now = new Date();

  for (let index = 0; index < open.length; index += WRITE_BATCH_LIMIT) {
    const batch = db.batch();

    open.slice(index, index + WRITE_BATCH_LIMIT).forEach((doc) =>
      batch.update(doc.ref, {
        status: 'dismissed',
        dismissedAt: now.toISOString(),
        dismissedAtTimestamp: now.getTime(),
      }),
    );
    await batch.commit();
  }

  logOperatorAction(request, {
    action: 'dismissUserReports',
    targetType: 'user',
    targetId: uid,
    outcome: 'succeeded',
    reason,
    details: { dismissedReports: open.length },
  });

  return { uid, dismissedReports: open.length };
};

export const dismissUserReports = onAppCheck<DismissUserReportsRequest>(
  dismissUserReportsHandler,
);
