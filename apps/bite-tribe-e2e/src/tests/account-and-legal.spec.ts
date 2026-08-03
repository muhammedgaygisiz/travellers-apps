import { expect, test } from '@playwright/test';
import { DeleteAccountPage } from '../pages/delete-account.page';
import { OnboardingPage } from '../pages/onboarding.page';
import { RegistrationPage } from '../pages/registration.page';
import { SettingsPage } from '../pages/settings.page';
import { navigateFromAppMenu } from '../support/app-menu';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  getDocumentByStringField,
  getFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';

/**
 * Registers a throwaway account and returns its uid.
 *
 * Account deletion destroys the account it runs against, so it cannot use the
 * shared seeded users: every test here registers its own. The auth emulator
 * keeps accounts for the whole run, so the address has to be unique per test.
 */
const registerDisposableUser = async (
  page: import('@playwright/test').Page,
  label: string,
): Promise<{ uid: string; email: string }> => {
  const registrationPage = new RegistrationPage(page);
  const onboarding = new OnboardingPage(page);
  const email = `e2e-${label}-${Date.now()}@test.com`;

  await registrationPage.goto();
  await registrationPage.register(email, 'Test4711');
  await onboarding.expectVisible();
  await onboarding.complete();
  await expect(page).toHaveURL(/\/home$/);
  await dismissCoachMarks(page);

  const user = await getDocumentByStringField(page, 'users', 'email', email);
  expect(user, `no user document written for ${email}`).toBeDefined();

  return { uid: String(user?.['userId']), email };
};

test.describe('Account and legal flows', () => {
  test.describe.configure({ timeout: 90_000 });

  test('reaches the privacy policy from inside the app', async ({ page }) => {
    await registerDisposableUser(page, 'privacy');

    await navigateFromAppMenu(page, 'about');
    await page.getByTestId('about-privacy-policy').click();

    await page.waitForURL(/\/privacy$/);
    await expect(page.locator('lib-privacy-policy')).toBeVisible();

    // The document is translated, so it must render the copy of the active app
    // language rather than a raw Transloco key (issue #1218).
    await expect(page.locator('lib-privacy-policy h1')).toHaveText(
      'Privacy Policy for BiteTribe',
    );
  });

  test('cancelling the confirmation leaves the account alone', async ({
    page,
  }) => {
    const { uid } = await registerDisposableUser(page, 'cancel');

    const settings = new SettingsPage(page);
    const deleteAccount = new DeleteAccountPage(page);

    await settings.open();
    await settings.openDeleteAccount();
    await deleteAccount.expectContractVisible();
    await deleteAccount.cancelDeletion();

    await expect(page).toHaveURL(/\/settings\/delete-account$/);
    expect(await getFirestoreDocument(page, `users/${uid}`)).toBeDefined();
  });

  test('deletes the account, keeps the bites, and clears their author', async ({
    page,
  }) => {
    const { uid } = await registerDisposableUser(page, 'delete');

    // Seeded rather than created through the UI: this test is about the
    // deletion contract, and creating a Bite by hand would drag a photo upload
    // and a place lookup into it.
    const biteId = `e2e-delete-account-bite-${Date.now()}`;
    const biteName = `Deletion Ramen ${Date.now()}`;
    await seedFirestoreDocument(page, `bites/${biteId}`, {
      userId: { stringValue: uid },
      name: { stringValue: biteName },
      place: { stringValue: 'Ramen Bar' },
      price: { doubleValue: 12.5 },
    });
    await seedFirestoreDocument(page, `settings/${uid}`, {
      theme: { stringValue: 'dark' },
    });

    const settings = new SettingsPage(page);
    const deleteAccount = new DeleteAccountPage(page);

    await settings.open();
    await settings.openDeleteAccount();
    await deleteAccount.expectContractVisible();
    await deleteAccount.confirmDeletion();

    // Success signs the user out, which navigates to login and reloads the app.
    await page.waitForURL(/\/(login|start)$/, { timeout: 60_000 });
    await expect(deleteAccount.error).toHaveCount(0);

    // The profile and its settings are gone.
    expect(await getFirestoreDocument(page, `users/${uid}`)).toBeUndefined();
    expect(await getFirestoreDocument(page, `settings/${uid}`)).toBeUndefined();

    // The Bite survives without an author, which is what keeps other users'
    // bucket lists and BiteTrails intact.
    const bite = await getFirestoreDocument(page, `bites/${biteId}`);
    expect(bite).toBeDefined();
    expect(bite?.['name']).toBe(biteName);
    expect(bite?.['userId']).toBeUndefined();

    // The job document records that the idempotent cascade completed.
    const job = await getFirestoreDocument(page, `accountDeletions/${uid}`);
    expect(job?.['status']).toBe('completed');
  });
});
