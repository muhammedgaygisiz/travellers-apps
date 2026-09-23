import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import { USERS_COLLECTION, VISIT_SUMMARIES_COLLECTION } from './visit-summary';

/**
 * Stops asking once a meal has become a Bite (GitHub issue #1112).
 *
 * ## Why a trigger and not the client
 *
 * The summary is written by the Admin SDK and `firestore.rules` refuses every
 * client write to it, which is what keeps a guest from editing the record of
 * what they ordered. So the app cannot mark its own summary, and a callable
 * that let it would be a second write path into a document whose whole value
 * is that only the backend writes it.
 *
 * A trigger on the Bite instead: the guest publishes, and the meal they made
 * it from stops being asked about. It fires on **create** and on nothing else,
 * because editing a Bite afterwards does not un-make it.
 *
 * ## What it is not
 *
 * Not the menu-item link. `Bite.visitId` names the evening and issue #1113's
 * `menuItemId` names the dish; this one exists so the nightly reminder knows
 * when to stop, and nothing reads it back to a user.
 *
 * ## Why a missing summary is not an error
 *
 * A Bite can carry a `visitId` whose summary has since been deleted with the
 * account, or was never written because the guest was never seated. `update`
 * would throw on a document that is not there, so the write is a merged `set`
 * with the id alone - which is a row nothing reads rather than a failure that
 * retries forever.
 */
export const markVisitSummaryOnBiteCreate = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    const bite = event.data?.data();
    const visitId = bite?.['visitId'];
    const userId = bite?.['userId'];

    if (typeof visitId !== 'string' || !visitId) {
      return;
    }

    if (typeof userId !== 'string' || !userId) {
      // A Bite with no owner cannot name whose summary to mark. Nothing writes
      // one - the creation path stamps the caller - so this is a guard rather
      // than a case.
      return;
    }

    await getFirestore()
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(VISIT_SUMMARIES_COLLECTION)
      .doc(visitId)
      .set({ biteCreated: true }, { merge: true });

    logger.info('visit summary marked as converted', { userId, visitId });
  },
);
