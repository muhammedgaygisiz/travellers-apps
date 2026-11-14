import { NotificationMessages } from '../notification-messages';

/** Korean copy. Polite `해요체`; see `Gender-Neutral Address`. */
export const ko: NotificationMessages = {
  'common.someone': '누군가',
  'emailVerification.subject': 'BiteTribe 이메일 주소를 인증해 주세요',
  'emailVerification.body':
    'BiteTribe 계정을 안전하게 지키고 중요한 계정 메시지를 받을 수 있도록 이메일 주소를 인증해 주세요.',
  'emailVerification.linkLabel': '이메일 주소 인증',
  'visitSummary.subject': '{{restaurant}} 방문 내역',
  'visitSummary.heading': '주문 내역',
  'visitSummary.intro': '{{date}} {{restaurant}} 방문 요약이에요.',
  'visitSummary.total': '합계',
  'visitSummary.settled': '식당에서 결제 완료로 표시했어요.',
  'visitSummary.unsettled': '식당에서 이번 방문의 결제를 기록하지 않았어요.',
  'visitSummary.footnote':
    '이것은 주문 내역 요약이며 영수증이 아니에요. 영수증은 식당에서 발급해요.',
  'visitReminder.title': '맛있었나요?',
  'visitReminder.body': '어젯밤 식사를 Bite로 남겨 보세요. 사진과 평점이면 끝.',
  'newBite.title': '새 Bite',
  'newBite.body': '{{author}}님이 새 Bite를 만들었어요',
  'newBite.bodyWithName': '{{author}}님이 새 Bite를 만들었어요: {{bite}}',
  'newFollower.title': '새 팔로워!',
  'newFollower.body': '{{follower}}님이 나를 팔로우해요',
  'biteTagged.title': 'Bite에 태그되었어요',
  'biteTagged.body': '{{creator}}님이 Bite에 나를 태그했어요: {{bite}}',
  'newLike.title': '누군가 내 Bite를 좋아해요!',
  'newLike.body': '{{liker}}님이 내 Bite를 좋아해요: "{{bite}}"',
  'newReview.title': '내 Bite에 새 리뷰가 달렸어요!',
  'newReview.body': '{{reviewer}}님이 내 Bite에 리뷰를 남겼어요: "{{bite}}"',
  'newReviewReply.title': '리뷰에 새 답글이 달렸어요',
  'newReviewReply.body': '{{replier}}님이 리뷰에 답글을 남겼어요: "{{bite}}"',
  'weeklyBites.title': '🍽️ 이번 주의 Bite가 도착했어요 🤩',
  'weeklyBites.bodyOne': '지난주 BiteTribe에 새 Bite 1개가 공유됐어요.',
  'weeklyBites.bodyMany':
    '지난주 BiteTribe에 새 Bite {{count}}개가 공유됐어요.',
  'leaderboard.title': '순위표 소식',
  'leaderboard.enteredTop':
    '순위표 상위 {{limit}}위 안에 들었어요! 현재 {{rank}}위예요 🎉',
  'leaderboard.droppedOut': '순위표 상위 {{limit}}위 밖으로 밀려났어요',
  'leaderboard.climbed': '순위표에서 {{rank}}위로 올라갔어요! 🎉',
  'leaderboard.dropped': '순위표에서 {{rank}}위로 내려갔어요',
  'leaderboard.mostLikedEnteredTop':
    '회원님의 Bite {{dish}}이(가) 좋아요 상위 {{limit}}위에 {{rank}}위로 진입했어요! 🎉',
  'leaderboard.mostLikedDroppedOut':
    '회원님의 Bite {{dish}}이(가) 좋아요 상위 {{limit}}위에서 밀려났어요.',
  'leaderboard.mostLikedClimbed':
    '회원님의 Bite {{dish}}이(가) 좋아요 순위 {{rank}}위로 올랐어요! 🎉',
  'leaderboard.mostLikedDropped':
    '회원님의 Bite {{dish}}이(가) 좋아요 순위 {{rank}}위로 내려갔어요.',
  'weeklyAward.title': '🏆 이번 주 결과',
  'weeklyAward.bodyMostBites':
    '축하해요, 이번 주 순위표에서 {{place}}위로 마무리했어요!',
  'weeklyAward.bodyMostLiked':
    '축하해요, 회원님의 Bite가 이번 주 좋아요 순위 {{place}}위로 마무리했어요!',
  'countryBadge.title': '🎉 새 국가 배지!',
  'countryBadge.body': '축하해요! 새 배지를 받았어요: {{country}}',
  'countryBadge.followerTitle': '🌍 새 국가 배지',
  'countryBadge.followerBody': '{{user}}님이 새 배지를 받았어요: {{country}}',
  'newTableOrder.title': '🔔 새 주문',
  'newTableOrder.body': '테이블 {{table}}에서 방금 주문했어요',
  'newTableOrder.bodyWithoutTable': '테이블에서 방금 주문했어요',
  'newVersion.title': '🚀 새 버전이 나왔어요',
  'newVersion.bodyIos':
    'App Store에서 BiteTribe 새 버전을 받을 수 있어요. 지금 업데이트하고 새로운 기능을 만나 보세요.',
  'newVersion.bodyAndroid':
    'Google Play에서 BiteTribe 새 버전을 받을 수 있어요. 지금 업데이트하고 새로운 기능을 만나 보세요.',
  'newUserFollowUp.emailSubject': '내 입맛에 맞을 메뉴와 미식가들',
  'newUserFollowUp.emailIntro':
    'BiteTribe에 오신 것을 환영해요! 먹어 볼 만한 메뉴와 팔로우할 만한 사람들을 모았어요.',
  'newUserFollowUp.bitesHeading': '먹어 볼 만한 메뉴',
  'newUserFollowUp.peopleHeading': '팔로우할 만한 미식가',
  'newUserFollowUp.openBite': 'Bite 열기',
  'newUserFollowUp.openProfile': '프로필 보기',
  'newUserFollowUp.footer':
    'BiteTribe에 가입해 주셔서 이 이메일을 한 번만 보내 드려요.',
  'newUserFollowUp.unsubscribeLabel': 'BiteTribe 이메일 수신 거부',
  'newUserWeekFollowUp.emailSubject': '이번 주 BiteTribe 새 소식',
  'newUserWeekFollowUp.emailIntro':
    'BiteTribe에 가입한 지 일주일이 됐어요. 볼 만한 새 Bite를 모았어요.',
  'newUserWeekFollowUp.followingHeading': '내가 팔로우하는 사람들의 새 소식',
  'newUserWeekFollowUp.moreHeading': '더 먹어 볼 만한 메뉴',
  'newUserWeekFollowUp.footer':
    'BiteTribe 가입 일주일 후에 이 이메일을 한 번만 보내 드려요.',
  'newUserMonthFollowUp.emailSubject': '이번 달 BiteTribe에서 놓친 소식',
  'newUserMonthFollowUp.emailIntro':
    'BiteTribe에 가입한 지 한 달이 됐어요. 지난 몇 주 동안 올라온 볼 만한 Bite를 모았어요.',
  'newUserMonthFollowUp.followingHeading':
    '이번 달 내가 팔로우하는 사람들의 소식',
  'newUserMonthFollowUp.moreHeading': '더 먹어 볼 만한 메뉴',
  'newUserMonthFollowUp.footer':
    'BiteTribe 가입 한 달 후에 이 이메일을 한 번만 보내 드려요.',
  'emailUnsubscribe.title': 'BiteTribe 이메일 수신 거부',
  'emailUnsubscribe.confirm':
    'BiteTribe에서 이런 이메일을 더 이상 보내지 않아요. 인증 메일 같은 계정 관련 이메일은 계속 받게 돼요.',
  'emailUnsubscribe.button': '수신 거부',
  'emailUnsubscribe.done':
    '수신 거부가 완료됐어요. BiteTribe에서 이런 이메일을 더 이상 보내지 않아요.',
  'emailUnsubscribe.invalid': '이 수신 거부 링크는 더 이상 유효하지 않아요.',
};
