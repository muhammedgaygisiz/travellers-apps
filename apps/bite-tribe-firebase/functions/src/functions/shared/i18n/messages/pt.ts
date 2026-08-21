import { NotificationMessages } from '../notification-messages';

/** Portuguese copy. Informal "tu", matching the app's locale files. */
export const pt: NotificationMessages = {
  'common.someone': 'Alguém',
  'emailVerification.subject': 'Confirma o teu endereço de e-mail BiteTribe',
  'emailVerification.body':
    'Confirma o teu endereço de e-mail para que a tua conta BiteTribe se mantenha segura e possas receber mensagens importantes sobre ela.',
  'emailVerification.linkLabel': 'Confirmar endereço de e-mail',
  'newBite.title': 'Novo Bite',
  'newBite.body': '{{author}} acabou de criar um novo Bite',
  'newBite.bodyWithName': '{{author}} acabou de criar um novo Bite: {{bite}}',
  'newFollower.title': 'Novo seguidor!',
  'newFollower.body': '{{follower}} começou a seguir-te.',
  'newLike.title': 'Nova curtida no teu Bite!',
  'newLike.body': '{{liker}} curtiu o teu Bite «{{bite}}».',
  'newReview.title': 'Nova avaliação no teu Bite!',
  'newReview.body': '{{reviewer}} avaliou o teu Bite «{{bite}}».',
  'newReviewReply.title': 'Nova resposta a uma avaliação',
  'newReviewReply.body': '{{replier}} respondeu a uma avaliação de «{{bite}}».',
  'weeklyBites.title': '🍽️ Os Bites da semana chegaram 🤩',
  'weeklyBites.bodyOne': 'A BiteTribe partilhou 1 novo Bite na semana passada',
  'weeklyBites.bodyMany':
    'A BiteTribe partilhou {{count}} novos Bites na semana passada',
  'leaderboard.title': 'Classificação atualizada',
  'leaderboard.enteredTop':
    'Entraste no top {{limit}} na posição {{rank}} da classificação! 🎉',
  'leaderboard.droppedOut': 'Saíste do top {{limit}} da classificação.',
  'leaderboard.climbed': 'Subiste para a posição {{rank}} da classificação! 🎉',
  'leaderboard.dropped': 'Desceste para a posição {{rank}} da classificação.',
  'countryBadge.title': '🎉 Novo emblema de país!',
  'countryBadge.body': 'Parabéns! Desbloqueaste o emblema de {{country}}',
  'countryBadge.followerTitle': '🌍 Novo emblema de país',
  'countryBadge.followerBody': '{{user}} desbloqueou o emblema de {{country}}',
  'newVersion.title': '🚀 Nova versão disponível',
  'newVersion.bodyIos':
    'Já está disponível uma nova versão do BiteTribe na App Store. Atualiza agora para não perderes nada.',
  'newVersion.bodyAndroid':
    'Já está disponível uma nova versão do BiteTribe no Google Play. Atualiza agora para não perderes nada.',
};
