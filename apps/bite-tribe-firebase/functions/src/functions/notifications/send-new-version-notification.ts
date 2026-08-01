import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  NotificationPlatform,
  isNotificationPlatform,
} from '../shared/model/notification-platform';
import { getAllUserUids } from '../shared/utils/get-all-user-uids';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

export interface SendNewVersionNotificationRequest {
  platform?: unknown;
}

export interface SendNewVersionNotificationResult {
  platform: NotificationPlatform;
  /** Installations the announcement was addressed to. */
  tokenCount: number;
  /** Accounts scanned for those installations. */
  userCount: number;
}

const NEW_VERSION_MESSAGES: Record<
  NotificationPlatform,
  'newVersion.bodyIos' | 'newVersion.bodyAndroid'
> = {
  ios: 'newVersion.bodyIos',
  android: 'newVersion.bodyAndroid',
};

/**
 * Announces a released app version to the installations of one store.
 *
 * The trigger is manual because nothing observable tells the backend when a
 * TestFlight build or a Play Console review has actually gone live, and the two
 * stores clear at different times - so the operator fires one platform at a
 * time from the business app (issue \#1194).
 *
 * The send is addressed by installation platform rather than by account: the
 * same user can have both an iPhone and an Android phone registered, and only
 * the one whose store already serves the new version should be told to update.
 */
export const sendNewVersionNotification =
  onAppCheck<SendNewVersionNotificationRequest>(
    async (request): Promise<SendNewVersionNotificationResult> => {
      if (!request.auth) {
        logger.warn(
          'sendNewVersionNotification: unauthenticated request rejected',
        );
        throw new HttpsError(
          'unauthenticated',
          'You must be signed in to announce a new version.',
        );
      }

      const platform = request.data?.platform;

      if (!isNotificationPlatform(platform)) {
        throw new HttpsError(
          'invalid-argument',
          'platform must be either "ios" or "android".',
        );
      }

      logger.info('sendNewVersionNotification: started', {
        uid: request.auth.uid,
        platform,
      });

      const userUids = await getAllUserUids();

      if (userUids.length === 0) {
        logger.warn('sendNewVersionNotification: no users found');

        return { platform, tokenCount: 0, userCount: 0 };
      }

      const tokenCount = await sendLocalizedNotification({
        uids: userUids,
        platform,
        data: {
          type: 'NEW_VERSION_AVAILABLE',
          platform,
        },
        buildMessage: (translate) => ({
          title: translate('newVersion.title'),
          body: translate(NEW_VERSION_MESSAGES[platform]),
        }),
      });

      const result = { platform, tokenCount, userCount: userUids.length };

      logger.info('sendNewVersionNotification: finished', result);

      return result;
    },
  );
