import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { RESTAURANT_COLLECTION } from './restaurant-authority';
import {
  INITIAL_SCAN_ANOMALY_STATUS,
  SCAN_ANOMALIES_COLLECTION,
  SCAN_ANOMALY_QUIET_MS,
  ScanAnomaly,
  ScanAnomalyKind,
  scanAnomalyId,
} from './scan-anomaly';

/**
 * The one writer of a scan anomaly (GitHub issue #1107).
 *
 * ## Best effort, on purpose
 *
 * Nothing that calls this waits on the answer for a decision, and nothing that
 * calls this fails because it failed. A guest at a table whose session did not
 * start because a *row on a staff screen* could not be written would be the
 * feature breaking the thing it was added to protect - so the promise resolves
 * either way and a failure is logged.
 *
 * That is a stronger claim than it sounds, because of where the calls are. Two
 * of them sit on the refusal paths of `resolveTableQrToken`, which is the one
 * callable an attacker can reach without an account; one sits after
 * `startTableSession` has already committed. In all three the anomaly is a
 * report about something that already happened, and a report that cannot be
 * filed must not undo it.
 *
 * ## The quiet window is what makes this safe to call from a hot path
 *
 * The caller controls the frequency - that is what a rate-limited endpoint
 * means - so a writer with no floor under it would turn a loop into a Firestore
 * write per iteration. Instead, one raising per table per kind per
 * {@link SCAN_ANOMALY_QUIET_MS}: the transaction reads the document, sees that
 * it was raised inside the window, and returns without writing. A flood is one
 * read each and one write a minute.
 *
 * {@link ScanAnomaly.count} therefore counts raisings rather than requests, and
 * the model says so. It is the honest number: the question a staff screen
 * answers is "how many separate times has this table come up", and how large
 * any one burst was is a question for the function logs, which have it.
 *
 * ## Why a transaction for a signal nothing depends on
 *
 * Because the cheaper alternative is wrong in the case this is for. The read
 * and the write are one document, so a transaction costs exactly what a read
 * plus a write costs; what it buys is that two instances raising the same
 * anomaly in the same second produce a `count` of two and one `firstSeenAt`,
 * rather than two last-write-wins documents each convinced it was first. Under
 * an attack, concurrent instances are the normal case rather than the race.
 *
 * ## Why raising one re-opens a dismissed row
 *
 * A member of staff dismissing a row is saying they have read it, not that the
 * table is now exempt. So a raising past the quiet window sets the status back
 * to `open` and keeps `firstSeenAt` and `count` - which is what makes "this
 * started again after we looked at it" visible, and is the reason a dismissed
 * anomaly is kept at its derived name instead of being deleted.
 */
export interface RecordScanAnomalyInput {
  restaurantId: string;
  tableId: string;
  /** The table's number as staff call it. Empty where the table is unknown. */
  tableLabel: string;
  kind: ScanAnomalyKind;
  now: number;
  /** Rounded metres, on `distantScan`. */
  distanceMeters?: number;
  /** Live sessions on the table, on `manySessions`. */
  sessionCount?: number;
}

/**
 * Raises one anomaly, or joins the one that is already up.
 *
 * Answers whether anything was written, which the emulator tests assert on and
 * nothing in production reads.
 */
export const recordScanAnomaly = async ({
  restaurantId,
  tableId,
  tableLabel,
  kind,
  now,
  distanceMeters,
  sessionCount,
}: RecordScanAnomalyInput): Promise<boolean> => {
  if (!restaurantId || !tableId) {
    return false;
  }

  const firestore = getFirestore();
  const reference = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(SCAN_ANOMALIES_COLLECTION)
    .doc(scanAnomalyId(tableId, kind));

  try {
    return await firestore.runTransaction(async (transaction) => {
      const stored = (await transaction.get(reference)).data();
      const lastSeenAt =
        typeof stored?.['lastSeenAt'] === 'number'
          ? (stored['lastSeenAt'] as number)
          : 0;

      if (now - lastSeenAt < SCAN_ANOMALY_QUIET_MS) {
        return false;
      }

      const raised: ScanAnomaly = {
        id: reference.id,
        restaurantId,
        tableId,
        tableLabel,
        kind,
        // Back to `open` even when it was dismissed. A dismissal says somebody
        // read the row, not that the table stopped being worth one.
        status: INITIAL_SCAN_ANOMALY_STATUS,
        firstSeenAt:
          typeof stored?.['firstSeenAt'] === 'number'
            ? (stored['firstSeenAt'] as number)
            : now,
        lastSeenAt: now,
        count:
          (typeof stored?.['count'] === 'number'
            ? (stored['count'] as number)
            : 0) + 1,
        ...(distanceMeters === undefined
          ? {}
          : { distanceMeters: Math.round(distanceMeters) }),
        ...(sessionCount === undefined ? {} : { sessionCount }),
      };

      // A `set` rather than an update, for the reason the assistance request is
      // replaced rather than merged: the document being written over may carry
      // `dismissedAt` and `dismissedByUserId`, and a re-opened row that still
      // names who cleared the last one is a row staff read as already handled.
      transaction.set(reference, raised);

      return true;
    });
  } catch (error) {
    logger.warn('recordScanAnomaly: could not record', {
      restaurantId,
      tableId,
      kind,
      error,
    });

    return false;
  }
};
