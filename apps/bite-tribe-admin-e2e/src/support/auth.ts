import { expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TEST_USERS } from './test-users';

/** Signs in as the seeded operator and waits for the admin dashboard. */
export async function loginAsOperator(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(
    TEST_USERS.operator.email,
    TEST_USERS.operator.password,
  );

  await expect(page).toHaveURL(/\/dashboard$/);
}
