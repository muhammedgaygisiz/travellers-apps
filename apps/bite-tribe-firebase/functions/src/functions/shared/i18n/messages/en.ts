import { NotificationMessages } from '../notification-messages';

/** English copy. Also the fallback for any language the catalog cannot serve. */
export const en: NotificationMessages = {
  'common.someone': 'Someone',
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
};
