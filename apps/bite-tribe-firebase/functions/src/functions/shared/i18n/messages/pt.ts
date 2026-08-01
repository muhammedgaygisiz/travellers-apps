import { NotificationMessages } from '../notification-messages';

/** Portuguese copy. Informal "tu", matching the app's locale files. */
export const pt: NotificationMessages = {
  'common.someone': 'Alguém',
  'newBite.title': 'Novo Bite',
  'newBite.body': '{{author}} acabou de criar um novo Bite',
  'newBite.bodyWithName': '{{author}} acabou de criar um novo Bite: {{bite}}',
  'newFollower.title': 'Novo seguidor!',
  'newFollower.body': '{{follower}} começou a seguir-te.',
  'newLike.title': 'Nova curtida no teu Bite!',
  'newLike.body': '{{liker}} curtiu o teu Bite «{{bite}}».',
  'newReview.title': 'Nova avaliação no teu Bite!',
  'newReview.body': '{{reviewer}} avaliou o teu Bite «{{bite}}».',
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
  'newVersion.title': '🚀 Nova versão disponível',
  'newVersion.bodyIos':
    'Já está disponível uma nova versão do BiteTribe na App Store. Atualiza agora para não perderes nada.',
  'newVersion.bodyAndroid':
    'Já está disponível uma nova versão do BiteTribe no Google Play. Atualiza agora para não perderes nada.',
};
