import { NotificationMessages } from '../notification-messages';

/** Turkish copy. Informal "sen", matching the app's locale files. */
export const tr: NotificationMessages = {
  'common.someone': 'Birisi',
  'newBite.title': 'Yeni Bite',
  'newBite.body': '{{author}} yeni bir Bite oluşturdu',
  'newBite.bodyWithName': '{{author}} yeni bir Bite oluşturdu: {{bite}}',
  'newFollower.title': 'Yeni takipçi!',
  'newFollower.body': '{{follower}} artık seni takip ediyor.',
  'newLike.title': "Bite'ına yeni beğeni!",
  'newLike.body': '{{liker}}, "{{bite}}" adlı Bite\'ını beğendi.',
  'newReview.title': "Bite'ına yeni yorum!",
  'newReview.body': '{{reviewer}}, "{{bite}}" adlı Bite\'ına yorum yaptı.',
  'weeklyBites.title': "🍽️ Haftanın Bite'ları burada 🤩",
  'weeklyBites.bodyOne': 'BiteTribe geçen hafta 1 yeni Bite paylaştı',
  'weeklyBites.bodyMany': 'BiteTribe geçen hafta {{count}} yeni Bite paylaştı',
  'leaderboard.title': 'Lider tablosu güncellendi',
  'leaderboard.enteredTop':
    'Lider tablosunda {{rank}}. sıradan ilk {{limit}} arasına girdin! 🎉',
  'leaderboard.droppedOut': 'Lider tablosunda ilk {{limit}} dışına düştün.',
  'leaderboard.climbed': 'Lider tablosunda {{rank}}. sıraya yükseldin! 🎉',
  'leaderboard.dropped': 'Lider tablosunda {{rank}}. sıraya düştün.',
  'newVersion.title': '🚀 Yeni sürüm hazır',
  'newVersion.bodyIos':
    'BiteTribe’ın yeni sürümü App Store’da. Hemen güncelle, hiçbir yeniliği kaçırma.',
  'newVersion.bodyAndroid':
    'BiteTribe’ın yeni sürümü Google Play’de. Hemen güncelle, hiçbir yeniliği kaçırma.',
};
