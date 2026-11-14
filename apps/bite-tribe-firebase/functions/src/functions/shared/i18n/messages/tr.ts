import { NotificationMessages } from '../notification-messages';

/** Turkish copy. Informal "sen", matching the app's locale files. */
export const tr: NotificationMessages = {
  'common.someone': 'Birisi',
  'emailVerification.subject': 'BiteTribe e-posta adresini doğrula',
  'emailVerification.body':
    'BiteTribe hesabının güvende kalması ve hesabınla ilgili önemli mesajları alabilmen için lütfen e-posta adresini doğrula.',
  'emailVerification.linkLabel': 'E-posta adresini doğrula',
  'visitSummary.subject': '{{restaurant}} ziyaretin',
  'visitSummary.heading': 'Sipariş ettiklerin',
  'visitSummary.intro':
    '{{date}} tarihindeki {{restaurant}} ziyaretinin özeti.',
  'visitSummary.total': 'Toplam',
  'visitSummary.settled': 'Restoran bunu ödendi olarak işaretledi.',
  'visitSummary.unsettled': 'Restoran bu ziyaret için bir ödeme kaydetmedi.',
  'visitSummary.footnote':
    'Bu, sipariş edilenlerin bir özetidir, fiş değildir. Fişini restorandan alırsın.',
  'visitReminder.title': 'Güzel miydi?',
  'visitReminder.body':
    'Dün akşamki yemeği bir Bite’a dönüştür. Fotoğraf, puan, tamam.',
  'newBite.title': 'Yeni Bite',
  'newBite.body': '{{author}} yeni bir Bite oluşturdu',
  'newBite.bodyWithName': '{{author}} yeni bir Bite oluşturdu: {{bite}}',
  'newFollower.title': 'Yeni takipçi!',
  'newFollower.body': '{{follower}} artık seni takip ediyor.',
  'biteTagged.title': "Bir Bite'ta etiketlendin",
  'biteTagged.body': "{{creator}} seni bir Bite'ta etiketledi: {{bite}}",
  'newLike.title': "Bite'ına yeni beğeni!",
  'newLike.body': '{{liker}}, "{{bite}}" adlı Bite\'ını beğendi.',
  'newReview.title': "Bite'ına yeni yorum!",
  'newReview.body': '{{reviewer}}, "{{bite}}" adlı Bite\'ına yorum yaptı.',
  'newReviewReply.title': 'Bir yoruma yeni yanıt',
  'newReviewReply.body':
    '{{replier}}, "{{bite}}" için yazılan bir yoruma yanıt verdi.',
  'weeklyBites.title': "🍽️ Haftanın Bite'ları burada 🤩",
  'weeklyBites.bodyOne': 'BiteTribe geçen hafta 1 yeni Bite paylaştı',
  'weeklyBites.bodyMany': 'BiteTribe geçen hafta {{count}} yeni Bite paylaştı',
  'leaderboard.title': 'Lider tablosu güncellendi',
  'leaderboard.enteredTop':
    'Lider tablosunda {{rank}}. sıradan ilk {{limit}} arasına girdin! 🎉',
  'leaderboard.droppedOut': 'Lider tablosunda ilk {{limit}} dışına düştün.',
  'leaderboard.climbed': 'Lider tablosunda {{rank}}. sıraya yükseldin! 🎉',
  'leaderboard.dropped': 'Lider tablosunda {{rank}}. sıraya düştün.',
  'leaderboard.mostLikedEnteredTop':
    "{{dish}} Bite'ın en çok beğenilenler ilk {{limit}} listesine #{{rank}} sırasından girdi! 🎉",
  'leaderboard.mostLikedDroppedOut':
    "{{dish}} Bite'ın en çok beğenilenler ilk {{limit}} listesinden çıktı.",
  'leaderboard.mostLikedClimbed':
    "{{dish}} Bite'ın en çok beğenilenlerde #{{rank}} sırasına yükseldi! 🎉",
  'leaderboard.mostLikedDropped':
    "{{dish}} Bite'ın en çok beğenilenlerde #{{rank}} sırasına düştü.",
  'weeklyAward.title': '🏆 Haftanın sonuçları',
  'weeklyAward.bodyMostBites':
    'Tebrikler, haftayı sıralamada #{{place}} olarak bitirdin!',
  'weeklyAward.bodyMostLiked':
    "Tebrikler, Bite'ın haftayı en çok beğenilenlerde #{{place}} olarak bitirdi!",
  'countryBadge.title': '🎉 Yeni ülke rozeti!',
  'countryBadge.body': 'Tebrikler! {{country}} rozetinin kilidini açtın',
  'countryBadge.followerTitle': '🌍 Yeni ülke rozeti',
  'countryBadge.followerBody': '{{user}}, {{country}} rozetinin kilidini açtı',
  'newTableOrder.title': '🔔 Yeni sipariş',
  'newTableOrder.body': '{{table}} numaralı masa sipariş verdi.',
  'newTableOrder.bodyWithoutTable': 'Bir masa sipariş verdi.',
  'newVersion.title': '🚀 Yeni sürüm hazır',
  'newVersion.bodyIos':
    'BiteTribe’ın yeni sürümü App Store’da. Hemen güncelle, hiçbir yeniliği kaçırma.',
  'newVersion.bodyAndroid':
    'BiteTribe’ın yeni sürümü Google Play’de. Hemen güncelle, hiçbir yeniliği kaçırma.',
  'newUserFollowUp.emailSubject': 'Senin için seçilen yemekler ve gurmeler',
  'newUserFollowUp.emailIntro':
    'BiteTribe’a hoş geldin! İşte denemeye değer birkaç yemek ve takip etmeye değer birkaç kişi.',
  'newUserFollowUp.bitesHeading': 'Denemeye değer yemekler',
  'newUserFollowUp.peopleHeading': 'Takip etmeye değer gurmeler',
  'newUserFollowUp.openBite': 'Bite’ı aç',
  'newUserFollowUp.openProfile': 'Profili gör',
  'newUserFollowUp.footer':
    'Bu e-postayı BiteTribe’a yeni katıldığın için bir kez alıyorsun.',
  'newUserFollowUp.unsubscribeLabel': 'BiteTribe e-postalarından çık',
  'newUserWeekFollowUp.emailSubject': 'Bu hafta BiteTribe’da neler var',
  'newUserWeekFollowUp.emailIntro':
    'BiteTribe’a katılalı bir hafta oldu. İşte göz atmaya değer birkaç yeni Bite.',
  'newUserWeekFollowUp.followingHeading': 'Takip ettiğin kişilerden yeni',
  'newUserWeekFollowUp.moreHeading': 'Denemeye değer başka yemekler',
  'newUserWeekFollowUp.footer':
    'Bu e-postayı BiteTribe’a katılmandan bir hafta sonra, bir kez alıyorsun.',
  'newUserMonthFollowUp.emailSubject': 'Bu ay BiteTribe’da kaçırdıkların',
  'newUserMonthFollowUp.emailIntro':
    'BiteTribe’a katılalı bir ay oldu. İşte son haftalardan göz atmaya değer birkaç Bite.',
  'newUserMonthFollowUp.followingHeading': 'Bu ay takip ettiğin kişilerden',
  'newUserMonthFollowUp.moreHeading': 'Denemeye değer başka yemekler',
  'newUserMonthFollowUp.footer':
    'Bu e-postayı BiteTribe’a katılmandan bir ay sonra, bir kez alıyorsun.',
  'emailUnsubscribe.title': 'BiteTribe e-postalarından çık',
  'emailUnsubscribe.confirm':
    'BiteTribe sana artık bunun gibi e-postalar göndermeyecek. Doğrulama gibi hesap e-postaları gelmeye devam eder.',
  'emailUnsubscribe.button': 'Abonelikten çık',
  'emailUnsubscribe.done':
    'Abonelikten çıktın. BiteTribe sana artık bunun gibi e-postalar göndermeyecek.',
  'emailUnsubscribe.invalid':
    'Bu abonelikten çıkma bağlantısı artık geçerli değil.',
};
