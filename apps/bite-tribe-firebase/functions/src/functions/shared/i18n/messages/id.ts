import { NotificationMessages } from '../notification-messages';

/** Indonesian copy. Informal "kamu", matching the app's locale files. */
export const id: NotificationMessages = {
  'common.someone': 'Seseorang',
  'emailVerification.subject': 'Verifikasi alamat email BiteTribe kamu',
  'emailVerification.body':
    'Verifikasi alamat emailmu agar akun BiteTribe kamu tetap aman dan kamu bisa menerima pesan penting tentang akunmu.',
  'emailVerification.linkLabel': 'Verifikasi alamat email',
  'newBite.title': 'Bite baru',
  'newBite.body': '{{author}} baru saja membuat Bite baru',
  'newBite.bodyWithName': '{{author}} baru saja membuat Bite baru: {{bite}}',
  'newFollower.title': 'Pengikut baru!',
  'newFollower.body': '{{follower}} sekarang mengikutimu.',
  'newLike.title': 'Suka baru untuk Bite-mu!',
  'newLike.body': '{{liker}} menyukai Bite-mu "{{bite}}".',
  'newReview.title': 'Ulasan baru untuk Bite-mu!',
  'newReview.body': '{{reviewer}} mengulas Bite-mu "{{bite}}".',
  'newReviewReply.title': 'Balasan baru untuk sebuah ulasan',
  'newReviewReply.body': '{{replier}} membalas ulasan untuk "{{bite}}".',
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
  'countryBadge.title': '🎉 Lencana negara baru!',
  'countryBadge.body': 'Selamat! Kamu membuka lencana {{country}}',
  'countryBadge.followerTitle': '🌍 Lencana negara baru',
  'countryBadge.followerBody': '{{user}} membuka lencana {{country}}',
  'newVersion.title': '🚀 Versi baru tersedia',
  'newVersion.bodyIos':
    'Versi baru BiteTribe sudah ada di App Store. Perbarui sekarang agar tidak ketinggalan.',
  'newVersion.bodyAndroid':
    'Versi baru BiteTribe sudah ada di Google Play. Perbarui sekarang agar tidak ketinggalan.',
};
