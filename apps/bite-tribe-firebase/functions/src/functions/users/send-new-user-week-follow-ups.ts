import { getAuth, UserRecord } from 'firebase-admin/auth';
import {
  DocumentData,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import { buildChunks } from '../shared/utils/build-chunks';
import { getUserLanguage } from '../shared/utils/get-user-language';
import { toMidnightZurich, ZURICH_TZ } from '../shared/utils/week-bounds';
import { createOptOutToken, hasOptedOutOfProductEmails } from './email-opt-out';
import {
  googleWorkspaceEmailSecrets,
  sendGoogleWorkspaceEmail,
} from './google-workspace-email';
import { readFollowUpConfig } from './new-user-follow-up-picks';
import { renderWeekFollowUpEmail } from './new-user-week-follow-up-email';
import {
  FallbackBite,
  hasWeekPicks,
  NEW_BITE_WINDOW_MS,
  NEW_USER_WEEK_FOLLOW_UPS_COLLECTION,
  newBitesFromFollowing,
  readWeekFollowUpConfig,
  resolveFallbackBites,
  weekPicksFor,
} from './new-user-week-follow-up-picks';
import {
  FollowUpEmailSender,
  FollowUpSummary,
  isAlreadyExists,
  isReachable,
  MAX_FOLLOW_UPS_PER_RUN,
  summaryLine,
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
 * day-1 mail; see `send-new-user-follow-ups.ts`.
 */

/** `getUsers` accepts at most this many identifiers per call. */
const AUTH_LOOKUP_LIMIT = 100;

/**
 * Midnight Europe/Zurich of the calendar day `offsetDays` from `now`'s Zurich
 * date, in Unix ms.
 */
const zurichMidnight = (now: Date, offsetDays: number): number => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZURICH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(now)
    .split('-')
    .map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + offsetDays));

  return toMidnightZurich(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    target.getUTCDate(),
  );
};

/**
 * The sign-up day the run mails, and the moment from which a visit counts as
 * coming back: the start of day 2.
 */
export const weekFollowUpWindow = (
  now: Date,
): { start: number; end: number; returnedFrom: number } => ({
  start: zurichMidnight(now, -7),
  end: zurichMidnight(now, -6),
  returnedFrom: zurichMidnight(now, -5),
});

/** Whether the account was seen from `returnedFrom` on. */
export const hasReturned = (
  profile: DocumentData,
  authUser: UserRecord,
  returnedFrom: number,
): boolean => {
  const lastSeen = profile['lastSeenTimestamp'];
  const lastRefresh = Date.parse(authUser.metadata?.lastRefreshTime ?? '');

  return (
    (typeof lastSeen === 'number' && lastSeen >= returnedFrom) ||
    (!Number.isNaN(lastRefresh) && lastRefresh >= returnedFrom)
  );
};

const claim = async (
  db: Firestore,
  uid: string,
  now: Date,
): Promise<boolean> => {
  try {
    await db
      .collection(NEW_USER_WEEK_FOLLOW_UPS_COLLECTION)
      .doc(uid)
      .create({ status: 'claimed', claimedAt: now.toISOString() });

    return true;
  } catch (error) {
    if (isAlreadyExists(error)) {
      return false;
    }

    throw error;
  }
};

/**
 * Sends the operator copy of this run to every monitor account: the mail a
 * recipient who follows nobody would get, or an alert when the fallback
 * resolves to nothing, because then such a recipient gets no mail at all.
 */
const sendMonitorCopies = async (
  db: Firestore,
  monitorUids: string[],
  fallback: FallbackBite[],
  summary: FollowUpSummary,
  now: Date,
  sendEmail: FollowUpEmailSender,
): Promise<void> => {
  if (monitorUids.length === 0) {
    return;
  }

  const { users } = await getAuth().getUsers(
    monitorUids.map((uid) => ({ uid })),
  );

  for (const monitor of users) {
    if (!isReachable(monitor)) {
      logger.warn('new user week follow-up monitor is not reachable', {
        uid: monitor.uid,
      });
      continue;
    }

    try {
      const status = summaryLine(summary);
      // Rendered for nobody in particular: a monitor who curated the
      // fallback still sees the Bites a new user gets.
      const picks = weekPicksFor('', [], fallback);

      if (!hasWeekPicks(picks)) {
        await sendEmail({
          to: monitor.email,
          subject: `[Week follow-up monitor] ${status} - no fallback resolved`,
          html: `<p>No Bite in <code>config/newUserWeekFollowUp</code> resolved on ${now.toISOString()}, so a new user whose followed accounts posted nothing got no mail. Check that the Bites still exist, are listable, and were not shown in the day-1 mail.</p>`,
        });
      } else {
        const [language, unsubscribeToken] = await Promise.all([
          getUserLanguage(monitor.uid),
          createOptOutToken(db, monitor.uid, now),
        ]);
        const email = renderWeekFollowUpEmail({
          to: monitor.email,
          language,
          picks,
          unsubscribeToken,
        });

        await sendEmail({
          ...email,
          subject: `[Week follow-up monitor] ${status} - ${email.subject}`,
        });
      }

      summary.monitored += 1;
    } catch (error) {
      logger.warn('new user week follow-up monitor copy failed', {
        uid: monitor.uid,
        error,
      });
    }
  }
};

export const sendNewUserWeekFollowUpsForDay = async (
  now: Date = new Date(),
  sendEmail: FollowUpEmailSender = sendGoogleWorkspaceEmail,
): Promise<FollowUpSummary> => {
  const db = getFirestore();
  const summary: FollowUpSummary = {
    candidates: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    monitored: 0,
  };

  const [config, dayOneConfig] = await Promise.all([
    readWeekFollowUpConfig(db),
    readFollowUpConfig(db),
  ]);
  const fallback = await resolveFallbackBites(
    db,
    config.biteIds,
    dayOneConfig.biteIds,
  );

  if (fallback.length === 0) {
    logger.warn('new user week follow-up has no fallback to show');
  }

  const { start, end, returnedFrom } = weekFollowUpWindow(now);
  const created = await db
    .collection('users')
    .where('createdAtTimestamp', '>=', start)
    .where('createdAtTimestamp', '<', end)
    .orderBy('createdAtTimestamp', 'asc')
    .limit(MAX_FOLLOW_UPS_PER_RUN)
    .get();

  summary.candidates = created.size;

  const profiles = new Map(
    created.docs.map((document) => [document.id, document.data()]),
  );

  for (const chunk of buildChunks([...profiles.keys()], AUTH_LOOKUP_LIMIT)) {
    const { users } = await getAuth().getUsers(chunk.map((uid) => ({ uid })));
    const authUsers = new Map(users.map((user) => [user.uid, user]));

    for (const uid of chunk) {
      const authUser = authUsers.get(uid);

      if (
        !isReachable(authUser) ||
        hasReturned(profiles.get(uid) ?? {}, authUser, returnedFrom) ||
        (await hasOptedOutOfProductEmails(db, uid))
      ) {
        summary.skipped += 1;
        continue;
      }

      const picks = weekPicksFor(
        uid,
        await newBitesFromFollowing(
          db,
          uid,
          now.getTime() - NEW_BITE_WINDOW_MS,
        ),
        fallback,
      );

      if (!hasWeekPicks(picks) || !(await claim(db, uid, now))) {
        summary.skipped += 1;
        continue;
      }

      const record = db
        .collection(NEW_USER_WEEK_FOLLOW_UPS_COLLECTION)
        .doc(uid);

      try {
        const [language, unsubscribeToken] = await Promise.all([
          getUserLanguage(uid),
          createOptOutToken(db, uid, now),
        ]);

        await sendEmail(
          renderWeekFollowUpEmail({
            to: authUser.email,
            language,
            picks,
            unsubscribeToken,
          }),
        );

        await record.update({ status: 'sent', sentAt: now.toISOString() });
        summary.sent += 1;
        logger.info('new user week follow-up sent', {
          uid,
          following: picks.following.length,
        });
      } catch (error) {
        summary.failed += 1;
        await record.update({ status: 'failed' }).catch(() => undefined);
        logger.warn('new user week follow-up failed', { uid, error });
      }
    }
  }

  await sendMonitorCopies(
    db,
    config.monitorUids,
    fallback,
    summary,
    now,
    sendEmail,
  );

  logger.info('new user week follow-up run finished', summary);

  return summary;
};

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
