import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import {
  buildEmailVerificationMetadata,
  classifyEmailVerificationUser,
  isAutomaticReminderDue,
} from './email-verification-utils';
import {
  sendGoogleWorkspaceVerificationEmail,
  SendVerificationEmailParams,
} from './google-workspace-email';

export type VerificationEmailSender = (
  params: SendVerificationEmailParams,
) => Promise<void>;

interface ReminderSummary {
  scanned: number;
  sent: number;
  skippedVerified: number;
  skippedTrustedProvider: number;
  skippedUnknownProvider: number;
  skippedMaxReminders: number;
  failed: number;
}

const createSummary = (): ReminderSummary => ({
  scanned: 0,
  sent: 0,
  skippedVerified: 0,
  skippedTrustedProvider: 0,
  skippedUnknownProvider: 0,
  skippedMaxReminders: 0,
  failed: 0,
});

const incrementSkipReason = (
  summary: ReminderSummary,
  reason: ReturnType<typeof classifyEmailVerificationUser>['reason'],
): void => {
  if (reason === 'already-verified') {
    summary.skippedVerified += 1;
    return;
  }

  if (reason === 'trusted-provider') {
    summary.skippedTrustedProvider += 1;
    return;
  }

  if (reason === 'unknown-provider' || reason === 'missing-email') {
    summary.skippedUnknownProvider += 1;
  }
};

export const sendEmailVerificationRemindersForUsers = async (
  sender: VerificationEmailSender = sendGoogleWorkspaceVerificationEmail,
  now: Date = new Date(),
): Promise<ReminderSummary> => {
  const summary = createSummary();
  let pageToken: string | undefined;

  logger.info('email verification reminder job started');

  do {
    const usersPage = await admin.auth().listUsers(1000, pageToken);
    pageToken = usersPage.pageToken;

    for (const authUser of usersPage.users) {
      summary.scanned += 1;

      // Classify from Firebase Auth (source of truth) before touching Firestore
      // so non-candidates cost no reads or writes.
      const classification = classifyEmailVerificationUser(authUser);

      if (!classification.eligibleForReminder || !authUser.email) {
        incrementSkipReason(summary, classification.reason);
        if (
          classification.reason === 'unknown-provider' ||
          classification.reason === 'missing-email'
        ) {
          logger.warn('email verification reminder skipped', {
            uid: authUser.uid,
            reason: classification.reason,
          });
        }
        continue;
      }

      const userReference = admin
        .firestore()
        .collection('users')
        .doc(authUser.uid);
      const userSnapshot = await userReference.get();
      const existingData = userSnapshot.data() || {};
      const metadata = buildEmailVerificationMetadata(authUser, existingData);

      if (!isAutomaticReminderDue(metadata)) {
        summary.skippedMaxReminders += 1;
        continue;
      }

      try {
        const verificationLink = await admin
          .auth()
          .generateEmailVerificationLink(authUser.email);

        await sender({ to: authUser.email, verificationLink });

        await userReference.set(
          {
            email: authUser.email,
            ...metadata,
            emailVerificationReminderCount:
              metadata.emailVerificationReminderCount + 1,
            emailVerificationLastSentAt: now.toISOString(),
            emailVerificationLastSentAtTimestamp: now.getTime(),
          },
          { merge: true },
        );

        summary.sent += 1;
        logger.info('email verification reminder sent', { uid: authUser.uid });
      } catch (error) {
        summary.failed += 1;
        logger.warn('email verification reminder send failed', {
          uid: authUser.uid,
          error,
        });
      }
    }
  } while (pageToken);

  logger.info('email verification reminder job finished', summary);

  return summary;
};

export const sendEmailVerificationReminders = onSchedule(
  {
    schedule: '0 10 1 * *',
    timeZone: 'Europe/Zurich',
  },
  async () => {
    await sendEmailVerificationRemindersForUsers();
  },
);
