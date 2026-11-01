import { DocumentReference, Firestore } from 'firebase-admin/firestore';

/**
 * Where a report on a profile lives (GitHub issue #1829).
 *
 * ```text
 * /userReports/{reportedUid}_{reporterUid}
 * ```
 *
 * The profile counterpart of `/biteReports`, and built the same way: one
 * document per account per reported account, named by the pair, so a second
 * report from the same account is a `create` on a document that already exists
 * and Firestore refuses it atomically.
 *
 * Written only by `reportUser` and read only by the operator callables, both
 * through the Admin SDK. `firestore.rules` lets an operator read the collection
 * and nobody write it.
 */
export const USER_REPORTS_COLLECTION = 'userReports';

/**
 * Why a profile was reported.
 *
 * The Bite report's list where it fits. `notFood` says nothing about a person
 * and is left out; `impersonation` is the reason only a profile can have.
 * Harassment leads, because it is what this report exists for: abuse that sits
 * in a display name, a photo or a pattern rather than in any one Bite.
 *
 * Repeated in `libs/bite-tribe-common/model/src/lib/user-report.ts`, because the
 * Functions project cannot reach a library (see `shared/roles.ts`). The two
 * lists have to be changed together.
 */
export const USER_REPORT_REASONS = [
  'harassment',
  'impersonation',
  'spam',
  'inappropriate',
  'other',
] as const;

export type UserReportReason = (typeof USER_REPORT_REASONS)[number];

/**
 * `open` until an operator acts on it. Dismissed reports are kept, as on a
 * Bite, so the account that filed one cannot file it again.
 */
export type UserReportStatus = 'open' | 'dismissed';

export interface UserReport {
  reportedUid: string;
  reporterUid: string;
  reason: UserReportReason;
  status: UserReportStatus;
  createdAt: string;
  createdAtTimestamp: number;
  dismissedAt?: string;
  dismissedAtTimestamp?: number;
}

export const isUserReportReason = (value: unknown): value is UserReportReason =>
  typeof value === 'string' &&
  (USER_REPORT_REASONS as readonly string[]).includes(value);

export const userReportId = (
  reportedUid: string,
  reporterUid: string,
): string => `${reportedUid}_${reporterUid}`;

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

const deleteRefs = async (
  db: Firestore,
  refs: DocumentReference[],
): Promise<number> => {
  for (let index = 0; index < refs.length; index += WRITE_BATCH_LIMIT) {
    const batch = db.batch();
    refs
      .slice(index, index + WRITE_BATCH_LIMIT)
      .forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return refs.length;
};

const deleteWhere = async (
  db: Firestore,
  field: keyof UserReport,
  uid: string,
): Promise<number> => {
  const reports = await db
    .collection(USER_REPORTS_COLLECTION)
    .where(field, '==', uid)
    .get();

  return deleteRefs(
    db,
    reports.docs.map((report) => report.ref),
  );
};

/**
 * Deletes every report an account filed and every report filed against it,
 * for the account-deletion cascade.
 *
 * Both directions, because both name the account in the document's own path.
 * A report against an account that no longer exists has nothing left to act
 * on, and a report it filed is a record of who it reported. The cost accepted
 * is the one the Bite reports accept: an open report goes with the account that
 * filed it.
 */
export const deleteUserReportsForUser = async (
  db: Firestore,
  uid: string,
): Promise<number> =>
  (await deleteWhere(db, 'reportedUid', uid)) +
  (await deleteWhere(db, 'reporterUid', uid));
