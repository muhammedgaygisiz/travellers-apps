import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/firestore';
import {
  TAGGED_USER_IDS_FIELD,
  taggedUserIdsOf,
  taggedUserIdsToNotify,
  taggedUserIdsToWrite,
} from './bite-tagged-users';
import { notifyTaggedUsers } from '../notifications/notify-tagged-users';

/**
 * Drops every tagged user the creator may not tag (GitHub issue #1916), then
 * tells the ones this write added (issue #1919).
 *
 * `firestore.rules` caps `taggedUserIds` and keeps the creator out of it;
 * what rules cannot read - the follow, the profile and the block behind each
 * uid - is checked here, after the write. See {@link taggedUserIdsToWrite}
 * for which checks apply to which uid, and for why the trigger's own write
 * does not trigger it again; {@link taggedUserIdsToNotify} for who is told.
 */
export const validateBiteTaggedUsersOnWrite = onDocumentWritten(
  'bites/{biteId}',
  async (event) => {
    const db = getFirestore();
    const biteId = event.params.biteId;
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const corrected = await taggedUserIdsToWrite(db, before, after);

    if (corrected !== undefined && event.data) {
      await event.data.after.ref.update({ [TAGGED_USER_IDS_FIELD]: corrected });

      logger.info('validateBiteTaggedUsersOnWrite: tagged users removed', {
        biteId,
        removed: taggedUserIdsOf(after).filter(
          (uid) => !corrected.includes(uid),
        ),
      });
    }

    const valid = corrected ?? taggedUserIdsOf(after);
    const toNotify = await taggedUserIdsToNotify(db, before, after, valid);

    if (toNotify.length > 0) {
      await notifyTaggedUsers(db, biteId, after, toNotify);
    }
  },
);
