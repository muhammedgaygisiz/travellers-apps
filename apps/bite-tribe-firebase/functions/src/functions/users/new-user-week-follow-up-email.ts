import { SupportedLanguage } from '../shared/i18n/supported-languages';
import { createTranslate } from '../shared/i18n/translate';
import { BITE_TRIBE_ORIGIN } from '../shared/utils/bite-tribe-origin';
import { escapeHtml } from '../shared/utils/render-html';
import { RenderedEmail } from './google-workspace-email';
import { card, unsubscribeUrl } from './new-user-follow-up-email';
import {
  WeekFollowUpBite,
  WeekFollowUpPicks,
} from './new-user-week-follow-up-picks';

/**
 * The campaign every day-7 link carries (GitHub issue #1874).
 *
 * Its own campaign, not the day-1 one, so the web app's GA4 tag attributes a
 * return to the mail that brought it and the two mails can be read apart.
 */
export const WEEK_FOLLOW_UP_CAMPAIGN = 'new_user_week_follow_up';

const WEEK_FOLLOW_UP_QUERY = new URLSearchParams({
  utm_source: 'bitetribe',
  utm_medium: 'email',
  utm_campaign: WEEK_FOLLOW_UP_CAMPAIGN,
}).toString();

export const weekFollowUpBiteUrl = (biteId: string): string =>
  `${BITE_TRIBE_ORIGIN}/bite/${encodeURIComponent(biteId)}?${WEEK_FOLLOW_UP_QUERY}`;

export interface WeekFollowUpEmailParams {
  to: string;
  language: SupportedLanguage;
  picks: WeekFollowUpPicks;
  /** The opt-out token behind this mail's unsubscribe link. */
  unsubscribeToken: string;
}

const subtitleOf = (bite: WeekFollowUpBite): string | undefined =>
  [bite.by, bite.place].filter(Boolean).join(' · ') || undefined;

const section = (
  heading: string,
  bites: WeekFollowUpBite[],
  linkLabel: string,
): string =>
  bites.length
    ? [
        `<h2 style="font-size:18px">${escapeHtml(heading)}</h2>`,
        '<table role="presentation" cellpadding="0" cellspacing="0">',
        ...bites.map((bite) =>
          card(
            bite.imageUrl,
            bite.name,
            subtitleOf(bite),
            weekFollowUpBiteUrl(bite.id),
            linkLabel,
          ),
        ),
        '</table>',
      ].join('')
    : '';

/**
 * Renders the day-7 mail.
 *
 * The followed accounts' Bites come first, with who posted them, because that
 * is what the recipient chose to see; the fallback follows under its own
 * heading. The open and unsubscribe labels are the day-1 mail's, so the two
 * mails read as one voice. Every value from a Bite or a profile is escaped by
 * `card`.
 */
export const renderWeekFollowUpEmail = ({
  to,
  language,
  picks,
  unsubscribeToken,
}: WeekFollowUpEmailParams): RenderedEmail => {
  const translate = createTranslate(language);
  const optOutUrl = unsubscribeUrl(unsubscribeToken);
  const openBite = translate('newUserFollowUp.openBite');

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">',
    `<p>${escapeHtml(translate('newUserWeekFollowUp.emailIntro'))}</p>`,
    section(
      translate('newUserWeekFollowUp.followingHeading'),
      picks.following,
      openBite,
    ),
    section(translate('newUserWeekFollowUp.moreHeading'), picks.more, openBite),
    '<hr style="border:none;border-top:1px solid #ddd;margin:24px 0">',
    `<p style="color:#666;font-size:12px">${escapeHtml(translate('newUserWeekFollowUp.footer'))}`,
    `<br><a href="${escapeHtml(optOutUrl)}">${escapeHtml(translate('newUserFollowUp.unsubscribeLabel'))}</a></p>`,
    '</div>',
  ].join('');

  return {
    to,
    subject: translate('newUserWeekFollowUp.emailSubject'),
    html,
    // RFC 8058 one-click, the same endpoint as the day-1 mail.
    headers: {
      'List-Unsubscribe': `<${optOutUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
};
