import { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TEST_USERS } from './test-users';

/**
 * Logs in as the default seeded emulator user and waits until the app has
 * navigated to the authenticated home page. Reusable across journey specs that
 * start behind the auth guard.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(TEST_USERS.default.email, TEST_USERS.default.password);
  await page.waitForURL('**/home');
}
