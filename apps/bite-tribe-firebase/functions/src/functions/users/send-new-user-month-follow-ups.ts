import { onSchedule } from 'firebase-functions/scheduler';
import { ZURICH_TZ } from '../shared/utils/week-bounds';
import {
  googleWorkspaceEmailSecrets,
  sendGoogleWorkspaceEmail,
} from './google-workspace-email';
import { readFollowUpConfig } from './new-user-follow-up-picks';
import { MONTH_FOLLOW_UP_MAIL } from './new-user-week-follow-up-email';
import {
  MONTH_NEW_BITE_WINDOW_MS,
  NEW_USER_MONTH_FOLLOW_UP_CONFIG_PATH,
  NEW_USER_MONTH_FOLLOW_UPS_COLLECTION,
  readWeekFollowUpConfig,
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
 * One more mail, on day 30, to new users who are not active (GitHub issue
 * #1894).
 *
 * The day-1 (#1707) and day-7 (#1874) mails moved D1 and D7; after day 7
 * nothing reached a new user, and D30 had no lever. This is the day-7 mail a
 * month in: the same run, rules and layout, with three differences.
 *
 * ## Day 30 is a calendar day
 *
 * As with day 7, the run reads the accounts created on the Zurich calendar day
 * thirty days before it, because the digest's `retention-cohorts` counts D30
 * as active on that day.
 *
 * ## Not active means not seen this past week
 *
 * The day-7 mail skips anyone seen since day 2. Here the question is whether
 * the account is active now, not whether it ever came back: an account seen
 * from day 23 on is left alone, and one that came back after the day-7 mail
 * and drifted off again still gets this one.
 *
 * ## A month of Bites, and a fallback none of the earlier mails used
 *
 * The followed accounts' Bites count back 30 days, since the recipient joined.
 * The hand-picked fallback in `config/newUserMonthFollowUp` leaves out every
 * Bite the day-1 and day-7 configs name, so a recipient never sees a fallback
 * pick for the second time.
 */
export const MONTH_FOLLOW_UP: LapsedFollowUp = {
  name: 'month',
  monitorTag: 'Month follow-up monitor',
  signedUpDaysBack: 30,
  // Midnight starting day 23: the last seven days, today included.
  activeFromDaysBack: 7,
  newBiteWindowMs: MONTH_NEW_BITE_WINDOW_MS,
  collection: NEW_USER_MONTH_FOLLOW_UPS_COLLECTION,
  configPath: NEW_USER_MONTH_FOLLOW_UP_CONFIG_PATH,
  earlierBiteIds: async (db) => {
    const [dayOne, daySeven] = await Promise.all([
      readFollowUpConfig(db),
      readWeekFollowUpConfig(db),
    ]);

    return [...dayOne.biteIds, ...daySeven.biteIds];
  },
  mail: MONTH_FOLLOW_UP_MAIL,
};

export const sendNewUserMonthFollowUpsForDay = (
  now: Date = new Date(),
  sendEmail: FollowUpEmailSender = sendGoogleWorkspaceEmail,
): Promise<FollowUpSummary> =>
  sendLapsedFollowUpsForDay(MONTH_FOLLOW_UP, now, sendEmail);

export const sendNewUserMonthFollowUps = onSchedule(
  {
    // The same slot as the day-1 and day-7 mails.
    schedule: '0 18 * * *',
    timeZone: ZURICH_TZ,
    secrets: googleWorkspaceEmailSecrets,
  },
  async (): Promise<void> => {
    await sendNewUserMonthFollowUpsForDay();
  },
);
