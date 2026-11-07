import { getAuth, UserRecord } from 'firebase-admin/auth';
import {
  DocumentData,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { buildChunks } from '../shared/utils/build-chunks';
import { getUserLanguage } from '../shared/utils/get-user-language';
import { toMidnightZurich, ZURICH_TZ } from '../shared/utils/week-bounds';
import { createOptOutToken, hasOptedOutOfProductEmails } from './email-opt-out';
import { sendGoogleWorkspaceEmail } from './google-workspace-email';
import {
  LapsedFollowUpMail,
  renderWeekFollowUpEmail,
} from './new-user-week-follow-up-email';
import {
  FallbackBite,
  hasWeekPicks,
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
 * The run behind the later follow-up mails to new users who are not active:
 * day 7 (GitHub issue #1874) and day 30 (#1894).
 *
 * Both read the accounts created on one Europe/Zurich calendar day, skip the
 * ones seen since a given day, show what their followed accounts posted with a
 * hand-picked fallback, and claim each account once. A {@link LapsedFollowUp}
 * says which day, which window and which records; the rest is shared. Why each
 * rule is what it is lives with the day-7 mail in
 * `send-new-user-week-follow-ups.ts`.
 */
export interface LapsedFollowUp {
  /** `week` or `month`, in the log lines. */
  name: string;
  /** The tag in front of the operator copy's subject. */
  monitorTag: string;
  /** The mail goes to accounts created this many Zurich days before the run. */
  signedUpDaysBack: number;
  /** A visit from midnight this many Zurich days before the run on is active. */
  activeFromDaysBack: number;
  /** How far back a followed account's Bite still counts as new. */
  newBiteWindowMs: number;
  /** The once-per-account claim. */
  collection: string;
  /** The fallback and monitor config. */
  configPath: string;
  /** The Bites earlier mails showed, left out of the fallback. */
  earlierBiteIds: (db: Firestore) => Promise<string[]>;
  mail: LapsedFollowUpMail;
}

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
 * being active.
 */
export const followUpWindow = (
  now: Date,
  followUp: Pick<LapsedFollowUp, 'signedUpDaysBack' | 'activeFromDaysBack'>,
): { start: number; end: number; returnedFrom: number } => ({
  start: zurichMidnight(now, -followUp.signedUpDaysBack),
  end: zurichMidnight(now, 1 - followUp.signedUpDaysBack),
  returnedFrom: zurichMidnight(now, -followUp.activeFromDaysBack),
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
  collection: string,
  uid: string,
  now: Date,
): Promise<boolean> => {
  try {
    await db
      .collection(collection)
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
  followUp: LapsedFollowUp,
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
      logger.warn(
        `new user ${followUp.name} follow-up monitor is not reachable`,
        {
          uid: monitor.uid,
        },
      );
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
          subject: `[${followUp.monitorTag}] ${status} - no fallback resolved`,
          html: `<p>No Bite in <code>${followUp.configPath}</code> resolved on ${now.toISOString()}, so a new user whose followed accounts posted nothing got no mail. Check that the Bites still exist, are listable, and were not shown in an earlier mail.</p>`,
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
          mail: followUp.mail,
        });

        await sendEmail({
          ...email,
          subject: `[${followUp.monitorTag}] ${status} - ${email.subject}`,
        });
      }

      summary.monitored += 1;
    } catch (error) {
      logger.warn(`new user ${followUp.name} follow-up monitor copy failed`, {
        uid: monitor.uid,
        error,
      });
    }
  }
};

export const sendLapsedFollowUpsForDay = async (
  followUp: LapsedFollowUp,
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

  const [config, earlierBiteIds] = await Promise.all([
    readWeekFollowUpConfig(db, followUp.configPath),
    followUp.earlierBiteIds(db),
  ]);
  const fallback = await resolveFallbackBites(
    db,
    config.biteIds,
    earlierBiteIds,
  );

  if (fallback.length === 0) {
    logger.warn(`new user ${followUp.name} follow-up has no fallback to show`);
  }

  const { start, end, returnedFrom } = followUpWindow(now, followUp);
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
          now.getTime() - followUp.newBiteWindowMs,
        ),
        fallback,
      );

      if (
        !hasWeekPicks(picks) ||
        !(await claim(db, followUp.collection, uid, now))
      ) {
        summary.skipped += 1;
        continue;
      }

      const record = db.collection(followUp.collection).doc(uid);

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
            mail: followUp.mail,
          }),
        );

        await record.update({ status: 'sent', sentAt: now.toISOString() });
        summary.sent += 1;
        logger.info(`new user ${followUp.name} follow-up sent`, {
          uid,
          following: picks.following.length,
        });
      } catch (error) {
        summary.failed += 1;
        await record.update({ status: 'failed' }).catch(() => undefined);
        logger.warn(`new user ${followUp.name} follow-up failed`, {
          uid,
          error,
        });
      }
    }
  }

  await sendMonitorCopies(
    followUp,
    db,
    config.monitorUids,
    fallback,
    summary,
    now,
    sendEmail,
  );

  logger.info(`new user ${followUp.name} follow-up run finished`, summary);

  return summary;
};
