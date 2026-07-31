import { onDocumentCreated } from 'firebase-functions/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { User } from '../shared/model/user';
import { Bite } from '../shared/model/bite';
import { Translate } from '../shared/i18n/translate';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

const db = getFirestore();

const getFollowerUids = (
  followersSnap: FirebaseFirestore.QuerySnapshot<
    FirebaseFirestore.DocumentData,
    FirebaseFirestore.DocumentData
  >,
): string[] => followersSnap.docs.map((d) => d.id);

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
    if (!authorData || !authorData.public) {
      logger.warn(
        '--- Author with no data or not public, aborting notification',
      );
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

    const followerUids = getFollowerUids(followersSnap);

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
