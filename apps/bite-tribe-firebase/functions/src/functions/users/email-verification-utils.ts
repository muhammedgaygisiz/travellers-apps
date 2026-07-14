import * as admin from 'firebase-admin';

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
  existingData: admin.firestore.DocumentData = {},
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

  return {
    emailVerified: classification.emailVerified,
    emailVerificationRequired: classification.emailVerificationRequired,
    emailVerificationProvider: classification.emailVerificationProvider,
    emailVerificationReminderCount:
      emailChanged && classification.emailVerificationRequired
        ? 0
        : existingReminderCount,
    emailVerificationLastSentAt:
      typeof existingData['emailVerificationLastSentAt'] === 'string' &&
      !emailChanged
        ? existingData['emailVerificationLastSentAt']
        : undefined,
    emailVerificationLastSentAtTimestamp:
      typeof existingData['emailVerificationLastSentAtTimestamp'] ===
        'number' && !emailChanged
        ? existingData['emailVerificationLastSentAtTimestamp']
        : undefined,
    emailVerificationManualLastSentAt:
      typeof existingData['emailVerificationManualLastSentAt'] === 'string' &&
      !emailChanged
        ? existingData['emailVerificationManualLastSentAt']
        : undefined,
    emailVerificationManualLastSentAtTimestamp:
      typeof existingData['emailVerificationManualLastSentAtTimestamp'] ===
        'number' && !emailChanged
        ? existingData['emailVerificationManualLastSentAtTimestamp']
        : undefined,
  };
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
