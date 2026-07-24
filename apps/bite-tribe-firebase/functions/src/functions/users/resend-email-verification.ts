import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { logger } from 'firebase-functions';
import { onAppCheck } from '../shared/callable-options';
import {
  buildEmailVerificationMetadata,
  classifyEmailVerificationUser,
  isManualResendRateLimited,
} from './email-verification-utils';
import {
  googleWorkspaceEmailSecrets,
  sendGoogleWorkspaceVerificationEmail,
  SendVerificationEmailParams,
} from './google-workspace-email';

interface ResendEmailVerificationResult {
  status: 'sent';
}

export type VerificationEmailSender = (
  params: SendVerificationEmailParams,
) => Promise<void>;

export const resendEmailVerificationForUser = async (
  uid: string,
  sender: VerificationEmailSender = sendGoogleWorkspaceVerificationEmail,
  now: Date = new Date(),
): Promise<ResendEmailVerificationResult> => {
  const authUser = await getAuth().getUser(uid);
  const classification = classifyEmailVerificationUser(authUser);

  if (classification.reason === 'already-verified') {
    throw new HttpsError('failed-precondition', 'already_verified');
  }

  if (!classification.eligibleForReminder || !authUser.email) {
    if (
      classification.reason === 'unknown-provider' ||
      classification.reason === 'missing-email'
    ) {
      logger.warn('email verification manual resend skipped', {
        uid,
        reason: classification.reason,
      });
    }

    throw new HttpsError('failed-precondition', 'unsupported_provider');
  }

  const userReference = getFirestore().collection('users').doc(uid);
  const userSnapshot = await userReference.get();
  const existingData = userSnapshot.data() || {};
  const metadata = buildEmailVerificationMetadata(authUser, existingData);

  if (isManualResendRateLimited(metadata, now.getTime())) {
    throw new HttpsError('resource-exhausted', 'rate_limited');
  }

  try {
    const verificationLink = await getAuth().generateEmailVerificationLink(
      authUser.email,
    );

    await sender({ to: authUser.email, verificationLink });
  } catch (error) {
    logger.error('email verification manual resend failed', {
      uid,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new HttpsError('internal', 'send_failed');
  }

  await userReference.set(
    {
      email: authUser.email,
      ...metadata,
      emailVerificationManualLastSentAt: now.toISOString(),
      emailVerificationManualLastSentAtTimestamp: now.getTime(),
    },
    { merge: true },
  );

  logger.info('email verification manual resend sent', { uid });

  return { status: 'sent' };
};

export const resendEmailVerification = onAppCheck<
  void,
  Promise<ResendEmailVerificationResult>
>({ secrets: googleWorkspaceEmailSecrets }, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to resend email verification.',
    );
  }

  return resendEmailVerificationForUser(request.auth.uid);
});
