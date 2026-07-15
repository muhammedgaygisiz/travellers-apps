# UC - Use Account And Legal Flows

## Status

Supported today.

## Goal

Users can access legal and account lifecycle information.

## Actors

- User
- Privacy-conscious participant

## Current Flow

- User opens privacy policy.
- User opens account deletion flow.
- Email/password user sees a non-blocking email verification prompt on home, settings, and profile edit when verification is still required.
- User can request a fresh verification email from the prompt; backend throttling prevents repeated manual sends within one hour.
- Backend sends monthly automatic verification reminders at 10:00 Europe/Zurich until the configured reminder limit is reached.

## Supported Evidence

- `privacy`
- `account-deletion`
- `resendEmailVerification`
- `syncEmailVerificationStatus`
- `sendEmailVerificationReminders`

## Related Domains

- [[User]]
