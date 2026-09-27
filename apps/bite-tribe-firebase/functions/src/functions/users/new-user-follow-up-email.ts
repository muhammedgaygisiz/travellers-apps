import { SupportedLanguage } from '../shared/i18n/supported-languages';
import { createTranslate } from '../shared/i18n/translate';
import { BITE_TRIBE_ORIGIN } from '../shared/utils/bite-tribe-origin';
import { escapeHtml } from '../shared/utils/render-html';
import { RenderedEmail } from './google-workspace-email';
import { FollowUpPicks } from './new-user-follow-up-picks';

/**
 * The campaign every follow-up link carries (GitHub issue #1707).
 *
 * The links open the web app, whose GA4 tag reads the UTM parameters off the
 * landing URL and attributes the session to the campaign. That is the open
 * measurement: no app code reads them.
 */
export const FOLLOW_UP_CAMPAIGN = 'new_user_follow_up';

const FOLLOW_UP_QUERY = new URLSearchParams({
  utm_source: 'bitetribe',
  utm_medium: 'email',
  utm_campaign: FOLLOW_UP_CAMPAIGN,
}).toString();

export const followUpBiteUrl = (biteId: string): string =>
  `${BITE_TRIBE_ORIGIN}/bite/${encodeURIComponent(biteId)}?${FOLLOW_UP_QUERY}`;

export const followUpProfileUrl = (uid: string): string =>
  `${BITE_TRIBE_ORIGIN}/profile/${encodeURIComponent(uid)}?${FOLLOW_UP_QUERY}`;

export const unsubscribeUrl = (token: string): string =>
  `${BITE_TRIBE_ORIGIN}/unsubscribe/${encodeURIComponent(token)}`;

export interface FollowUpEmailParams {
  to: string;
  language: SupportedLanguage;
  picks: FollowUpPicks;
  /** The opt-out token behind this mail's unsubscribe link. */
  unsubscribeToken: string;
}

const card = (
  imageUrl: string | undefined,
  title: string,
  subtitle: string | undefined,
  href: string,
  linkLabel: string,
): string =>
  [
    '<tr><td style="padding:8px 0">',
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    imageUrl
      ? `<td style="padding-right:12px"><img src="${escapeHtml(imageUrl)}" width="64" height="64" alt="" style="border-radius:8px;object-fit:cover"></td>`
      : '',
    '<td>',
    `<strong>${escapeHtml(title)}</strong>`,
    subtitle
      ? `<br><span style="color:#666">${escapeHtml(subtitle)}</span>`
      : '',
    `<br><a href="${escapeHtml(href)}">${escapeHtml(linkLabel)}</a>`,
    '</td></tr></table>',
    '</td></tr>',
  ].join('');

/**
 * Renders the follow-up mail.
 *
 * Every value that comes from a Bite or a profile is escaped: a dish name or a
 * display name is typed by a user and reaches this mail unchanged.
 */
export const renderFollowUpEmail = ({
  to,
  language,
  picks,
  unsubscribeToken,
}: FollowUpEmailParams): RenderedEmail => {
  const translate = createTranslate(language);
  const optOutUrl = unsubscribeUrl(unsubscribeToken);

  const bites = picks.bites.length
    ? [
        `<h2 style="font-size:18px">${escapeHtml(translate('newUserFollowUp.bitesHeading'))}</h2>`,
        '<table role="presentation" cellpadding="0" cellspacing="0">',
        ...picks.bites.map((bite) =>
          card(
            bite.imageUrl,
            bite.name,
            bite.place,
            followUpBiteUrl(bite.id),
            translate('newUserFollowUp.openBite'),
          ),
        ),
        '</table>',
      ].join('')
    : '';

  const people = picks.people.length
    ? [
        `<h2 style="font-size:18px">${escapeHtml(translate('newUserFollowUp.peopleHeading'))}</h2>`,
        '<table role="presentation" cellpadding="0" cellspacing="0">',
        ...picks.people.map((person) =>
          card(
            person.photoUrl,
            person.displayName,
            undefined,
            followUpProfileUrl(person.uid),
            translate('newUserFollowUp.openProfile'),
          ),
        ),
        '</table>',
      ].join('')
    : '';

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">',
    `<p>${escapeHtml(translate('newUserFollowUp.emailIntro'))}</p>`,
    bites,
    people,
    '<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">',
    `<p style="color:#666;font-size:12px">${escapeHtml(translate('newUserFollowUp.footer'))}`,
    `<br><a href="${escapeHtml(optOutUrl)}">${escapeHtml(translate('newUserFollowUp.unsubscribeLabel'))}</a></p>`,
    '</div>',
  ].join('');

  return {
    to,
    subject: translate('newUserFollowUp.emailSubject'),
    html,
    // RFC 8058 one-click: the mail client POSTs to the same URL the footer
    // links to, which is what the unsubscribe endpoint acts on.
    headers: {
      'List-Unsubscribe': `<${optOutUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
};
