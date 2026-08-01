import { NotificationMessages } from '../notification-messages';

/** Italian copy. Informal "tu", matching the app's locale files. */
export const it: NotificationMessages = {
  'common.someone': 'Qualcuno',
  'newBite.title': 'Nuovo Bite',
  'newBite.body': '{{author}} ha appena creato un nuovo Bite',
  'newBite.bodyWithName': '{{author}} ha appena creato un nuovo Bite: {{bite}}',
  'newFollower.title': 'Nuovo follower!',
  'newFollower.body': '{{follower}} ha iniziato a seguirti.',
  'newLike.title': 'Nuovo like sul tuo Bite!',
  'newLike.body': 'A {{liker}} piace il tuo Bite «{{bite}}».',
  'newReview.title': 'Nuova recensione sul tuo Bite!',
  'newReview.body': '{{reviewer}} ha recensito il tuo Bite «{{bite}}».',
  'weeklyBites.title': '🍽️ I Bites della settimana sono arrivati 🤩',
  'weeklyBites.bodyOne':
    'La BiteTribe ha condiviso 1 nuovo Bite la scorsa settimana',
  'weeklyBites.bodyMany':
    'La BiteTribe ha condiviso {{count}} nuovi Bites la scorsa settimana',
  'leaderboard.title': 'Classifica aggiornata',
  'leaderboard.enteredTop':
    'Sei entrato nella top {{limit}} in posizione {{rank}} della classifica! 🎉',
  'leaderboard.droppedOut': 'Sei uscito dalla top {{limit}} della classifica.',
  'leaderboard.climbed':
    'Sei salito alla posizione {{rank}} della classifica! 🎉',
  'leaderboard.dropped': 'Sei sceso alla posizione {{rank}} della classifica.',
  'countryBadge.title': '🎉 Nuovo badge Paese!',
  'countryBadge.body': 'Complimenti! Hai sbloccato il badge di {{country}}',
  'countryBadge.followerTitle': '🌍 Nuovo badge Paese',
  'countryBadge.followerBody': '{{user}} ha sbloccato il badge di {{country}}',
  'newVersion.title': '🚀 Nuova versione disponibile',
  'newVersion.bodyIos':
    'La nuova versione di BiteTribe è nell’App Store. Aggiorna ora per non perderti nulla.',
  'newVersion.bodyAndroid':
    'La nuova versione di BiteTribe è su Google Play. Aggiorna ora per non perderti nulla.',
};
