import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
  requireTableStateAuthority,
} from './restaurant-authority';
import {
  SCAN_ANOMALIES_COLLECTION,
  ScanAnomalyKind,
  ScanAnomalyStatus,
  isScanAnomalyKind,
  scanAnomalyId,
} from './scan-anomaly';

/**
 * A member of staff saying they have read the row (GitHub issue #1107).
 *
 * ## Why it is a callable and not a client write
 *
 * `firestore.rules` refuses every client write to `scanAnomalies`, as it does
 * to the assistance requests, the visits, the sessions, the orders and the live
 * table states around them. The reason here is narrower than for most of those
 * and worth stating: the collection is the only record a restaurant has that
 * its codes were being worked on, and a client able to write to it could raise
 * a row against a table it has nothing to do with, or - much worse - rewrite
 * `firstSeenAt` and `count` on one it wants to look ordinary.
 *
 * ## Why there is no `expectedStatus`
 *
 * `acknowledgeTableAssistance`'s answer, for the same reason. Dismissal has one
 * destination, so two people pressing it in the same second both got what they
 * wanted, and a second press is answered with the stored values and
 * `changed: false` rather than with an error about a race that cost nobody
 * anything.
 *
 * ## What a dismissal means, and what it does not
 *
 * It means somebody has read this. It does **not** exempt the table: the
 * document keeps its name, so the next raising past the quiet window sets it
 * back to `open` carrying the `firstSeenAt` and the `count` it already had -
 * which is what makes "this started again after we looked at it" a thing the
 * row can say. See `recordScanAnomaly`.
 *
 * It also does nothing about the cause. The action a `rateLimited` row is
 * asking for is `rotateTableQrToken`, which is one press away on the QR sheet,
 * and the two are deliberately separate: rotating a code reprints a sticker,
 * and a dismissal must not.
 */

/** What the staff screen sends to clear one row. */
export interface DismissScanAnomalyRequest {
  restaurantId: string;
  /**
   * The table and the kind rather than the document id, because those are what
   * the id *is* - and naming the parts means a caller cannot address a document
   * in another restaurant by pasting a name.
   */
  tableId: string;
  kind: ScanAnomalyKind;
}

export interface DismissScanAnomalyResult {
  restaurantId: string;
  tableId: string;
  kind: ScanAnomalyKind;
  status: ScanAnomalyStatus;
  dismissedAt: number;
  dismissedByUserId: string;
  /** False when somebody else had already dismissed it. */
  changed: boolean;
}

const parseKind = (value: unknown): ScanAnomalyKind => {
  if (!isScanAnomalyKind(value)) {
    throw new HttpsError('invalid-argument', 'kind is not an anomaly kind.');
  }

  return value;
};

export const dismissScanAnomalyHandler = async (
  request: CallableRequest<DismissScanAnomalyRequest>,
  now: Date = new Date(),
): Promise<DismissScanAnomalyResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const tableId = parseRequiredString(request.data?.tableId, 'tableId');
  const kind = parseKind(request.data?.kind);

  // The authority that operates a restaurant during service, not the one that
  // configures it. A host reading the floor is exactly who sees these rows, and
  // a second list of who may clear one would be free to disagree with who may
  // answer a table. Rotating the code the row is about is the *other* authority
  // on purpose - that one reprints a sticker.
  const actingUid = await requireTableStateAuthority(request, restaurantId);

  const firestore = getFirestore();
  const anomalyRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(SCAN_ANOMALIES_COLLECTION)
    .doc(scanAnomalyId(tableId, kind));

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(anomalyRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'There is no signal at that table.');
    }

    const stored = snapshot.data();

    if (stored?.['status'] === 'dismissed') {
      // Already read, by somebody else or by a second press of the same button.
      // The stored values rather than this call's, so two devices agree on who
      // cleared it and when.
      return {
        restaurantId,
        tableId,
        kind,
        status: 'dismissed' as const,
        dismissedAt:
          typeof stored['dismissedAt'] === 'number'
            ? (stored['dismissedAt'] as number)
            : 0,
        dismissedByUserId:
          typeof stored['dismissedByUserId'] === 'string'
            ? (stored['dismissedByUserId'] as string)
            : '',
        changed: false,
      };
    }

    const dismissedAt = now.getTime();

    // An update rather than a set: when it was first seen, how often and how
    // far away are what the scans did, and a replacement built from this
    // request would be a replacement the caller can shape.
    transaction.update(anomalyRef, {
      status: 'dismissed',
      dismissedAt,
      dismissedByUserId: actingUid,
    });

    return {
      restaurantId,
      tableId,
      kind,
      status: 'dismissed' as const,
      dismissedAt,
      dismissedByUserId: actingUid,
      changed: true,
    };
  });
};

/**
 * The fourth callable a `staff` account may reach.
 *
 * Classified `staffAuthority` in `callable-authorization.spec.ts`, beside
 * `transitionTableState`, `moveTableVisit`, `transitionTableOrderStatus` and
 * `acknowledgeTableAssistance`: reading the floor's signals is the same
 * permission as working the floor.
 */
export const dismissScanAnomaly = onAppCheck<DismissScanAnomalyRequest>(
  (request) => dismissScanAnomalyHandler(request),
);
