import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { OnboardingPage } from '../pages/onboarding.page';
import { TEST_USERS } from '../support/test-users';

test.describe('Login', () => {
  test('logs in with seeded credentials, shows onboarding, and continues home', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const onboarding = new OnboardingPage(page);

    await loginPage.goto();
    await loginPage.login(
      TEST_USERS.default.email,
      TEST_USERS.default.password,
    );

    // The seeded user has not completed onboarding, so the entry gate blocks
    // authenticated routes until the placeholder is dismissed for this session.
    await onboarding.expectVisible();
    await onboarding.dismiss();
    await expect(page).toHaveURL(/\/home$/);
  });
});
