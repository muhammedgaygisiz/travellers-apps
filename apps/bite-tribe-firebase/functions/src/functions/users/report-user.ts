import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import {
  USER_REPORTS_COLLECTION,
  UserReport,
  UserReportReason,
  isUserReportReason,
  userReportId,
} from './user-report';

const USERS_COLLECTION = 'users';

/** Firestore's `ALREADY_EXISTS`, as the Admin SDK reports a failed `create`. */
const ALREADY_EXISTS = 6;

interface ReportUserRequest {
  uid?: unknown;
  reason?: unknown;
}

export interface ReportUserResult {
  /** False when this account had already reported the profile. */
  reported: boolean;
}

const parseUid = (value: unknown): string => {
  const uid = typeof value === 'string' ? value.trim() : '';

  if (!uid || uid.includes('/')) {
    throw new HttpsError('invalid-argument', 'uid is required.');
  }

  return uid;
};

const parseReason = (value: unknown): UserReportReason => {
  if (!isUserReportReason(value)) {
    throw new HttpsError('invalid-argument', 'reason is not a known reason.');
  }

  return value;
};

const isAlreadyExists = (error: unknown): boolean =>
  (error as { code?: unknown })?.code === ALREADY_EXISTS ||
  (error as { code?: unknown })?.code === 'already-exists';

/**
 * Reports a profile to the BiteTribe operators (GitHub issue #1829).
 *
 * The profile counterpart of `reportBite`, and a callable for the same
 * reasons: the duplicate check is a `create` that fails on an existing
 * document, and the reported account has to exist and be somebody else's.
 *
 * **The reporter is never disclosed to the reported account.** Nothing here
 * writes to the profile, notifies anybody or leaves a trace the reported
 * account can read. The log line names the reported account and the reason and
 * not the reporter.
 */
export const reportUserHandler = async (
  request: CallableRequest<ReportUserRequest>,
): Promise<ReportUserResult> => {
  requireMember(request, 'You must be signed in to report a profile.');

  const reporterUid = request.auth.uid;
  const reportedUid = parseUid(request.data?.uid);
  const reason = parseReason(request.data?.reason);

  if (reportedUid === reporterUid) {
    throw new HttpsError(
      'failed-precondition',
      'You cannot report your own profile.',
    );
  }

  const db = getFirestore();
  const profile = await db.collection(USERS_COLLECTION).doc(reportedUid).get();

  if (!profile.exists) {
    throw new HttpsError('not-found', `No profile found for ${reportedUid}.`);
  }

  const now = new Date();
  const report: UserReport = {
    reportedUid,
    reporterUid,
    reason,
    status: 'open',
    createdAt: now.toISOString(),
    createdAtTimestamp: now.getTime(),
  };

  try {
    await db
      .collection(USER_REPORTS_COLLECTION)
      .doc(userReportId(reportedUid, reporterUid))
      .create(report);
  } catch (error) {
    if (isAlreadyExists(error)) {
      return { reported: false };
    }

    throw error;
  }

  logger.info('reportUser: profile reported', { reportedUid, reason });

  return { reported: true };
};

export const reportUser = onAppCheck<ReportUserRequest>(reportUserHandler);
