import { join } from 'node:path';
import { expect, Page, test } from '@playwright/test';
import { CreateBitePage } from '../pages/create-bite.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import { completeOnboardingIfNeeded } from '../support/onboarding';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

/**
 * Opens My Bites through the header link, which keeps the running app - and
 * with it the client's copy of the user document - instead of reloading it.
 */
const openMyBites = async (page: Page): Promise<void> => {
  await page.getByText('My Bites', { exact: true }).first().click();
  await page.waitForURL('**/my-bites');
};

test.describe('My Bites count', () => {
  test('counts a Bite posted in the same session without a reload', async ({
    page,
  }) => {
    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    await openMyBites(page);
    const titleCount = page.getByTestId('title-count');
    await expect(titleCount).toHaveText(/^\s*\d+\s*$/);
    const before = Number((await titleCount.textContent())?.trim());

    await page.goBack();
    await page.waitForURL('**/home');

    const createBite = new CreateBitePage(page);
    await createBite.open();
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName('Counted Bite');
    // Unique per run: the emulator keeps restaurants created by earlier runs.
    await createBite.chooseCustomRestaurant(`Count Kitchen ${Date.now()}`);
    await createBite.fillPrice('9.50');
    await createBite.useGpsPosition();
    await expect(createBite.post).toBeEnabled();
    await createBite.submit();
    await page.waitForURL('**/home');

    await openMyBites(page);
    await expect(titleCount).toHaveText(String(before + 1));
  });
});
