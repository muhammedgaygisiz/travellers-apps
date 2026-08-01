import { NotificationMessages } from '../notification-messages';

/** French copy. Informal "tu", matching the app's locale files. */
export const fr: NotificationMessages = {
  'common.someone': 'Quelqu’un',
  'newBite.title': 'Nouveau Bite',
  'newBite.body': '{{author}} vient de créer un nouveau Bite',
  'newBite.bodyWithName':
    '{{author}} vient de créer un nouveau Bite : {{bite}}',
  'newFollower.title': 'Nouvel abonné !',
  'newFollower.body': '{{follower}} te suit désormais.',
  'newLike.title': 'Nouveau like sur ton Bite !',
  'newLike.body': '{{liker}} a aimé ton Bite « {{bite}} ».',
  'newReview.title': 'Nouvel avis sur ton Bite !',
  'newReview.body': '{{reviewer}} a laissé un avis sur ton Bite « {{bite}} ».',
  'weeklyBites.title': '🍽️ Les Bites de la semaine sont là 🤩',
  'weeklyBites.bodyOne':
    'La BiteTribe a partagé 1 nouveau Bite la semaine dernière',
  'weeklyBites.bodyMany':
    'La BiteTribe a partagé {{count}} nouveaux Bites la semaine dernière',
  'leaderboard.title': 'Classement mis à jour',
  'leaderboard.enteredTop':
    'Tu es entré dans le top {{limit}} à la place n°{{rank}} du classement ! 🎉',
  'leaderboard.droppedOut': 'Tu es sorti du top {{limit}} du classement.',
  'leaderboard.climbed': 'Tu es monté à la place n°{{rank}} du classement ! 🎉',
  'leaderboard.dropped': 'Tu es descendu à la place n°{{rank}} du classement.',
  'countryBadge.title': '🎉 Nouveau badge pays !',
  'countryBadge.body':
    'Bravo ! Tu viens de débloquer le badge pour {{country}}',
  'countryBadge.followerTitle': '🌍 Nouveau badge pays',
  'countryBadge.followerBody':
    '{{user}} vient de débloquer le badge pour {{country}}',
  'newVersion.title': '🚀 Nouvelle version disponible',
  'newVersion.bodyIos':
    'Une nouvelle version de BiteTribe est disponible sur l’App Store. Mets-la à jour dès maintenant.',
  'newVersion.bodyAndroid':
    'Une nouvelle version de BiteTribe est disponible sur Google Play. Mets-la à jour dès maintenant.',
};
