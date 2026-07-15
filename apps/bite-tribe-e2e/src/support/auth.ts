import { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { OnboardingPage } from '../pages/onboarding.page';
import { TEST_USERS } from './test-users';

/**
 * Logs in as the default seeded emulator user and waits until the app has
 * navigated to the authenticated home page. The seeded user is intentionally
 * incomplete for onboarding, so the onboarding assistant is walked to
 * completion for the browser session before journey specs continue.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(TEST_USERS.default.email, TEST_USERS.default.password);
  await continuePastOnboardingIfNeeded(page);
}

export async function continuePastOnboardingIfNeeded(
  page: Page,
): Promise<void> {
  await page.waitForURL(/\/(home|onboarding)$/);

  if (new URL(page.url()).pathname !== '/onboarding') {
    return;
  }

  const onboarding = new OnboardingPage(page);
  await onboarding.complete();
}
