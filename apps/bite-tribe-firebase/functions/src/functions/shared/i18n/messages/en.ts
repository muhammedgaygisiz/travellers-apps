import { NotificationMessages } from '../notification-messages';

/** English copy. Also the fallback for any language the catalog cannot serve. */
export const en: NotificationMessages = {
  'common.someone': 'Someone',
  'emailVerification.subject': 'Verify your Bite Tribe email address',
  'emailVerification.body':
    'Please verify your email address so your Bite Tribe account stays secure and you can receive important account messages.',
  'emailVerification.linkLabel': 'Verify email address',
  'newBite.title': 'New Bite',
  'newBite.body': '{{author}} just created a new bite',
  'newBite.bodyWithName': '{{author}} just created a new bite: {{bite}}',
  'newFollower.title': 'New Follower!',
  'newFollower.body': '{{follower}} is now following you.',
  'newLike.title': 'New Like on Your Bite!',
  'newLike.body': '{{liker}} liked your Bite "{{bite}}".',
  'newReview.title': 'New Review on Your Bite!',
  'newReview.body': '{{reviewer}} reviewed your Bite "{{bite}}".',
  'weeklyBites.title': "🍽️ This week's bites are here 🤩",
  'weeklyBites.bodyOne': 'The BiteTribe shared 1 new bite last week',
  'weeklyBites.bodyMany': 'The BiteTribe shared {{count}} new bites last week',
  'leaderboard.title': 'Leaderboard Update',
  'leaderboard.enteredTop':
    'You entered the top {{limit}} at #{{rank}} on the leaderboard! 🎉',
  'leaderboard.droppedOut':
    'You dropped out of the top {{limit}} on the leaderboard.',
  'leaderboard.climbed': 'You climbed up to #{{rank}} on the leaderboard! 🎉',
  'leaderboard.dropped': 'You dropped to #{{rank}} on the leaderboard.',
  'countryBadge.title': '🎉 New country badge!',
  'countryBadge.body': 'Congrats! You just unlocked the badge for {{country}}',
  'countryBadge.followerTitle': '🌍 New country badge',
  'countryBadge.followerBody':
    '{{user}} just unlocked the badge for {{country}}',
  'newVersion.title': '🚀 New version available',
  'newVersion.bodyIos':
    'A new BiteTribe version is ready in the App Store. Update now to get the latest.',
  'newVersion.bodyAndroid':
    'A new BiteTribe version is ready on Google Play. Update now to get the latest.',
};
