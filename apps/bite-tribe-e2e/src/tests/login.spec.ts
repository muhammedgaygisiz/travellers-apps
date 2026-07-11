import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TEST_USERS } from '../support/test-users';

test.describe('Login', () => {
  test('logs in with seeded credentials and lands on home', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      TEST_USERS.default.email,
      TEST_USERS.default.password,
    );

    // On success LoginService navigates to AFTER_LOGIN_PAGE ('/home').
    await page.waitForURL('**/home');
    await expect(page).toHaveURL(/\/home$/);
  });
});
