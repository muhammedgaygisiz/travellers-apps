import { NotificationMessages } from '../notification-messages';

/** French copy. Informal "tu", matching the app's locale files. */
export const fr: NotificationMessages = {
  'common.someone': 'Quelqu’un',
  'emailVerification.subject': 'Confirme ton adresse e-mail BiteTribe',
  'emailVerification.body':
    'Confirme ton adresse e-mail pour que ton compte BiteTribe reste sécurisé et que tu reçoives les messages importants liés à ton compte.',
  'emailVerification.linkLabel': 'Confirmer l’adresse e-mail',
  'visitSummary.subject': 'Votre visite chez {{restaurant}}',
  'visitSummary.heading': 'Ce que vous avez commandé',
  'visitSummary.intro':
    'Voici un récapitulatif de votre visite chez {{restaurant}} le {{date}}.',
  'visitSummary.total': 'Total',
  'visitSummary.settled': 'Le restaurant a marqué ceci comme réglé.',
  'visitSummary.unsettled':
    "Le restaurant n'a enregistré aucun règlement pour cette visite.",
  'visitSummary.footnote':
    'Ceci est un récapitulatif de ce qui a été commandé, pas une note. Votre reçu vous est remis par le restaurant.',
  'visitReminder.title': "C'était bon ?",
  'visitReminder.body':
    "Transformez le plat d'hier soir en Bite. Photo, note, c'est fait.",
  'newBite.title': 'Nouveau Bite',
  'newBite.body': '{{author}} vient de créer un nouveau Bite',
  'newBite.bodyWithName':
    '{{author}} vient de créer un nouveau Bite : {{bite}}',
  'newFollower.title': 'Quelqu’un te suit !',
  'newFollower.body': '{{follower}} te suit désormais.',
  'biteTagged.title': 'Nouvelle identification dans un Bite',
  'biteTagged.body': '{{creator}} a ajouté ton nom à un Bite : {{bite}}',
  'newLike.title': 'Nouveau like sur ton Bite !',
  'newLike.body': '{{liker}} a aimé ton Bite « {{bite}} ».',
  'newReview.title': 'Nouvel avis sur ton Bite !',
  'newReview.body': '{{reviewer}} a laissé un avis sur ton Bite « {{bite}} ».',
  'newReviewReply.title': 'Nouvelle réponse à un avis',
  'newReviewReply.body': '{{replier}} a répondu à un avis sur « {{bite}} ».',
  'weeklyBites.title': '🍽️ Les Bites de la semaine sont là 🤩',
  'weeklyBites.bodyOne':
    'La BiteTribe a partagé 1 nouveau Bite la semaine dernière',
  'weeklyBites.bodyMany':
    'La BiteTribe a partagé {{count}} nouveaux Bites la semaine dernière',
  'leaderboard.title': 'Classement mis à jour',
  'leaderboard.enteredTop':
    'Te voilà dans le top {{limit}}, à la place n°{{rank}} du classement ! 🎉',
  'leaderboard.droppedOut':
    'Tu ne fais plus partie du top {{limit}} du classement.',
  'leaderboard.climbed': 'Te voilà à la place n°{{rank}} du classement ! 🎉',
  'leaderboard.dropped': 'Tu passes à la place n°{{rank}} du classement.',
  'leaderboard.mostLikedEnteredTop':
    'Ton Bite {{dish}} est entré dans le top {{limit}} des plus aimés à la place #{{rank}} ! 🎉',
  'leaderboard.mostLikedDroppedOut':
    'Ton Bite {{dish}} est sorti du top {{limit}} des plus aimés.',
  'leaderboard.mostLikedClimbed':
    'Ton Bite {{dish}} est monté à la place #{{rank}} des plus aimés ! 🎉',
  'leaderboard.mostLikedDropped':
    'Ton Bite {{dish}} est descendu à la place #{{rank}} des plus aimés.',
  'weeklyAward.title': '🏆 Résultats de la semaine',
  'weeklyAward.bodyMostBites':
    'Bravo, tu as terminé la semaine à la place #{{place}} du classement !',
  'weeklyAward.bodyMostLiked':
    'Bravo, ton Bite a terminé la semaine à la place #{{place}} des plus aimés !',
  'countryBadge.title': '🎉 Nouveau badge pays !',
  'countryBadge.body':
    'Bravo ! Tu viens de débloquer le badge pour {{country}}',
  'countryBadge.followerTitle': '🌍 Nouveau badge pays',
  'countryBadge.followerBody':
    '{{user}} vient de débloquer le badge pour {{country}}',
  'newTableOrder.title': '🔔 Nouvelle commande',
  'newTableOrder.body': 'La table {{table}} vient de commander.',
  'newTableOrder.bodyWithoutTable': 'Une table vient de commander.',
  'newVersion.title': '🚀 Nouvelle version disponible',
  'newVersion.bodyIos':
    'Une nouvelle version de BiteTribe est disponible sur l’App Store. Mets-la à jour dès maintenant.',
  'newVersion.bodyAndroid':
    'Une nouvelle version de BiteTribe est disponible sur Google Play. Mets-la à jour dès maintenant.',
  'newUserFollowUp.emailSubject':
    'Des plats et des foodies sélectionnés pour toi',
  'newUserFollowUp.emailIntro':
    'Bienvenue sur BiteTribe ! Voici quelques plats à essayer et quelques personnes à suivre.',
  'newUserFollowUp.bitesHeading': 'Des plats à essayer',
  'newUserFollowUp.peopleHeading': 'Des foodies à suivre',
  'newUserFollowUp.openBite': 'Ouvrir le Bite',
  'newUserFollowUp.openProfile': 'Voir le profil',
  'newUserFollowUp.footer':
    'Tu reçois cet e-mail une seule fois, car tu viens de rejoindre BiteTribe.',
  'newUserFollowUp.unsubscribeLabel': 'Se désabonner des e-mails BiteTribe',
  'newUserWeekFollowUp.emailSubject':
    'Les nouveautés de la semaine sur BiteTribe',
  'newUserWeekFollowUp.emailIntro':
    'Cela fait une semaine que tu as rejoint BiteTribe. Voici quelques nouveaux Bites à découvrir.',
  'newUserWeekFollowUp.followingHeading':
    'Nouveau chez les personnes que tu suis',
  'newUserWeekFollowUp.moreHeading': 'D’autres plats à essayer',
  'newUserWeekFollowUp.footer':
    'Tu reçois cet e-mail une seule fois, une semaine après avoir rejoint BiteTribe.',
  'newUserMonthFollowUp.emailSubject':
    'Ce que tu as manqué ce mois-ci sur BiteTribe',
  'newUserMonthFollowUp.emailIntro':
    'Cela fait un mois que tu as rejoint BiteTribe. Voici quelques Bites des dernières semaines à découvrir.',
  'newUserMonthFollowUp.followingHeading':
    'Ce mois-ci chez les personnes que tu suis',
  'newUserMonthFollowUp.moreHeading': 'D’autres plats à essayer',
  'newUserMonthFollowUp.footer':
    'Tu reçois cet e-mail une seule fois, un mois après avoir rejoint BiteTribe.',
  'emailUnsubscribe.title': 'Se désabonner des e-mails BiteTribe',
  'emailUnsubscribe.confirm':
    'BiteTribe ne t’enverra plus d’e-mails comme celui-ci. Les e-mails liés à ton compte, comme la vérification, continueront d’arriver.',
  'emailUnsubscribe.button': 'Se désabonner',
  'emailUnsubscribe.done':
    'Désabonnement confirmé. BiteTribe ne t’enverra plus d’e-mails comme celui-ci.',
  'emailUnsubscribe.invalid': 'Ce lien de désabonnement n’est plus valide.',
};
