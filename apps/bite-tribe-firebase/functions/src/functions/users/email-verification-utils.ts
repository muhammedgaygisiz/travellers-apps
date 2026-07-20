import { DocumentData } from 'firebase-admin/firestore';

export type EmailVerificationProvider =
  | 'password'
  | 'trusted-provider'
  | 'unknown';

export interface EmailVerificationMetadata {
  emailVerified: boolean;
  emailVerificationRequired: boolean;
  emailVerificationProvider: EmailVerificationProvider;
  emailVerificationReminderCount: number;
  emailVerificationLastSentAt?: string;
  emailVerificationLastSentAtTimestamp?: number;
  emailVerificationManualLastSentAt?: string;
  emailVerificationManualLastSentAtTimestamp?: number;
}

export interface EmailVerificationClassification
  extends EmailVerificationMetadata {
  eligibleForReminder: boolean;
  reason:
    | 'eligible'
    | 'already-verified'
    | 'trusted-provider'
    | 'unknown-provider'
    | 'missing-email';
}

interface EmailVerificationUser {
  email?: string;
  emailVerified?: boolean;
  providerData: Array<{
    providerId?: string;
  }>;
}

export const MANUAL_RESEND_THROTTLE_MS = 60 * 60 * 1000;
export const MAX_AUTOMATIC_REMINDERS = 3;

const TRUSTED_PROVIDER_IDS = new Set(['google.com', 'apple.com']);

const getProviderIds = (
  user: Pick<EmailVerificationUser, 'providerData'>,
): string[] => {
  return user.providerData
    .map((provider) => provider.providerId)
    .filter((providerId): providerId is string => !!providerId);
};

export const classifyEmailVerificationUser = (
  user: EmailVerificationUser,
): EmailVerificationClassification => {
  const providerIds = getProviderIds(user);
  const hasTrustedProvider = providerIds.some((providerId) =>
    TRUSTED_PROVIDER_IDS.has(providerId),
  );
  const isPasswordOnly =
    providerIds.length === 1 && providerIds[0] === 'password';

  if (!user.email) {
    return {
      emailVerified: !!user.emailVerified,
      emailVerificationRequired: false,
      emailVerificationProvider: 'unknown',
      emailVerificationReminderCount: 0,
      eligibleForReminder: false,
      reason: 'missing-email',
    };
  }

  if (hasTrustedProvider) {
    return {
      emailVerified: true,
      emailVerificationRequired: false,
      emailVerificationProvider: 'trusted-provider',
      emailVerificationReminderCount: 0,
      eligibleForReminder: false,
      reason: 'trusted-provider',
    };
  }

  if (!isPasswordOnly) {
    return {
      emailVerified: !!user.emailVerified,
      emailVerificationRequired: false,
      emailVerificationProvider: 'unknown',
      emailVerificationReminderCount: 0,
      eligibleForReminder: false,
      reason: 'unknown-provider',
    };
  }

  if (user.emailVerified) {
    return {
      emailVerified: true,
      emailVerificationRequired: false,
      emailVerificationProvider: 'password',
      emailVerificationReminderCount: 0,
      eligibleForReminder: false,
      reason: 'already-verified',
    };
  }

  return {
    emailVerified: false,
    emailVerificationRequired: true,
    emailVerificationProvider: 'password',
    emailVerificationReminderCount: 0,
    eligibleForReminder: true,
    reason: 'eligible',
  };
};

export const buildEmailVerificationMetadata = (
  user: EmailVerificationUser,
  existingData: DocumentData = {},
): EmailVerificationMetadata => {
  const classification = classifyEmailVerificationUser(user);
  const existingEmail =
    typeof existingData['email'] === 'string' ? existingData['email'] : '';
  const authEmail = user.email || existingEmail;
  const emailChanged =
    !!existingEmail && !!authEmail && existingEmail !== authEmail;
  const existingReminderCount =
    typeof existingData['emailVerificationReminderCount'] === 'number'
      ? existingData['emailVerificationReminderCount']
      : 0;

  const metadata: EmailVerificationMetadata = {
    emailVerified: classification.emailVerified,
    emailVerificationRequired: classification.emailVerificationRequired,
    emailVerificationProvider: classification.emailVerificationProvider,
    emailVerificationReminderCount:
      emailChanged && classification.emailVerificationRequired
        ? 0
        : existingReminderCount,
  };

  // Carry over previously stored send timestamps unless the email changed.
  // Optional fields are omitted (rather than set to `undefined`) so Firestore
  // writes — including the blocking createUserOnAuthCreate — never reject an
  // undefined value.
  if (!emailChanged) {
    const lastSentAt = existingData['emailVerificationLastSentAt'];
    if (typeof lastSentAt === 'string') {
      metadata.emailVerificationLastSentAt = lastSentAt;
    }

    const lastSentAtTimestamp =
      existingData['emailVerificationLastSentAtTimestamp'];
    if (typeof lastSentAtTimestamp === 'number') {
      metadata.emailVerificationLastSentAtTimestamp = lastSentAtTimestamp;
    }

    const manualLastSentAt = existingData['emailVerificationManualLastSentAt'];
    if (typeof manualLastSentAt === 'string') {
      metadata.emailVerificationManualLastSentAt = manualLastSentAt;
    }

    const manualLastSentAtTimestamp =
      existingData['emailVerificationManualLastSentAtTimestamp'];
    if (typeof manualLastSentAtTimestamp === 'number') {
      metadata.emailVerificationManualLastSentAtTimestamp =
        manualLastSentAtTimestamp;
    }
  }

  return metadata;
};

export const isManualResendRateLimited = (
  metadata: Pick<
    EmailVerificationMetadata,
    'emailVerificationManualLastSentAtTimestamp'
  >,
  nowTimestamp: number,
): boolean => {
  const lastSentAt = metadata.emailVerificationManualLastSentAtTimestamp;

  return (
    typeof lastSentAt === 'number' &&
    nowTimestamp - lastSentAt < MANUAL_RESEND_THROTTLE_MS
  );
};

export const isAutomaticReminderDue = (
  metadata: Pick<
    EmailVerificationMetadata,
    'emailVerificationRequired' | 'emailVerificationReminderCount'
  >,
): boolean => {
  return (
    metadata.emailVerificationRequired &&
    metadata.emailVerificationReminderCount < MAX_AUTOMATIC_REMINDERS
  );
};
