import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TEST_USERS } from '../support/test-users';

/**
 * The business app's role gate: [[UC - Operate BiteTribe In The Admin App]].
 *
 * Every other business scenario proves the *allow* path incidentally, by
 * needing the dashboard to get anywhere. Nothing proved the deny path, and the
 * deny path is the whole point of issue #1469 — before it, any BiteTribe
 * account could sign into this app and run the operational migrations in it.
 *
 * The account here is a seeded consumer user carrying no roles. It is a real
 * sign-in, not a mocked one: the claim is absent from the token the emulator
 * mints, exactly as it would be for a restaurant that has not been granted
 * access yet.
 */
test.describe('Business app role gate', () => {
  test('sends a signed-in account without the business role to no-access', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      TEST_USERS.withoutRoles.email,
      TEST_USERS.withoutRoles.password,
    );

    await expect(page).toHaveURL(/\/no-access\?role=business$/);
    // Named, not generic: the account is told which role it is missing so it
    // knows what to ask for.
    await expect(page.getByText(/"business"/)).toBeVisible();
  });

  test('keeps that account out of a business route reached directly', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      TEST_USERS.withoutRoles.email,
      TEST_USERS.withoutRoles.password,
    );
    await expect(page).toHaveURL(/\/no-access/);

    // Deep-linking past the redirect must not work either. `migrations` is the
    // route that matters most: it runs BiteTribe-internal operations.
    await page.goto('/migrations');

    await expect(page).toHaveURL(/\/no-access\?role=business$/);
  });
});
