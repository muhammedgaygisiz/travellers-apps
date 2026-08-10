import { NotificationMessages } from '../notification-messages';

/** German copy. Informal "du", matching the app's locale files. */
export const de: NotificationMessages = {
  'common.someone': 'Jemand',
  'emailVerification.subject': 'Bestätige deine Bite-Tribe-E-Mail-Adresse',
  'emailVerification.body':
    'Bitte bestätige deine E-Mail-Adresse, damit dein Bite-Tribe-Konto sicher bleibt und du wichtige Nachrichten zu deinem Konto erhältst.',
  'emailVerification.linkLabel': 'E-Mail-Adresse bestätigen',
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
  'newReviewReply.title': 'Neue Antwort auf eine Bewertung',
  'newReviewReply.body':
    '{{replier}} hat auf eine Bewertung von „{{bite}}“ geantwortet.',
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
  'countryBadge.title': '🎉 Neues Länder-Badge!',
  'countryBadge.body':
    'Glückwunsch! Du hast das Badge für {{country}} freigeschaltet',
  'countryBadge.followerTitle': '🌍 Neues Länder-Badge',
  'countryBadge.followerBody':
    '{{user}} hat das Badge für {{country}} freigeschaltet',
  'newVersion.title': '🚀 Neue Version verfügbar',
  'newVersion.bodyIos':
    'Eine neue BiteTribe-Version ist im App Store bereit. Jetzt aktualisieren und nichts verpassen.',
  'newVersion.bodyAndroid':
    'Eine neue BiteTribe-Version ist bei Google Play bereit. Jetzt aktualisieren und nichts verpassen.',
};
