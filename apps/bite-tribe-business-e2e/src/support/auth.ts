import { expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TEST_USERS } from './test-users';

/**
 * Logs in as the seeded organisation user and waits for the business dashboard.
 *
 * The business shell provides `AFTER_LOGIN_PAGE = '/dashboard'`, and unlike the
 * consumer app there is no onboarding in between.
 */
export async function loginAsBusinessUser(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(
    TEST_USERS.organisation.email,
    TEST_USERS.organisation.password,
  );

  await expect(page).toHaveURL(/\/dashboard$/);
}
