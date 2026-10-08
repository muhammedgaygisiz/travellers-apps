import { DocumentReference, Firestore } from 'firebase-admin/firestore';

/**
 * Where a report on a Bite lives (GitHub issue #1608).
 *
 * ```text
 * /biteReports/{biteId}_{reporterUid}
 * ```
 *
 * One document per account per Bite, named by the pair. The name is the whole
 * duplicate check: a second report from the same account is a `create` on a
 * document that already exists, which Firestore refuses atomically, so two taps
 * racing each other still leave one report rather than two.
 *
 * Written only by `reportBite` and read only by the operator callables, both
 * through the Admin SDK. `firestore.rules` lets an operator read the collection
 * and nobody write it.
 */
export const BITE_REPORTS_COLLECTION = 'biteReports';

/**
 * Why a Bite was reported.
 *
 * A short fixed list rather than free text. A reporter is choosing, not
 * writing, so the report is one tap and nothing in it can itself be abusive
 * text an operator then has to read. `other` keeps the list from forcing a
 * reporter to pick a reason that is not theirs.
 *
 * Repeated in `libs/bite-tribe-common/model/src/lib/bite-report.ts`, because the
 * Functions project cannot reach a library (see `shared/roles.ts`). The two
 * lists have to be changed together.
 */
export const BITE_REPORT_REASONS = [
  'spam',
  'notFood',
  'inappropriate',
  'harassment',
  'other',
] as const;

export type BiteReportReason = (typeof BITE_REPORT_REASONS)[number];

/**
 * `open` until an operator acts on it.
 *
 * There is no `resolved`: deleting the Bite deletes its reports with it, so the
 * only outcome that leaves a report behind is an operator deciding the Bite
 * stays. A dismissed report is kept rather than deleted so the account that
 * filed it still cannot file it again.
 */
export type BiteReportStatus = 'open' | 'dismissed';

export interface BiteReport {
  biteId: string;
  reporterUid: string;
  reason: BiteReportReason;
  status: BiteReportStatus;
  createdAt: string;
  createdAtTimestamp: number;
  dismissedAt?: string;
  dismissedAtTimestamp?: number;
}

export const isBiteReportReason = (value: unknown): value is BiteReportReason =>
  typeof value === 'string' &&
  (BITE_REPORT_REASONS as readonly string[]).includes(value);

export const biteReportId = (biteId: string, reporterUid: string): string =>
  `${biteId}_${reporterUid}`;

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

const deleteRefs = async (
  db: Firestore,
  refs: DocumentReference[],
): Promise<void> => {
  for (let index = 0; index < refs.length; index += WRITE_BATCH_LIMIT) {
    const batch = db.batch();
    refs
      .slice(index, index + WRITE_BATCH_LIMIT)
      .forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

/**
 * Deletes every report filed against a Bite, open or dismissed.
 *
 * A report about a Bite that no longer exists has nothing left to act on, and
 * it is a record of who reported what: once the content is gone there is no
 * reason to keep the reporter's name next to it.
 */
export const deleteBiteReportsForBite = async (
  db: Firestore,
  biteId: string,
): Promise<number> => {
  const reports = await db
    .collection(BITE_REPORTS_COLLECTION)
    .where('biteId', '==', biteId)
    .get();

  await deleteRefs(
    db,
    reports.docs.map((report) => report.ref),
  );

  return reports.size;
};

/**
 * Deletes every report an account filed, for the account-deletion cascade.
 *
 * Deleted rather than anonymised, because the document's own name carries the
 * reporter's uid: clearing the field would leave the identifier in the path. The
 * cost accepted is that an open report goes with the account that filed it, so
 * a Bite reported only by a since-deleted account drops out of the queue.
 */
export const deleteBiteReportsByReporter = async (
  db: Firestore,
  reporterUid: string,
): Promise<number> => {
  const reports = await db
    .collection(BITE_REPORTS_COLLECTION)
    .where('reporterUid', '==', reporterUid)
    .get();

  await deleteRefs(
    db,
    reports.docs.map((report) => report.ref),
  );

  return reports.size;
};
