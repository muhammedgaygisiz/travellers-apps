import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentDeleted } from 'firebase-functions/firestore';
import { TABLE_STATES_COLLECTION } from './table-state';

/**
 * Deletes a deleted table's live state, and nothing else (GitHub issue #1590).
 *
 * `/restaurants/{restaurantId}/tableStates/{tableId}` describes what a table is
 * doing right now, and a table that is gone is doing nothing. Left behind, the
 * document is invisible - the live view reads states only for tables it can
 * draw - but one accumulates per deleted table.
 *
 * What this deliberately does **not** touch is the record: the
 * `tableStateTransitions` entries and any `visits` naming the table. They are
 * what happened at a table that no longer exists, and that is the one thing
 * that has to outlive it ([[Table]], issues #1092 and #1095).
 *
 * A move between rooms is an update that keeps the table's id, so it never
 * reaches this trigger.
 *
 * A trigger rather than an operational migration, because a table is deleted
 * from the floor-plan editor and from the Firebase console alike, and only a
 * trigger sees both. A delete of a state that was never written is a no-op.
 */
export const handleDeleteTableStateOnTableDelete = async (
  restaurantId: string,
  tableId: string,
): Promise<void> => {
  const state = getFirestore()
    .collection('restaurants')
    .doc(restaurantId)
    .collection(TABLE_STATES_COLLECTION)
    .doc(tableId);

  if (!(await state.get()).exists) {
    return;
  }

  await state.delete();

  logger.info(
    `deleteTableStateOnTableDelete: removed the state of deleted table ${tableId}`,
    { restaurantId, tableId },
  );
};

export const deleteTableStateOnTableDelete = onDocumentDeleted(
  'restaurants/{restaurantId}/tables/{tableId}',
  async (event) => {
    const { restaurantId, tableId } = event.params;

    await handleDeleteTableStateOnTableDelete(restaurantId, tableId);
  },
);
