import { join } from 'node:path';
import { expect, Page, test } from '@playwright/test';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  FIRESTORE_EMULATOR_URL,
  getFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

/**
 * The `fresh` account: `default` is edited by other journeys at the same time,
 * and a profile save writes the whole form, so two of them would overwrite
 * each other's fields.
 */
const USER = TEST_USERS.fresh;
const USER_DOC = `users/${USER.uid}`;

const STORAGE_FOLDER_URL =
  'http://localhost:9199/v0/b/bite-tribe.firebasestorage.app/o' +
  `?prefix=${encodeURIComponent(`images/users/${USER.uid}/`)}`;

/** The objects in the user's photo folder, by full path. */
async function listPhotoObjects(page: Page): Promise<string[]> {
  const response = await page.request.get(STORAGE_FOLDER_URL, {
    headers: { Authorization: 'Bearer owner' },
  });

  if (!response.ok()) {
    throw new Error(await response.text());
  }

  const { items } = (await response.json()) as { items?: { name: string }[] };

  return (items ?? []).map((item) => item.name);
}

/** The Storage path a download URL points at, or `undefined` for any other URL. */
const objectPathOf = (photoUrl: unknown): string | undefined => {
  const match =
    typeof photoUrl === 'string' ? photoUrl.match(/\/o\/([^?]+)/) : null;

  return match ? decodeURIComponent(match[1]) : undefined;
};

async function photoUrl(page: Page): Promise<string> {
  return String((await getFirestoreDocument(page, USER_DOC))?.['photoUrl']);
}

/**
 * Sets or, with `undefined`, removes the photo status alone: the seeding
 * helper replaces the whole document.
 */
async function setPhotoStatus(
  page: Page,
  photoStatus: 'failed' | undefined,
): Promise<void> {
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/${USER_DOC}?updateMask.fieldPaths=photoStatus`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        fields: photoStatus
          ? { photoStatus: { stringValue: photoStatus } }
          : {},
      },
    },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
}

/** GitHub issue #1953. */
test.describe('Edit Profile photo', () => {
  // Both journeys write the photo status of the same account.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, USER);
    await completeOnboardingIfNeeded(page, USER);
    await dismissCoachMarks(page);
  });

  test.afterEach(async ({ page }) => {
    await setPhotoStatus(page, undefined);
  });

  test('uploads a new photo, points the profile at it and removes the old one', async ({
    page,
  }) => {
    const previousUrl = await photoUrl(page);

    // Opened by its URL, so going back would leave the app: the case in which
    // the photo used to be lost without a request ever being made.
    await page.goto('/edit-profile');
    await page.locator('#select-image').click();
    await page
      .locator('ion-modal image-upload')
      .getByTestId('image-file-input')
      .setInputFiles(IMAGE_FIXTURE);
    await expect(
      page.locator('ion-modal image-upload .image-preview img'),
    ).toBeVisible();
    await page
      .locator('ion-modal')
      .getByRole('button', { name: 'Save', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Save Changes', exact: true })
      .click();

    await page.waitForURL('**/my-profile');

    await expect
      .poll(
        async () =>
          (await getFirestoreDocument(page, USER_DOC))?.['photoStatus'],
        { timeout: 15_000 },
      )
      .toBe('uploaded');

    const newUrl = await photoUrl(page);
    const newObject = objectPathOf(newUrl);

    expect(newUrl).not.toBe(previousUrl);
    expect(newObject).toMatch(new RegExp(`^images/users/${USER.uid}/[^/]+$`));

    // The finalize trigger leaves only the current photo in the folder.
    await expect
      .poll(() => listPhotoObjects(page), { timeout: 15_000 })
      .toEqual([newObject]);

    await expect(
      page.locator('profile-page:visible profile-header img'),
    ).toHaveAttribute('src', /images%2Fusers%2F/);
    await expect(page.getByTestId('profile-photo-pending')).toHaveCount(0);
    await expect(page.getByTestId('profile-photo-failed')).toHaveCount(0);
  });

  test('a failed upload offers a retry, which asks for the photo again when this device has none', async ({
    page,
  }) => {
    await setPhotoStatus(page, 'failed');

    await page.goto('/my-profile');

    const failed = page.locator(
      'profile-page:visible [data-testid="profile-photo-failed"]',
    );
    await expect(failed).toHaveAttribute(
      'aria-label',
      'Photo couldn’t be uploaded',
    );
    await expect(failed.getByTestId('profile-photo-retry')).toHaveText(/Retry/);

    // A new browser context holds no copy of the photo to send again.
    await failed.getByTestId('profile-photo-retry').click();

    await page.waitForURL('**/edit-profile');
  });
});
