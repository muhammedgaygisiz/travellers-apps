import { NotificationMessages } from '../notification-messages';

/** Japanese copy. `です/ます`; see `Gender-Neutral Address`. */
export const ja: NotificationMessages = {
  'common.someone': '誰か',
  'emailVerification.subject': 'BiteTribeのメールアドレスを認証してください',
  'emailVerification.body':
    'BiteTribeアカウントを安全に保ち、重要なお知らせを受け取るために、メールアドレスを認証してください。',
  'emailVerification.linkLabel': 'メールアドレスを認証',
  'visitSummary.subject': '{{restaurant}}のご来店記録',
  'visitSummary.heading': 'ご注文内容',
  'visitSummary.intro': '{{date}}の{{restaurant}}でのご来店の概要です。',
  'visitSummary.total': '合計',
  'visitSummary.settled': 'レストランがこのお会計を支払い済みにしました。',
  'visitSummary.unsettled':
    'レストランはこのご来店のお支払いを記録していません。',
  'visitSummary.footnote':
    'これは注文内容の概要であり、領収書ではありません。領収書はレストランが発行します。',
  'visitReminder.title': 'おいしかったですか？',
  'visitReminder.body':
    '昨夜の料理をBiteにしましょう。写真と評価だけで完了です。',
  'newBite.title': '新しいBite',
  'newBite.body': '{{author}}さんが新しいBiteを作成しました',
  'newBite.bodyWithName': '{{author}}さんが新しいBiteを作成しました: {{bite}}',
  'newFollower.title': '新しいフォロワー！',
  'newFollower.body': '{{follower}}さんがあなたをフォローしました。',
  'newLike.title': 'あなたのBiteにいいねが付きました！',
  'newLike.body': '{{liker}}さんがあなたのBite「{{bite}}」にいいねしました。',
  'newReview.title': 'あなたのBiteに新しいレビューが付きました！',
  'newReview.body':
    '{{reviewer}}さんがあなたのBite「{{bite}}」をレビューしました。',
  'newReviewReply.title': 'レビューに新しい返信があります',
  'newReviewReply.body':
    '{{replier}}さんが「{{bite}}」のレビューに返信しました。',
  'weeklyBites.title': '🍽️ 今週のBiteが届きました 🤩',
  'weeklyBites.bodyOne': '先週、BiteTribeで1件の新しいBiteがシェアされました',
  'weeklyBites.bodyMany':
    '先週、BiteTribeで{{count}}件の新しいBiteがシェアされました',
  'leaderboard.title': 'ランキングのお知らせ',
  'leaderboard.enteredTop':
    'ランキングのトップ{{limit}}に{{rank}}位で入りました！🎉',
  'leaderboard.droppedOut': 'ランキングのトップ{{limit}}から外れました。',
  'leaderboard.climbed': 'ランキングで{{rank}}位に上がりました！🎉',
  'leaderboard.dropped': 'ランキングで{{rank}}位に下がりました。',
  'countryBadge.title': '🎉 新しい国のバッジ！',
  'countryBadge.body':
    'おめでとうございます！{{country}}のバッジを獲得しました',
  'countryBadge.followerTitle': '🌍 新しい国のバッジ',
  'countryBadge.followerBody':
    '{{user}}さんが{{country}}のバッジを獲得しました',
  'newTableOrder.title': '🔔 新しい注文',
  'newTableOrder.body': 'テーブル{{table}}から注文が入りました。',
  'newTableOrder.bodyWithoutTable': 'テーブルから注文が入りました。',
  'newVersion.title': '🚀 新しいバージョンがあります',
  'newVersion.bodyIos':
    'App StoreでBiteTribeの新しいバージョンを利用できます。今すぐアップデートしてください。',
  'newVersion.bodyAndroid':
    'Google PlayでBiteTribeの新しいバージョンを利用できます。今すぐアップデートしてください。',
  'newUserFollowUp.emailSubject': 'あなたにおすすめの料理とユーザー',
  'newUserFollowUp.emailIntro':
    'BiteTribeへようこそ！試してみたい料理と、フォローしたいユーザーを集めました。',
  'newUserFollowUp.bitesHeading': '試してみたい料理',
  'newUserFollowUp.peopleHeading': 'フォローしたいユーザー',
  'newUserFollowUp.openBite': 'Biteを開く',
  'newUserFollowUp.openProfile': 'プロフィールを見る',
  'newUserFollowUp.footer':
    'このメールは、BiteTribeに登録された方に一度だけお送りしています。',
  'newUserFollowUp.unsubscribeLabel': 'BiteTribeのメール配信を停止',
  'newUserWeekFollowUp.emailSubject': '今週のBiteTribeの新着情報',
  'newUserWeekFollowUp.emailIntro':
    'BiteTribeに登録してから1週間が経ちました。注目の新しいBiteを集めました。',
  'newUserWeekFollowUp.followingHeading': 'フォロー中のユーザーの新着',
  'newUserWeekFollowUp.moreHeading': 'ほかにも試してみたい料理',
  'newUserWeekFollowUp.footer':
    'このメールは、BiteTribeへの登録から1週間後に一度だけお送りしています。',
  'emailUnsubscribe.title': 'BiteTribeのメール配信を停止',
  'emailUnsubscribe.confirm':
    'BiteTribeからこのようなメールは届かなくなります。認証メールなど、アカウントに関するメールは引き続き届きます。',
  'emailUnsubscribe.button': '配信を停止',
  'emailUnsubscribe.done':
    '配信を停止しました。BiteTribeからこのようなメールをお送りすることはありません。',
  'emailUnsubscribe.invalid': 'この配信停止リンクは無効になりました。',
};
