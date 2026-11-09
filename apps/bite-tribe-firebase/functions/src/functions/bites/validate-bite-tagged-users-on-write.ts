import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/firestore';
import {
  TAGGED_USER_IDS_FIELD,
  taggedUserIdsOf,
  taggedUserIdsToWrite,
} from './bite-tagged-users';

/**
 * Drops every tagged user the creator may not tag (GitHub issue #1916).
 *
 * `firestore.rules` caps `taggedUserIds` and keeps the creator out of it;
 * what rules cannot read - the follow, the profile and the block behind each
 * uid - is checked here, after the write. See {@link taggedUserIdsToWrite}
 * for which checks apply to which uid, and for why the trigger's own write
 * does not trigger it again.
 */
export const validateBiteTaggedUsersOnWrite = onDocumentWritten(
  'bites/{biteId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const valid = await taggedUserIdsToWrite(getFirestore(), before, after);

    if (valid === undefined || !event.data) {
      return;
    }

    await event.data.after.ref.update({ [TAGGED_USER_IDS_FIELD]: valid });

    logger.info('validateBiteTaggedUsersOnWrite: tagged users removed', {
      biteId: event.params.biteId,
      removed: taggedUserIdsOf(after).filter((uid) => !valid.includes(uid)),
    });
  },
);
