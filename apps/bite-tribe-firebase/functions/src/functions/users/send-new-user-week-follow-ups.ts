import { onSchedule } from 'firebase-functions/scheduler';
import { ZURICH_TZ } from '../shared/utils/week-bounds';
import {
  googleWorkspaceEmailSecrets,
  sendGoogleWorkspaceEmail,
} from './google-workspace-email';
import { readFollowUpConfig } from './new-user-follow-up-picks';
import { WEEK_FOLLOW_UP_MAIL } from './new-user-week-follow-up-email';
import {
  NEW_BITE_WINDOW_MS,
  NEW_USER_WEEK_FOLLOW_UP_CONFIG_PATH,
  NEW_USER_WEEK_FOLLOW_UPS_COLLECTION,
} from './new-user-week-follow-up-picks';
import {
  LapsedFollowUp,
  sendLapsedFollowUpsForDay,
} from './send-lapsed-new-user-follow-ups';
import {
  FollowUpEmailSender,
  FollowUpSummary,
} from './send-new-user-follow-ups';

/**
 * One more mail, on day 7, to new users who did not come back (GitHub issue
 * #1874).
 *
 * The day-1 mail (#1707) gives a new account a reason to return the next day;
 * nothing did after that. This one reaches the people who drifted off after
 * day 1 with what the accounts they follow posted that week.
 *
 * ## Day 7 is a calendar day
 *
 * The digest counts D7 as active on the seventh Europe/Zurich calendar day
 * after arrival, so the run reads the accounts created on the Zurich day seven
 * days before it, not those 6-7 x 24 hours old: a sign-up in the morning would
 * otherwise be mailed on day 6, and a return that evening would count for
 * nothing. A late scheduler still reads the same day, so there is no gap
 * between runs, and the claim stops a second run that day from sending twice.
 * The run is in the same 18:00 slot as the day-1 mail.
 *
 * ## Only the ones who did not come back
 *
 * An account seen from day 2 on is left alone: it came back, and a mail asking
 * it to would be noise. Seen is the profile's `lastSeenTimestamp`, which the
 * app writes at most once a day, or Firebase Auth's `lastRefreshTime`, which
 * moves while a session is open and catches a client that never wrote the
 * first. Day 1 itself does not count: it is the day the day-1 mail asks for.
 * The other rules are the day-1 mail's: a verified address on an enabled
 * account with a provider, and no opt-out of product mail.
 *
 * ## Content
 *
 * Up to three listable Bites the recipient's followed public accounts posted
 * in the last seven days, newest first, with the hand-picked fallback in
 * `config/newUserWeekFollowUp` filling the places left. The fallback leaves out
 * what the day-1 mail showed and the recipient's own Bites. A recipient with
 * nothing to show is skipped without a claim.
 *
 * The claim, the opt-out, the monitor copy and the summary work as in the
 * day-1 mail; see `send-new-user-follow-ups.ts`. The run itself is shared
 * with the day-30 mail in `send-lapsed-new-user-follow-ups.ts`.
 */

export const WEEK_FOLLOW_UP: LapsedFollowUp = {
  name: 'week',
  monitorTag: 'Week follow-up monitor',
  signedUpDaysBack: 7,
  // Midnight starting day 2: day 1 is the day the day-1 mail asks for.
  activeFromDaysBack: 5,
  newBiteWindowMs: NEW_BITE_WINDOW_MS,
  collection: NEW_USER_WEEK_FOLLOW_UPS_COLLECTION,
  configPath: NEW_USER_WEEK_FOLLOW_UP_CONFIG_PATH,
  earlierBiteIds: async (db) => (await readFollowUpConfig(db)).biteIds,
  mail: WEEK_FOLLOW_UP_MAIL,
};

export const sendNewUserWeekFollowUpsForDay = (
  now: Date = new Date(),
  sendEmail: FollowUpEmailSender = sendGoogleWorkspaceEmail,
): Promise<FollowUpSummary> =>
  sendLapsedFollowUpsForDay(WEEK_FOLLOW_UP, now, sendEmail);

export const sendNewUserWeekFollowUps = onSchedule(
  {
    // The same slot as the day-1 mail: early evening, when people decide
    // where to eat.
    schedule: '0 18 * * *',
    timeZone: ZURICH_TZ,
    secrets: googleWorkspaceEmailSecrets,
  },
  async (): Promise<void> => {
    await sendNewUserWeekFollowUpsForDay();
  },
);
