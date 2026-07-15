import { expect, test } from '@playwright/test';
import { OnboardingPage } from '../pages/onboarding.page';
import { RegistrationPage } from '../pages/registration.page';

test.describe('Registration', () => {
  test('registers a new user with email and password', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    const onboarding = new OnboardingPage(page);

    // Unique email per run: the auth emulator persists accounts for the session,
    // so a fixed address would hit EMAIL_EXISTS and block the happy path on re-runs.
    const email = `e2e-${Date.now()}@test.com`;
    // Satisfies the password policy: lower + upper + digit, min length 8.
    const password = 'Test4711';

    await registrationPage.goto();
    await registrationPage.register(email, password);

    // On success the user is signed in, then the onboarding gate catches the
    // attempted /home navigation until the placeholder is dismissed.
    await onboarding.expectVisible();
    await expect(
      page.getByText(
        'Registration successful! Please check your email to verify your account.',
      ),
    ).toBeVisible();
    await onboarding.dismiss();
    await expect(page).toHaveURL(/\/home$/);
  });
});
