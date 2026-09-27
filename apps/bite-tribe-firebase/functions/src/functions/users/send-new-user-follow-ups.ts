import { getAuth, UserRecord } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import { buildChunks } from '../shared/utils/build-chunks';
import { getUserLanguage } from '../shared/utils/get-user-language';
import { ZURICH_TZ } from '../shared/utils/week-bounds';
import { createOptOutToken, hasOptedOutOfProductEmails } from './email-opt-out';
import {
  googleWorkspaceEmailSecrets,
  RenderedEmail,
  sendGoogleWorkspaceEmail,
} from './google-workspace-email';
import { renderFollowUpEmail } from './new-user-follow-up-email';
import {
  hasPicks,
  NEW_USER_FOLLOW_UPS_COLLECTION,
  picksFor,
  readFollowUpConfig,
  resolveFollowUpPicks,
} from './new-user-follow-up-picks';

/**
 * One follow-up mail, the day after sign-up (GitHub issue #1707).
 *
 * D1 retention was 5%: people who signed up liked what they saw and had no
 * reason to come back. This gives every new account exactly one reason - three
 * Bites and three people picked by hand - with links back into the app.
 *
 * ## Mail, not push
 *
 * Mail only. A push would open a screen in whichever app build the device has,
 * and the tap would need routing that only a release can ship; a mail link
 * opens the web app, which already has every page it points at, and carries
 * UTM parameters GA4 attributes on its own. One channel also keeps the journey
 * one journey.
 *
 * ## Who gets it
 *
 * The run reads the profiles created between 49 and 24 hours before it. The
 * window is an hour wider than a day so a scheduler that fires a little late
 * does not leave a gap between two runs; the claim below is what stops the
 * overlap from sending twice. Anonymous table guests have no profile document
 * and are not read at all. Auth is the source of truth for the rest: an
 * account without a provider, a disabled one, one without a verified address,
 * and one that opted out of product mail get nothing.
 *
 * ## The claim comes before the send
 *
 * `newUserFollowUps/{uid}` is created - `create`, which fails when it exists -
 * before the mail is sent. The same argument the visit reminder makes: a send
 * that fails after the claim costs a mail nobody got, a claim written after a
 * send costs a second one. Silence is the failure that annoys nobody. The
 * collection is closed to clients, and its `status` is what the run's reach is
 * read from.
 *
 * ## No picks, no run
 *
 * The content lives in `config/newUserFollowUp`. A run whose picks resolve to
 * nothing sends nothing and claims nobody, so an account that signed up before
 * the picks were set is not burnt on an empty mail.
 */

export { NEW_USER_FOLLOW_UPS_COLLECTION };

const HOUR_MS = 60 * 60 * 1000;

/** How many new accounts one run will reach, oldest first. */
export const MAX_FOLLOW_UPS_PER_RUN = 500;

/** `getUsers` accepts at most this many identifiers per call. */
const AUTH_LOOKUP_LIMIT = 100;

export const followUpWindow = (now: Date): { start: number; end: number } => ({
  start: now.getTime() - 49 * HOUR_MS,
  end: now.getTime() - 24 * HOUR_MS,
});

export interface FollowUpSummary {
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
}

export type FollowUpEmailSender = (email: RenderedEmail) => Promise<void>;

const isAlreadyExists = (error: unknown): boolean => {
  const code = (error as { code?: unknown })?.code;

  return code === 6 || code === 'already-exists';
};

/** Claims the one follow-up of an account, or reports it was claimed already. */
const claim = async (
  db: Firestore,
  uid: string,
  now: Date,
): Promise<boolean> => {
  try {
    await db
      .collection(NEW_USER_FOLLOW_UPS_COLLECTION)
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

const isReachable = (
  authUser: UserRecord | undefined,
): authUser is UserRecord & { email: string } =>
  !!authUser &&
  !authUser.disabled &&
  authUser.providerData.length > 0 &&
  !!authUser.email &&
  authUser.emailVerified;

export const sendNewUserFollowUpsForWindow = async (
  now: Date = new Date(),
  sendEmail: FollowUpEmailSender = sendGoogleWorkspaceEmail,
): Promise<FollowUpSummary> => {
  const db = getFirestore();
  const summary: FollowUpSummary = {
    candidates: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  const picks = await resolveFollowUpPicks(db, await readFollowUpConfig(db));

  if (!hasPicks(picks)) {
    logger.warn('new user follow-up has no picks to show');

    return summary;
  }

  const { start, end } = followUpWindow(now);
  const created = await db
    .collection('users')
    .where('createdAtTimestamp', '>=', start)
    .where('createdAtTimestamp', '<', end)
    .orderBy('createdAtTimestamp', 'asc')
    .limit(MAX_FOLLOW_UPS_PER_RUN)
    .get();

  summary.candidates = created.size;

  for (const chunk of buildChunks(
    created.docs.map((document) => document.id),
    AUTH_LOOKUP_LIMIT,
  )) {
    const { users } = await getAuth().getUsers(chunk.map((uid) => ({ uid })));
    const authUsers = new Map(users.map((user) => [user.uid, user]));

    for (const uid of chunk) {
      const authUser = authUsers.get(uid);
      const ownPicks = picksFor(picks, uid);

      if (
        !isReachable(authUser) ||
        !hasPicks(ownPicks) ||
        (await hasOptedOutOfProductEmails(db, uid)) ||
        !(await claim(db, uid, now))
      ) {
        summary.skipped += 1;
        continue;
      }

      const record = db.collection(NEW_USER_FOLLOW_UPS_COLLECTION).doc(uid);

      try {
        const [language, unsubscribeToken] = await Promise.all([
          getUserLanguage(uid),
          createOptOutToken(db, uid, now),
        ]);

        await sendEmail(
          renderFollowUpEmail({
            to: authUser.email,
            language,
            picks: ownPicks,
            unsubscribeToken,
          }),
        );

        await record.update({ status: 'sent', sentAt: now.toISOString() });
        summary.sent += 1;
        logger.info('new user follow-up sent', { uid });
      } catch (error) {
        summary.failed += 1;
        await record.update({ status: 'failed' }).catch(() => undefined);
        logger.warn('new user follow-up failed', { uid, error });
      }
    }
  }

  logger.info('new user follow-up run finished', summary);

  return summary;
};

export const sendNewUserFollowUps = onSchedule(
  {
    // Early evening, when people decide where to eat.
    schedule: '0 18 * * *',
    timeZone: ZURICH_TZ,
    secrets: googleWorkspaceEmailSecrets,
  },
  async (): Promise<void> => {
    await sendNewUserFollowUpsForWindow();
  },
);
