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
      TEST_USERS.organisation.email,
      TEST_USERS.organisation.password,
    );

    // Use the otherwise-unused organisation account so journey setup cannot
    // complete onboarding for this login-specific fixture before this test.
    await onboarding.expectVisible();
    await onboarding.complete();
    await expect(page).toHaveURL(/\/home$/);
  });
});
