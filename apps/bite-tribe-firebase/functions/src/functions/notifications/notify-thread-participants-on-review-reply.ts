import { onDocumentCreated } from 'firebase-functions/firestore';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { User } from '../shared/model/user';
import { Bite } from '../shared/model/bite';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

const db = getFirestore();

type Review = {
  biteId: string;
  authorId?: string;
  author?: string;
  review: string;
  parentReviewId?: string;
  threadId?: string;
};

/**
 * The accounts that can be told about a reply: they have a user document and
 * that document is public.
 *
 * Reviews written before `authorId` existed carry no uid at all and never reach
 * this point; a uid that no longer resolves to a public account is dropped here
 * rather than failing the whole fan-out, so one unreachable participant cannot
 * silence a thread for everyone else (issue #1283).
 */
const keepReachable = async (uids: string[]): Promise<string[]> => {
  const reachable = await Promise.all(
    uids.map(async (uid) => {
      const snap = await db.doc(`users/${uid}`).get();

      if (!snap.exists) {
        logger.warn(`--- Participant ${uid} has no user doc, skipping`);

        return undefined;
      }

      const user = snap.data() as User;

      if (!user?.public) {
        logger.warn(`--- Participant ${uid} is not public, skipping`);

        return undefined;
      }

      return uid;
    }),
  );

  return reachable.filter((uid): uid is string => !!uid);
};

/**
 * Tells everyone already in a review conversation that it has moved.
 *
 * Replies live in the same `reviews` collection as the reviews they answer, so
 * this runs on every review write and returns immediately for the ones that
 * open a thread rather than continue one — those stay with
 * `notifyBiteCreatorOnReview` and its unchanged copy. The cost of the split is
 * one no-op invocation per root review; the gain is that neither trigger has to
 * carry the other's branches (issue #1283).
 *
 * Participants are the root review's author, every reply author in the thread,
 * and the Bite creator. Deduplicated, and minus whoever just wrote — a
 * participant hears about a reply once no matter how much they have already
 * said in that thread, and never about their own.
 */
export const notifyThreadParticipantsOnReviewReply = onDocumentCreated(
  'reviews/{reviewId}',
  async (event) => {
    const snap = event.data;

    if (!snap) {
      return;
    }

    const reply = snap.data() as Review;

    // Everything below is about a conversation. A root review does not have
    // one yet.
    if (!reply.parentReviewId) {
      return;
    }

    logger.info('--- New review reply created, resolving thread participants');

    const replyAuthorId = reply.authorId;

    logger.info('--- Reply author UID:', replyAuthorId);
    if (!replyAuthorId) {
      logger.warn('--- Reply has no author UID, aborting notification');

      return;
    }

    // A reply written before `threadId` was carried, or one whose root is its
    // parent, still names its conversation through the review it answers.
    const threadId = reply.threadId ?? reply.parentReviewId;

    const biteId = reply.biteId?.split('/').pop();

    logger.info('--- Bite ID:', biteId);
    if (!biteId) {
      logger.warn('--- Reply has no valid biteId, aborting notification');

      return;
    }

    const biteSnap = await db.doc(`bites/${biteId}`).get();

    logger.info('--- Bite exist:', biteSnap.exists);
    if (!biteSnap.exists) {
      logger.warn('--- Bite does not exist, aborting notification');

      return;
    }

    const bite = biteSnap.data() as Bite;

    const rootSnap = await db.doc(`reviews/${threadId}`).get();
    const root = rootSnap.exists ? (rootSnap.data() as Review) : undefined;

    const threadSnap = await db
      .collection('reviews')
      .where('threadId', '==', threadId)
      .get();

    const replyAuthorIds = threadSnap.docs
      .map((doc) => (doc.data() as Review).authorId)
      .filter((uid): uid is string => !!uid);

    const participants = [
      ...new Set(
        [root?.authorId, bite.userId, ...replyAuthorIds].filter(
          (uid): uid is string => !!uid && uid !== replyAuthorId,
        ),
      ),
    ];

    logger.info('--- Thread participants to notify:', participants);
    if (participants.length === 0) {
      logger.info('--- No one left to notify, aborting notification');

      return;
    }

    const recipients = await keepReachable(participants);

    if (recipients.length === 0) {
      logger.warn('--- No reachable participants, aborting notification');

      return;
    }

    const replyAuthorSnap = await db.doc(`users/${replyAuthorId}`).get();
    const replyAuthor = replyAuthorSnap.exists
      ? (replyAuthorSnap.data() as User)
      : undefined;

    await sendLocalizedNotification({
      uids: recipients,
      data: {
        type: 'NEW_REVIEW_REPLY',
        biteId: `${biteId}`,
        threadId: `${threadId}`,
        replyId: `${snap.id}`,
        replyAuthorId: `${replyAuthorId}`,
      },
      buildMessage: (translate) => ({
        title: translate('newReviewReply.title'),
        body: translate('newReviewReply.body', {
          replier: replyAuthor?.displayName ?? translate('common.someone'),
          bite: bite.name,
        }),
      }),
    });
  },
);
