import { NotificationMessages } from '../notification-messages';

/** Spanish copy. Informal "tú", matching the app's locale files. */
export const es: NotificationMessages = {
  'common.someone': 'Alguien',
  'emailVerification.subject': 'Verifica tu dirección de correo de BiteTribe',
  'emailVerification.body':
    'Verifica tu dirección de correo para que tu cuenta de BiteTribe siga siendo segura y puedas recibir mensajes importantes sobre ella.',
  'emailVerification.linkLabel': 'Verificar dirección de correo',
  'visitSummary.subject': 'Tu visita a {{restaurant}}',
  'visitSummary.heading': 'Lo que pediste',
  'visitSummary.intro':
    'Aquí tienes un resumen de tu visita a {{restaurant}} el {{date}}.',
  'visitSummary.total': 'Total',
  'visitSummary.settled': 'El restaurante ha marcado esto como pagado.',
  'visitSummary.unsettled':
    'El restaurante no ha registrado ningún pago para esta visita.',
  'visitSummary.footnote':
    'Este es un resumen de lo que se pidió, no un recibo. Tu recibo lo da el restaurante.',
  'visitReminder.title': '¿Estaba bueno?',
  'visitReminder.body':
    'Convierte el plato de anoche en un Bite. Foto, valoración, listo.',
  'newBite.title': 'Nuevo Bite',
  'newBite.body': '{{author}} acaba de crear un nuevo Bite',
  'newBite.bodyWithName': '{{author}} acaba de crear un nuevo Bite: {{bite}}',
  'newFollower.title': '¡Alguien nuevo te sigue!',
  'newFollower.body': '{{follower}} ahora te sigue.',
  'biteTagged.title': 'Te etiquetaron en un Bite',
  'biteTagged.body': '{{creator}} te etiquetó en un Bite: {{bite}}',
  'newLike.title': '¡Nuevo me gusta en tu Bite!',
  'newLike.body': 'A {{liker}} le gustó tu Bite «{{bite}}».',
  'newReview.title': '¡Nueva reseña en tu Bite!',
  'newReview.body': '{{reviewer}} ha reseñado tu Bite «{{bite}}».',
  'newReviewReply.title': 'Nueva respuesta a una reseña',
  'newReviewReply.body':
    '{{replier}} ha respondido a una reseña de «{{bite}}».',
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
  'leaderboard.mostLikedEnteredTop':
    '¡Tu Bite {{dish}} entró en el top {{limit}} de los más gustados en el puesto #{{rank}}! 🎉',
  'leaderboard.mostLikedDroppedOut':
    'Tu Bite {{dish}} salió del top {{limit}} de los más gustados.',
  'leaderboard.mostLikedClimbed':
    '¡Tu Bite {{dish}} subió al puesto #{{rank}} de los más gustados! 🎉',
  'leaderboard.mostLikedDropped':
    'Tu Bite {{dish}} bajó al puesto #{{rank}} de los más gustados.',
  'weeklyAward.title': '🏆 Resultados de la semana',
  'weeklyAward.bodyMostBites':
    '¡Enhorabuena, terminaste la semana en el puesto #{{place}} de la clasificación!',
  'weeklyAward.bodyMostLiked':
    '¡Enhorabuena, tu Bite terminó la semana en el puesto #{{place}} de los más gustados!',
  'countryBadge.title': '🎉 ¡Nueva insignia de país!',
  'countryBadge.body':
    '¡Enhorabuena! Has desbloqueado la insignia de {{country}}',
  'countryBadge.followerTitle': '🌍 Nueva insignia de país',
  'countryBadge.followerBody':
    '{{user}} ha desbloqueado la insignia de {{country}}',
  'newTableOrder.title': '🔔 Nuevo pedido',
  'newTableOrder.body': 'La mesa {{table}} acaba de pedir.',
  'newTableOrder.bodyWithoutTable': 'Una mesa acaba de pedir.',
  'newVersion.title': '🚀 Nueva versión disponible',
  'newVersion.bodyIos':
    'Ya está la nueva versión de BiteTribe en la App Store. Actualiza ahora para no perderte nada.',
  'newVersion.bodyAndroid':
    'Ya está la nueva versión de BiteTribe en Google Play. Actualiza ahora para no perderte nada.',
  'newUserFollowUp.emailSubject': 'Platos y foodies seleccionados para ti',
  'newUserFollowUp.emailIntro':
    '¡Te damos la bienvenida a BiteTribe! Aquí tienes algunos platos que vale la pena probar y algunas personas a las que vale la pena seguir.',
  'newUserFollowUp.bitesHeading': 'Platos que vale la pena probar',
  'newUserFollowUp.peopleHeading': 'Foodies a los que vale la pena seguir',
  'newUserFollowUp.openBite': 'Abrir Bite',
  'newUserFollowUp.openProfile': 'Ver perfil',
  'newUserFollowUp.footer':
    'Recibes este correo una sola vez porque acabas de unirte a BiteTribe.',
  'newUserFollowUp.unsubscribeLabel':
    'Darse de baja de los correos de BiteTribe',
  'newUserWeekFollowUp.emailSubject': 'Novedades de esta semana en BiteTribe',
  'newUserWeekFollowUp.emailIntro':
    'Hace una semana que te uniste a BiteTribe. Aquí tienes algunos Bites nuevos que vale la pena ver.',
  'newUserWeekFollowUp.followingHeading':
    'Novedades de las personas que sigues',
  'newUserWeekFollowUp.moreHeading': 'Más platos que vale la pena probar',
  'newUserWeekFollowUp.footer':
    'Recibes este correo una sola vez, una semana después de unirte a BiteTribe.',
  'newUserMonthFollowUp.emailSubject':
    'Lo que te perdiste este mes en BiteTribe',
  'newUserMonthFollowUp.emailIntro':
    'Hace un mes que te uniste a BiteTribe. Aquí tienes algunos Bites de las últimas semanas que vale la pena ver.',
  'newUserMonthFollowUp.followingHeading':
    'Este mes, de las personas que sigues',
  'newUserMonthFollowUp.moreHeading': 'Más platos que vale la pena probar',
  'newUserMonthFollowUp.footer':
    'Recibes este correo una sola vez, un mes después de unirte a BiteTribe.',
  'emailUnsubscribe.title': 'Darse de baja de los correos de BiteTribe',
  'emailUnsubscribe.confirm':
    'BiteTribe dejará de enviarte correos como este. Los correos de tu cuenta, como el de verificación, seguirán llegando.',
  'emailUnsubscribe.button': 'Darse de baja',
  'emailUnsubscribe.done':
    'Te has dado de baja. BiteTribe no volverá a enviarte correos como este.',
  'emailUnsubscribe.invalid': 'Este enlace para darse de baja ya no es válido.',
};
