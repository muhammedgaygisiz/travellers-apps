import { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

/**
 * Sends `BITE_TAGGED` to the users a creator just tagged in a Bite (GitHub
 * issue #1919), each in their own language. Which uids are owed one is the
 * tagged-users trigger's to decide; this only says it.
 *
 * The creator is named only when their profile is public. A private
 * creator's name is not something the tagged user could read in the app, so
 * the push does not hand it out either.
 */
export const notifyTaggedUsers = async (
  db: Firestore,
  biteId: string,
  bite: unknown,
  uids: string[],
): Promise<void> => {
  const { userId: creatorUid, name } = (bite ?? {}) as {
    userId?: unknown;
    name?: unknown;
  };
  const creator =
    typeof creatorUid === 'string' && creatorUid
      ? (await db.doc(`users/${creatorUid}`).get()).data()
      : undefined;
  const creatorName =
    creator?.['public'] === true && typeof creator['displayName'] === 'string'
      ? (creator['displayName'] as string)
      : undefined;

  await sendLocalizedNotification({
    uids,
    data: { type: 'BITE_TAGGED', biteId },
    buildMessage: (translate) => ({
      title: translate('biteTagged.title'),
      body: translate('biteTagged.body', {
        creator: creatorName || translate('common.someone'),
        bite: typeof name === 'string' ? name : '',
      }),
    }),
  });

  logger.info('notifyTaggedUsers: BITE_TAGGED sent', {
    biteId,
    recipients: uids.length,
  });
};
