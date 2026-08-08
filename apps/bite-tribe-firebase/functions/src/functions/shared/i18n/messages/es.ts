import { NotificationMessages } from '../notification-messages';

/** Spanish copy. Informal "tú", matching the app's locale files. */
export const es: NotificationMessages = {
  'common.someone': 'Alguien',
  'emailVerification.subject': 'Verifica tu dirección de correo de Bite Tribe',
  'emailVerification.body':
    'Verifica tu dirección de correo para que tu cuenta de Bite Tribe siga siendo segura y puedas recibir mensajes importantes sobre ella.',
  'emailVerification.linkLabel': 'Verificar dirección de correo',
  'newBite.title': 'Nuevo Bite',
  'newBite.body': '{{author}} acaba de crear un nuevo Bite',
  'newBite.bodyWithName': '{{author}} acaba de crear un nuevo Bite: {{bite}}',
  'newFollower.title': '¡Nuevo seguidor!',
  'newFollower.body': '{{follower}} ahora te sigue.',
  'newLike.title': '¡Nuevo me gusta en tu Bite!',
  'newLike.body': 'A {{liker}} le gustó tu Bite «{{bite}}».',
  'newReview.title': '¡Nueva reseña en tu Bite!',
  'newReview.body': '{{reviewer}} ha reseñado tu Bite «{{bite}}».',
  'weeklyBites.title': '🍽️ Los Bites de la semana ya están aquí 🤩',
  'weeklyBites.bodyOne': 'La BiteTribe compartió 1 Bite nuevo la semana pasada',
  'weeklyBites.bodyMany':
    'La BiteTribe compartió {{count}} Bites nuevos la semana pasada',
  'leaderboard.title': 'Clasificación actualizada',
  'leaderboard.enteredTop':
    '¡Has entrado en el top {{limit}} en el puesto n.º {{rank}} de la clasificación! 🎉',
  'leaderboard.droppedOut': 'Has salido del top {{limit}} de la clasificación.',
  'leaderboard.climbed':
    '¡Has subido al puesto n.º {{rank}} de la clasificación! 🎉',
  'leaderboard.dropped':
    'Has bajado al puesto n.º {{rank}} de la clasificación.',
  'countryBadge.title': '🎉 ¡Nueva insignia de país!',
  'countryBadge.body':
    '¡Enhorabuena! Has desbloqueado la insignia de {{country}}',
  'countryBadge.followerTitle': '🌍 Nueva insignia de país',
  'countryBadge.followerBody':
    '{{user}} ha desbloqueado la insignia de {{country}}',
  'newVersion.title': '🚀 Nueva versión disponible',
  'newVersion.bodyIos':
    'Ya está la nueva versión de BiteTribe en la App Store. Actualiza ahora para no perderte nada.',
  'newVersion.bodyAndroid':
    'Ya está la nueva versión de BiteTribe en Google Play. Actualiza ahora para no perderte nada.',
};
