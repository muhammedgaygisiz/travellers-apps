import { onDocumentCreated } from 'firebase-functions/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { User } from '../shared/model/user';
import { Bite } from '../shared/model/bite';
import { Translate } from '../shared/i18n/translate';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';
import { judgeBiteContent } from '../bites/bite-content';
import { loadBlockedEitherWayUids } from '../shared/utils/user-blocks';

const db = getFirestore();

/**
 * The followers a new Bite is pushed to (issue #2167).
 *
 * Every follower of a public author. A private author's followers only when
 * the edge carries `acceptedAt`, which `acceptFollowRequest` writes, the
 * switch to private writes on every follower (issue #2168), and a client never
 * does: an edge without it was never approved by the owner. Either way an account that blocks the
 * author, or that the author blocks, is left out.
 */
const getRecipientUids = (
  followersSnap: FirebaseFirestore.QuerySnapshot<
    FirebaseFirestore.DocumentData,
    FirebaseFirestore.DocumentData
  >,
  isAuthorPublic: boolean,
  blockedUids: ReadonlySet<string>,
): string[] =>
  followersSnap.docs
    .filter((d) => isAuthorPublic || d.data().acceptedAt !== undefined)
    .map((d) => d.id)
    .filter((uid) => !blockedUids.has(uid));

const buildNotificationBody = (
  translate: Translate,
  authorData: User,
  bite: Bite,
): string => {
  const author = authorData.displayName ?? translate('common.someone');

  // A Bite without a name gets the shorter sentence rather than a dangling
  // separator, which only the catalog can express per language.
  return bite.name
    ? translate('newBite.bodyWithName', { author, bite: bite.name })
    : translate('newBite.body', { author });
};

export const notifyFollowersOnNewBite = onDocumentCreated(
  'bites/{biteId}',
  async (event) => {
    const snap = event.data;
    const biteId = event.params.biteId;

    logger.info('--- New bite created, preparing to notify followers');
    logger.info('--- Bite ID:', biteId);
    if (!snap) {
      return;
    }

    const bite = snap.data() as Bite;
    const authorUid = bite.userId;

    logger.info('--- Author UID:', authorUid);
    if (!authorUid) {
      logger.warn('--- Bite has no author UID, aborting notification');
      return;
    }

    const authorSnap = await db.doc(`users/${authorUid}`).get();

    logger.info('--- Author exist:', authorSnap.exists);
    if (!authorSnap.exists) {
      logger.warn(
        `--- Author does not exist: ${authorSnap.exists}, aborting notification`,
      );
      return;
    }

    const authorData = authorSnap.data() as User;

    logger.info('--- Author:', authorData);
    if (!authorData) {
      logger.warn('--- Author with no data, aborting notification');
      return;
    }

    const followersSnap = await db
      .collection(`users/${authorUid}/followers`)
      .get();

    logger.info(`--- Number of followers: ${followersSnap.size}`);
    if (followersSnap.empty) {
      logger.warn('--- No followers found, aborting notification');
      return;
    }

    const followerUids = getRecipientUids(
      followersSnap,
      authorData.public === true,
      await loadBlockedEitherWayUids(db, authorUid),
    );

    logger.info(`--- Number of recipients: ${followerUids.length}`);
    if (followerUids.length === 0) {
      logger.warn('--- No follower may be notified, aborting notification');
      return;
    }

    // The push carries the Bite's name, and it goes out before
    // `moderateBiteOnWrite` may remove the Bite, so it judges the text itself
    // (issue #1610). The verdict is shared through `contentChecks`.
    if ((await judgeBiteContent(db, bite)).verdict === 'refused') {
      logger.info('--- Bite content refused, no follower notification');
      return;
    }

    await sendLocalizedNotification({
      uids: followerUids,
      data: {
        type: 'NEW_BITE',
        biteId: `${biteId}`,
        authorUid: `${authorUid}`,
      },
      buildMessage: (translate) => ({
        title: translate('newBite.title'),
        body: buildNotificationBody(translate, authorData, bite),
      }),
    });
  },
);
