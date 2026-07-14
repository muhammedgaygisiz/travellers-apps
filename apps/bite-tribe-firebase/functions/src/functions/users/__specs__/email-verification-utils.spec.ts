import {
  buildEmailVerificationMetadata,
  classifyEmailVerificationUser,
  isAutomaticReminderDue,
  isManualResendRateLimited,
  MANUAL_RESEND_THROTTLE_MS,
} from '../email-verification-utils';

const user = (overrides: {
  email?: string;
  emailVerified?: boolean;
  providerIds?: string[];
}): any =>
  ({
    email: overrides.email,
    emailVerified: overrides.emailVerified ?? false,
    providerData: (overrides.providerIds ?? ['password']).map((providerId) => ({
      providerId,
    })),
  }) as any;

describe('email verification utilities', () => {
  it('classifies unverified password-only users as eligible', () => {
    const result = classifyEmailVerificationUser(
      user({ email: 'mo@example.com', providerIds: ['password'] }),
    );

    expect(result).toMatchObject({
      eligibleForReminder: true,
      emailVerificationRequired: true,
      emailVerificationProvider: 'password',
      reason: 'eligible',
    });
  });

  it('skips trusted provider-linked users even when password is linked', () => {
    const result = classifyEmailVerificationUser(
      user({
        email: 'mo@example.com',
        providerIds: ['password', 'google.com'],
      }),
    );

    expect(result).toMatchObject({
      eligibleForReminder: false,
      emailVerified: true,
      emailVerificationProvider: 'trusted-provider',
      reason: 'trusted-provider',
    });
  });

  it('marks unknown providers as not eligible for automatic reminders', () => {
    const result = classifyEmailVerificationUser(
      user({ email: 'mo@example.com', providerIds: ['custom.example'] }),
    );

    expect(result).toMatchObject({
      eligibleForReminder: false,
      emailVerificationProvider: 'unknown',
      reason: 'unknown-provider',
    });
  });

  it('resets reminder metadata when an unverified password email changes', () => {
    const result = buildEmailVerificationMetadata(
      user({ email: 'new@example.com', providerIds: ['password'] }),
      {
        email: 'old@example.com',
        emailVerificationReminderCount: 2,
        emailVerificationLastSentAt: '2026-06-01T08:00:00.000Z',
        emailVerificationLastSentAtTimestamp: 1780293600000,
      },
    );

    expect(result).toMatchObject({
      emailVerificationReminderCount: 0,
      emailVerificationLastSentAt: undefined,
      emailVerificationLastSentAtTimestamp: undefined,
    });
  });

  it('keeps manual resend throttled for one hour', () => {
    const now = Date.now();

    expect(
      isManualResendRateLimited(
        {
          emailVerificationManualLastSentAtTimestamp:
            now - MANUAL_RESEND_THROTTLE_MS + 1,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isManualResendRateLimited(
        {
          emailVerificationManualLastSentAtTimestamp:
            now - MANUAL_RESEND_THROTTLE_MS,
        },
        now,
      ),
    ).toBe(false);
  });

  it('stops automatic reminders after three successful sends', () => {
    expect(
      isAutomaticReminderDue({
        emailVerificationRequired: true,
        emailVerificationReminderCount: 2,
      }),
    ).toBe(true);
    expect(
      isAutomaticReminderDue({
        emailVerificationRequired: true,
        emailVerificationReminderCount: 3,
      }),
    ).toBe(false);
  });
});
