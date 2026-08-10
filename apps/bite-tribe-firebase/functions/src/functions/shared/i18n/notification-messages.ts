/**
 * Every piece of copy the backend can put in front of a user.
 *
 * The keys are the backend equivalent of a Transloco key: the sender names the
 * message, never the English sentence, so the same trigger can go out in the
 * recipient's language (issue \#1200).
 *
 * Push notifications were the first surface, transactional email the second:
 * both are rendered outside the running app, so neither can reach Transloco and
 * both read from this one catalog rather than a second list that drifts
 * (issue \#1264).
 */
export type NotificationMessageKey =
  | 'common.someone'
  | 'emailVerification.subject'
  | 'emailVerification.body'
  | 'emailVerification.linkLabel'
  | 'newBite.title'
  | 'newBite.body'
  | 'newBite.bodyWithName'
  | 'newFollower.title'
  | 'newFollower.body'
  | 'newLike.title'
  | 'newLike.body'
  | 'newReview.title'
  | 'newReview.body'
  | 'newReviewReply.title'
  | 'newReviewReply.body'
  | 'weeklyBites.title'
  | 'weeklyBites.bodyOne'
  | 'weeklyBites.bodyMany'
  | 'leaderboard.title'
  | 'leaderboard.enteredTop'
  | 'leaderboard.droppedOut'
  | 'leaderboard.climbed'
  | 'leaderboard.dropped'
  | 'countryBadge.title'
  | 'countryBadge.body'
  | 'countryBadge.followerTitle'
  | 'countryBadge.followerBody'
  | 'newVersion.title'
  | 'newVersion.bodyIos'
  | 'newVersion.bodyAndroid';

/**
 * One locale's full catalog. `Record` is deliberate: a locale that forgets a
 * key fails the build instead of silently sending English to that language.
 */
export type NotificationMessages = Record<NotificationMessageKey, string>;
