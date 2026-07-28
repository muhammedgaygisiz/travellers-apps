import { expect, Page, test } from '@playwright/test';
import { SettingsPage } from '../pages/settings.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  expectFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

/**
 * The settings write replaces the whole `settings/{uid}` document, and other
 * specs (bite-data-quality) set their own preferred currency in the same
 * emulator. Starting from a known document keeps the assertions about what this
 * journey changed rather than about what ran before it.
 */
async function seedBaselineSettings(page: Page): Promise<void> {
  await seedFirestoreDocument(page, `settings/${TEST_USERS.default.uid}`, {
    pushNotifications: { booleanValue: false },
    emailUpdates: { booleanValue: false },
    location: { booleanValue: true },
    theme: { stringValue: 'light' },
    currency: { stringValue: 'EUR' },
    favoriteCurrencies: { arrayValue: { values: [] } },
    language: { stringValue: 'en' },
  });
}

async function setEmailVerificationState(
  page: Page,
  required: boolean,
): Promise<void> {
  const response = await page.request.patch(
    `http://127.0.0.1:8080/v1/projects/bite-tribe/databases/(default)/documents/users/${TEST_USERS.default.uid}` +
      '?updateMask.fieldPaths=emailVerificationRequired' +
      '&updateMask.fieldPaths=emailVerified',
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        fields: {
          emailVerificationRequired: { booleanValue: required },
          emailVerified: { booleanValue: !required },
        },
      },
    },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
}

test.describe('Configure personal settings', () => {
  test('changes currency, favorites, and theme, and shows them again afterwards', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await seedBaselineSettings(page);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const settings = new SettingsPage(page);
    await settings.open();

    // The seeded user has no subscription, and nothing is saveable yet.
    await settings.expectAccountType('Free tier');
    await settings.expectSaveDisabled();

    await settings.choosePreferredCurrency('CHF');
    await settings.expectPreferredCurrency('Swiss Franc');

    await settings.toggleFavoriteCurrency('JPY');
    await settings.expectFavoriteCurrencies('Japanese Yen');

    await settings.selectTheme('Dark');
    await settings.save();

    // `location` is not on this form; it is carried through from the existing
    // document, so a settings save must not drop the onboarding grant.
    await expectFirestoreDocument(page, `settings/${TEST_USERS.default.uid}`, {
      currency: 'CHF',
      favoriteCurrencies: ['JPY'],
      theme: 'dark',
      language: 'en',
      location: true,
      pushNotifications: false,
      emailUpdates: false,
    });

    // Read the values back through the UI. The theme control is deliberately
    // not asserted here: a system-theme effect also writes that control on
    // init, so what it shows after a reload is not the stored value alone.
    await settings.reopen();
    await settings.expectPreferredCurrency('Swiss Franc');
    await settings.expectFavoriteCurrencies('Japanese Yen');
  });

  test.describe('with an unverified email address', () => {
    // The flag lives on the shared seeded user and the prompt renders on Home
    // and the profile too, so it is always handed back — a leak would put an
    // extra card in front of later specs.
    test.afterEach(async ({ page }) => {
      await setEmailVerificationState(page, false);
    });

    test('offers the verification prompt on the settings page', async ({
      page,
    }) => {
      test.setTimeout(90_000);

      await setEmailVerificationState(page, true);

      await loginAsTestUser(page);
      await completeOnboardingIfNeeded(page);
      await dismissCoachMarks(page);

      const settings = new SettingsPage(page);
      await settings.open();

      const prompt = settings.emailVerificationPrompt;
      await expect(prompt).toContainText('Verify your email address');
      // Only that the resend is offered. Sending goes through the Workspace
      // mail secrets, which the emulator has no credentials for.
      await expect(
        prompt.getByRole('button', { name: 'Resend email' }),
      ).toBeVisible();
    });
  });
});
