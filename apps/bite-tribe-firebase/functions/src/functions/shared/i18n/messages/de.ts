import { NotificationMessages } from '../notification-messages';

/** German copy. Informal "du", matching the app's locale files. */
export const de: NotificationMessages = {
  'common.someone': 'Jemand',
  'newBite.title': 'Neuer Bite',
  'newBite.body': '{{author}} hat gerade einen neuen Bite erstellt',
  'newBite.bodyWithName':
    '{{author}} hat gerade einen neuen Bite erstellt: {{bite}}',
  'newFollower.title': 'Neuer Follower!',
  'newFollower.body': '{{follower}} folgt dir jetzt.',
  'newLike.title': 'Neues Like für deinen Bite!',
  'newLike.body': '{{liker}} gefällt dein Bite „{{bite}}“.',
  'newReview.title': 'Neue Bewertung für deinen Bite!',
  'newReview.body': '{{reviewer}} hat deinen Bite „{{bite}}“ bewertet.',
  'weeklyBites.title': '🍽️ Die Bites der Woche sind da 🤩',
  'weeklyBites.bodyOne':
    'In der BiteTribe wurde letzte Woche 1 neuer Bite geteilt',
  'weeklyBites.bodyMany':
    'In der BiteTribe wurden letzte Woche {{count}} neue Bites geteilt',
  'leaderboard.title': 'Bestenliste aktualisiert',
  'leaderboard.enteredTop':
    'Du bist auf Platz {{rank}} in die Top {{limit}} der Bestenliste eingestiegen! 🎉',
  'leaderboard.droppedOut':
    'Du bist aus den Top {{limit}} der Bestenliste gefallen.',
  'leaderboard.climbed':
    'Du bist auf Platz {{rank}} der Bestenliste geklettert! 🎉',
  'leaderboard.dropped': 'Du bist auf Platz {{rank}} der Bestenliste gefallen.',
};
