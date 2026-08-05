import { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TEST_USERS, TestUser } from './test-users';

/** Logs in as a seeded emulator user, the shared default one unless told otherwise. */
export async function loginAsTestUser(
  page: Page,
  user: TestUser = TEST_USERS.default,
): Promise<void> {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(user.email, user.password);
}
