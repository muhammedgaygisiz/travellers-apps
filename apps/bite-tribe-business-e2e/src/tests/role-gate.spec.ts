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
 * Those migrations moved to the admin app with issue #1473, so what is behind
 * the gate now is a restaurant's own data.
 *
 * The account here is a seeded consumer user carrying no roles. It is a real
 * sign-in, not a mocked one: the credentials are correct and the claim is
 * simply absent from the token the emulator mints, exactly as it would be for a
 * restaurant that has not been granted access yet.
 */
test.describe('Business app role gate', () => {
  const signInWithoutRoles = async (loginPage: LoginPage): Promise<void> => {
    await loginPage.goto();
    await loginPage.login(
      TEST_USERS.withoutRoles.email,
      TEST_USERS.withoutRoles.password,
    );
  };

  // The credentials are right, so this is the case that would otherwise sign
  // in. It has to look exactly like a wrong password instead.
  test('fails the login rather than signing the account in', async ({
    page,
  }) => {
    await signInWithoutRoles(new LoginPage(page));

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });

  // Telling the account which role it lacks would confirm it exists, that its
  // password was right, and which role guards the app.
  //
  // The app's own name contains "Business", so the check is for the vocabulary
  // of authorization rather than for the word: nothing may mention a role, a
  // grant, or access at all.
  test('says nothing about roles', async ({ page }) => {
    await signInWithoutRoles(new LoginPage(page));

    await expect(page.getByText(/something went wrong/i)).toBeVisible();
    await expect(page.getByText(/\brole\b/i)).toHaveCount(0);
    await expect(page.getByText(/\bgranted?\b/i)).toHaveCount(0);
    await expect(page.getByText(/no access/i)).toHaveCount(0);
    await expect(page).not.toHaveURL(/no-access/);
  });

  // A rejected sign-in must leave no session behind, or the account could skip
  // the login page entirely on its next visit.
  test('leaves no session to deep-link with', async ({ page }) => {
    await signInWithoutRoles(new LoginPage(page));
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/restaurants');

    await expect(page).not.toHaveURL(/\/restaurants$/);
    await expect(page).toHaveURL(/\/(login|start)$/);
  });
});
