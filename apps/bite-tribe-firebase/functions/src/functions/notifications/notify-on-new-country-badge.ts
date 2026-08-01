import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { User } from '../shared/model/user';
import { buildCountryLabel } from '../shared/utils/country-label';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

const db = getFirestore();

/**
 * Payload type the app routes on. A tap opens the profile that earned the
 * badge, which for the achiever is their own.
 */
export const NEW_COUNTRY_BADGE = 'NEW_COUNTRY_BADGE';

const buildPayload = (
  userId: string,
  countryCode: string,
): Record<string, string> => ({
  type: NEW_COUNTRY_BADGE,
  userId: `${userId}`,
  countryCode: `${countryCode}`,
});

/**
 * Congratulates the user who just added a country they had never covered
 * before.
 */
const congratulateBadgeOwner = async (
  userId: string,
  countryCode: string,
): Promise<void> => {
  await sendLocalizedNotification({
    uids: [userId],
    data: buildPayload(userId, countryCode),
    buildMessage: (translate, language) => ({
      title: translate('countryBadge.title'),
      body: translate('countryBadge.body', {
        country: buildCountryLabel(countryCode, language),
      }),
    }),
  });
};

/**
 * Tells the followers about the achievement, so the badge is recognition in
 * front of an audience rather than a private counter.
 */
const announceToFollowers = async (
  user: User,
  userId: string,
  countryCode: string,
): Promise<void> => {
  const followersSnap = await db.collection(`users/${userId}/followers`).get();

  logger.info(`--- Number of followers: ${followersSnap.size}`);
  if (followersSnap.empty) {
    logger.info('--- No followers to announce the country badge to');
    return;
  }

  await sendLocalizedNotification({
    uids: followersSnap.docs.map((doc) => doc.id),
    data: buildPayload(userId, countryCode),
    buildMessage: (translate, language) => ({
      title: translate('countryBadge.followerTitle'),
      body: translate('countryBadge.followerBody', {
        user: user.displayName ?? translate('common.someone'),
        country: buildCountryLabel(countryCode, language),
      }),
    }),
  });
};

/**
 * Celebrates a country badge the user has just earned for the first time
 * (issue \#1212).
 *
 * The caller decides what counts as new: this runs only once the country has
 * actually been added to a profile that did not have it, so an ordinary second
 * Bite in the same country stays silent.
 *
 * A private profile is congratulated but not announced. Followers of a private
 * account are not an audience for its activity anywhere else in the app, and a
 * badge notification must not become the one place that leaks where someone
 * has been.
 */
export const notifyOnNewCountryBadge = async (
  userId: string,
  countryCode: string,
): Promise<void> => {
  logger.info('--- New country badge earned, preparing to notify', {
    userId,
    countryCode,
  });

  const userSnap = await db.doc(`users/${userId}`).get();

  if (!userSnap.exists) {
    logger.warn('--- User does not exist, aborting country badge notification');
    return;
  }

  const user = userSnap.data() as User;

  if (!user) {
    logger.warn('--- User has no data, aborting country badge notification');
    return;
  }

  await congratulateBadgeOwner(userId, countryCode);

  if (!user.public) {
    logger.info(
      '--- Profile is not public, skipping the follower announcement',
    );
    return;
  }

  await announceToFollowers(user, userId, countryCode);
};
