import { NotificationMessages } from '../notification-messages';

/** English copy. Also the fallback for any language the catalog cannot serve. */
export const en: NotificationMessages = {
  'common.someone': 'Someone',
  'emailVerification.subject': 'Verify your BiteTribe email address',
  'emailVerification.body':
    'Please verify your email address so your BiteTribe account stays secure and you can receive important account messages.',
  'emailVerification.linkLabel': 'Verify email address',
  'visitSummary.subject': 'Your visit to {{restaurant}}',
  'visitSummary.heading': 'What you ordered',
  'visitSummary.intro':
    'Here is a summary of your visit to {{restaurant}} on {{date}}.',
  'visitSummary.total': 'Total',
  'visitSummary.settled': 'The restaurant has marked this as paid.',
  'visitSummary.unsettled':
    'The restaurant has not recorded a payment for this visit.',
  'visitSummary.footnote':
    'This is a summary of what was ordered, not a receipt. Your receipt comes from the restaurant.',
  'visitReminder.title': 'Was it any good?',
  'visitReminder.body':
    'Turn last night’s dish into a Bite. Photo, rating, done.',
  'newBite.title': 'New Bite',
  'newBite.body': '{{author}} just created a new bite',
  'newBite.bodyWithName': '{{author}} just created a new bite: {{bite}}',
  'newFollower.title': 'New Follower!',
  'newFollower.body': '{{follower}} is now following you.',
  'newLike.title': 'New Like on Your Bite!',
  'newLike.body': '{{liker}} liked your Bite "{{bite}}".',
  'newReview.title': 'New Review on Your Bite!',
  'newReview.body': '{{reviewer}} reviewed your Bite "{{bite}}".',
  'newReviewReply.title': 'New reply to a review',
  'newReviewReply.body': '{{replier}} replied to a review of "{{bite}}".',
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
  'newTableOrder.title': '🔔 New order',
  'newTableOrder.body': 'Table {{table}} just ordered.',
  'newTableOrder.bodyWithoutTable': 'A table just ordered.',
  'newVersion.title': '🚀 New version available',
  'newVersion.bodyIos':
    'A new BiteTribe version is ready in the App Store. Update now to get the latest.',
  'newVersion.bodyAndroid':
    'A new BiteTribe version is ready on Google Play. Update now to get the latest.',
  'newUserFollowUp.emailSubject': 'Dishes and foodies picked for you',
  'newUserFollowUp.emailIntro':
    'Welcome to BiteTribe! Here are a few dishes worth trying and a few people worth following.',
  'newUserFollowUp.bitesHeading': 'Dishes worth trying',
  'newUserFollowUp.peopleHeading': 'Foodies worth following',
  'newUserFollowUp.openBite': 'Open Bite',
  'newUserFollowUp.openProfile': 'View profile',
  'newUserFollowUp.footer':
    'You get this email once, because you just joined BiteTribe.',
  'newUserFollowUp.unsubscribeLabel': 'Unsubscribe from BiteTribe emails',
  'emailUnsubscribe.title': 'Unsubscribe from BiteTribe emails',
  'emailUnsubscribe.confirm':
    'BiteTribe will stop sending you emails like this one. Account emails, such as the verification email, still arrive.',
  'emailUnsubscribe.button': 'Unsubscribe',
  'emailUnsubscribe.done':
    'You are unsubscribed. BiteTribe will not send you emails like this one again.',
  'emailUnsubscribe.invalid': 'This unsubscribe link is no longer valid.',
};
