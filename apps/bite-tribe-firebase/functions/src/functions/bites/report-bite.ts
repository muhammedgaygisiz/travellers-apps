import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import {
  BITE_REPORTS_COLLECTION,
  BiteReport,
  BiteReportReason,
  biteReportId,
  isBiteReportReason,
} from './bite-report';

const BITES_COLLECTION = 'bites';

/** Firestore's `ALREADY_EXISTS`, as the Admin SDK reports a failed `create`. */
const ALREADY_EXISTS = 6;

interface ReportBiteRequest {
  biteId?: unknown;
  reason?: unknown;
}

export interface ReportBiteResult {
  /**
   * False when this account had already reported the Bite. Not an error: the
   * reporter asked for the Bite to be looked at, and it is in the queue (or was
   * looked at already), which is what they wanted.
   */
  reported: boolean;
}

const parseBiteId = (value: unknown): string => {
  const biteId = typeof value === 'string' ? value.trim() : '';

  if (!biteId || biteId.includes('/')) {
    throw new HttpsError('invalid-argument', 'biteId is required.');
  }

  return biteId;
};

const parseReason = (value: unknown): BiteReportReason => {
  if (!isBiteReportReason(value)) {
    throw new HttpsError('invalid-argument', 'reason is not a known reason.');
  }

  return value;
};

const isAlreadyExists = (error: unknown): boolean =>
  (error as { code?: unknown })?.code === ALREADY_EXISTS ||
  (error as { code?: unknown })?.code === 'already-exists';

/**
 * Reports a Bite to the BiteTribe operators (GitHub issue #1608).
 *
 * A callable rather than a client write, for two reasons. The duplicate check
 * needs a `create` that fails on an existing document, and a client that may
 * not read the collection cannot tell "already reported" from "refused". And
 * the Bite has to exist and belong to somebody else, which a rule can check only
 * by reading the Bite on every evaluation.
 *
 * **The reporter is never disclosed to the author.** Nothing here writes to the
 * Bite, notifies anybody or leaves a trace the author can read: the report is a
 * document only an operator can open. The log line names the Bite and the
 * reason and not the reporter, because Cloud Logging is read for other things
 * too.
 */
export const reportBiteHandler = async (
  request: CallableRequest<ReportBiteRequest>,
): Promise<ReportBiteResult> => {
  requireMember(request, 'You must be signed in to report a Bite.');

  const reporterUid = request.auth.uid;
  const biteId = parseBiteId(request.data?.biteId);
  const reason = parseReason(request.data?.reason);

  const db = getFirestore();
  const bite = await db.collection(BITES_COLLECTION).doc(biteId).get();

  if (!bite.exists) {
    throw new HttpsError('not-found', `No Bite found for ${biteId}.`);
  }

  if (bite.data()?.['userId'] === reporterUid) {
    throw new HttpsError(
      'failed-precondition',
      'You cannot report your own Bite.',
    );
  }

  const now = new Date();
  const report: BiteReport = {
    biteId,
    reporterUid,
    reason,
    status: 'open',
    createdAt: now.toISOString(),
    createdAtTimestamp: now.getTime(),
  };

  try {
    await db
      .collection(BITE_REPORTS_COLLECTION)
      .doc(biteReportId(biteId, reporterUid))
      .create(report);
  } catch (error) {
    if (isAlreadyExists(error)) {
      return { reported: false };
    }

    throw error;
  }

  logger.info('reportBite: Bite reported', { biteId, reason });

  return { reported: true };
};

export const reportBite = onAppCheck<ReportBiteRequest>(reportBiteHandler);
