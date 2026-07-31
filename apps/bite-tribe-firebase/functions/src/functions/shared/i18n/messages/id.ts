import { NotificationMessages } from '../notification-messages';

/** Indonesian copy. Informal "kamu", matching the app's locale files. */
export const id: NotificationMessages = {
  'common.someone': 'Seseorang',
  'newBite.title': 'Bite baru',
  'newBite.body': '{{author}} baru saja membuat Bite baru',
  'newBite.bodyWithName': '{{author}} baru saja membuat Bite baru: {{bite}}',
  'newFollower.title': 'Pengikut baru!',
  'newFollower.body': '{{follower}} sekarang mengikutimu.',
  'newLike.title': 'Suka baru untuk Bite-mu!',
  'newLike.body': '{{liker}} menyukai Bite-mu "{{bite}}".',
  'newReview.title': 'Ulasan baru untuk Bite-mu!',
  'newReview.body': '{{reviewer}} mengulas Bite-mu "{{bite}}".',
  'weeklyBites.title': '🍽️ Bite minggu ini sudah ada 🤩',
  'weeklyBites.bodyOne': 'BiteTribe membagikan 1 Bite baru minggu lalu',
  'weeklyBites.bodyMany':
    'BiteTribe membagikan {{count}} Bite baru minggu lalu',
  'leaderboard.title': 'Papan peringkat diperbarui',
  'leaderboard.enteredTop':
    'Kamu masuk {{limit}} besar di peringkat {{rank}} papan peringkat! 🎉',
  'leaderboard.droppedOut': 'Kamu keluar dari {{limit}} besar papan peringkat.',
  'leaderboard.climbed':
    'Kamu naik ke peringkat {{rank}} di papan peringkat! 🎉',
  'leaderboard.dropped': 'Kamu turun ke peringkat {{rank}} di papan peringkat.',
};
