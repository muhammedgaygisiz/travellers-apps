import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/firestore';
import {
  TABLE_TOKENS_COLLECTION,
  TableQrToken,
  scanFieldsOfTable,
} from './table-qr-tokens';

const getString = (data: DocumentData, field: string): string =>
  typeof data[field] === 'string' ? data[field] : '';

/**
 * The token a table points at, when it is still the active one and still
 * belongs to that table.
 *
 * The ownership check is deliberate belt and braces. `firestore.rules` now
 * refuses every client write to `qrTokenId`, so a table naming another table's
 * token should be unreachable - but if one ever were, this trigger would
 * rewrite or revoke a code stuck to a different table, and that is a failure
 * nobody would find by reading the plan.
 */
const activeTokenOfTable = async (
  restaurantId: string,
  tableId: string,
  table: DocumentData,
): Promise<{ id: string; data: TableQrToken } | undefined> => {
  const token = getString(table, 'qrTokenId');

  if (!token) {
    return undefined;
  }

  const snapshot = await getFirestore()
    .collection(TABLE_TOKENS_COLLECTION)
    .doc(token)
    .get();
  const data = snapshot.data() as TableQrToken | undefined;

  return data &&
    data.status === 'active' &&
    data.restaurantId === restaurantId &&
    data.tableId === tableId
    ? { id: snapshot.id, data }
    : undefined;
};

/**
 * Keeps a table's QR token true, and ends it when the table goes.
 *
 * Two jobs, one handler, because both are the same sentence: the token
 * document is what a scan resolves to, and it has to keep describing the table
 * it names.
 *
 * **The mirror.** A token survives its table moving to another room and being
 * renamed - that is the whole reason `roomId` is a field on the table rather
 * than the table being a document under its room (issue #1085), and it is what
 * lets a code already stuck to a table keep working. But `/tableTokens` copies
 * those fields so a scan is one read, and a copy nothing maintains is wrong
 * exactly when it matters: the guest is told they are sitting in a room the
 * table left.
 *
 * **The revocation.** Deleting a table ends its token. The document is updated
 * rather than deleted, because a deleted token document is indistinguishable
 * from a code that was never issued, and a guest scanning a sticker nobody
 * peeled off a retired table deserves "this code is no longer valid" rather
 * than silence.
 *
 * It runs on the callables' own `qrTokenId` write too, and does nothing there:
 * what they wrote already matches what this would write.
 */
export const handleSyncTableQrTokenOnTableWrite = async (
  restaurantId: string,
  tableId: string,
  before: DocumentData | undefined,
  after: DocumentData | undefined,
): Promise<void> => {
  const tokens = getFirestore().collection(TABLE_TOKENS_COLLECTION);

  if (after) {
    const current = await activeTokenOfTable(restaurantId, tableId, after);

    if (!current) {
      return;
    }

    const mirrored = scanFieldsOfTable(after);

    if (
      mirrored.roomId === current.data.roomId &&
      mirrored.tableLabel === current.data.tableLabel &&
      mirrored.tableEnabled === current.data.tableEnabled
    ) {
      return;
    }

    await tokens.doc(current.id).update(mirrored);

    logger.info(
      `syncTableQrTokenOnTableWrite: mirrored table ${tableId} onto its token`,
      { restaurantId, tableId },
    );

    return;
  }

  if (!before) {
    return;
  }

  const current = await activeTokenOfTable(restaurantId, tableId, before);

  if (!current) {
    return;
  }

  const now = new Date();

  await tokens.doc(current.id).update({
    status: 'revoked',
    endedAt: now.toISOString(),
    endedAtTimestamp: now.getTime(),
  });

  logger.info(
    `syncTableQrTokenOnTableWrite: revoked the token of deleted table ${tableId}`,
    { restaurantId, tableId },
  );
};

/**
 * `onDocumentWritten` rather than a create, an update and a delete trigger, so
 * the delete case cannot be handled in one and forgotten in another - the two
 * jobs above are one rule about one document.
 */
export const syncTableQrTokenOnTableWrite = onDocumentWritten(
  'restaurants/{restaurantId}/tables/{tableId}',
  async (event) => {
    const { restaurantId, tableId } = event.params;
    const before = event.data?.before;
    const after = event.data?.after;

    await handleSyncTableQrTokenOnTableWrite(
      restaurantId,
      tableId,
      before?.exists ? before.data() : undefined,
      after?.exists ? after.data() : undefined,
    );
  },
);
