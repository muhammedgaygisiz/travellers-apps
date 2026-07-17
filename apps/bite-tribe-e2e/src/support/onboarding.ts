import { Page } from '@playwright/test';
import { TEST_USERS } from './test-users';

const FIRESTORE_EMULATOR_URL =
  'http://127.0.0.1:8080/v1/projects/bite-tribe/databases/(default)/documents';

/**
 * Completes onboarding as emulator-backed test setup when login reaches the
 * gate. Login and registration specs exercise the real assistant; unrelated
 * journeys use this helper to avoid multiple workers editing the same seeded
 * profile through onboarding at once.
 */
export async function completeOnboardingIfNeeded(page: Page): Promise<void> {
  await page.waitForURL(/\/(home|onboarding)$/);

  if (new URL(page.url()).pathname !== '/onboarding') {
    return;
  }

  const completedAt = new Date();
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/users/${TEST_USERS.default.uid}` +
      '?updateMask.fieldPaths=onboardingVersion' +
      '&updateMask.fieldPaths=onboardingCompletedAt' +
      '&updateMask.fieldPaths=onboardingCompletedAtTimestamp',
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        fields: {
          onboardingVersion: { integerValue: '1' },
          onboardingCompletedAt: { stringValue: completedAt.toISOString() },
          onboardingCompletedAtTimestamp: {
            integerValue: String(completedAt.getTime()),
          },
        },
      },
    },
  );

  if (!response.ok()) {
    throw new Error(
      `Could not complete seeded-user onboarding: ${response.status()} ${await response.text()}`,
    );
  }

  await page.goto('/home');
  await page.waitForURL('**/home');
}
