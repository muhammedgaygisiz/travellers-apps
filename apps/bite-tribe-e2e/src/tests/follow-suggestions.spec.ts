import { expect, Page, test } from '@playwright/test';
import { ProfilePage } from '../pages/profile.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  expectFirestoreDocument,
  FIRESTORE_EMULATOR_URL,
  getFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const VIEWER = TEST_USERS.fresh;
/** Super Mario: public, with Bites in the seed, and present in the Auth export. */
const CREATOR = TEST_USERS.default;

/**
 * Writes only the named fields. `seedFirestoreDocument` replaces the whole
 * document, which would strip the shared default profile every other journey
 * reads; an update mask leaves the rest alone, and a masked field missing from
 * `fields` is deleted.
 */
const patchFields = async (
  page: Page,
  documentPath: string,
  fields: Record<string, unknown>,
  mask: string[] = Object.keys(fields),
): Promise<void> => {
  const query = mask
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join('&');
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/${documentPath}?${query}`,
    { headers: { Authorization: 'Bearer owner' }, data: { fields } },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
};

/**
 * Drops the follow both ways and waits for the trigger-maintained
 * `followingCount` to say so, because the home card reads that count at login.
 */
const removeFollow = async (page: Page): Promise<void> => {
  for (const path of [
    `users/${VIEWER.uid}/following/${CREATOR.uid}`,
    `users/${CREATOR.uid}/followers/${VIEWER.uid}`,
  ]) {
    if (await getFirestoreDocument(page, path)) {
      await deleteFirestoreDocument(page, path);
    }
  }

  await expect
    .poll(
      async () =>
        (await getFirestoreDocument(page, `users/${VIEWER.uid}`))?.[
          'followingCount'
        ] ?? 0,
      { timeout: 15_000 },
    )
    .toBe(0);
};

test.describe('Follow suggestions', () => {
  test.beforeEach(async ({ page }) => {
    // Seen today and with Bites, so the creator is eligible however long ago
    // the emulator export was taken; and a viewer who follows nobody and has
    // not closed the home card.
    await patchFields(page, `users/${CREATOR.uid}`, {
      lastSeenTimestamp: { integerValue: String(Date.now()) },
      biteCount: { integerValue: '2' },
    });
    await patchFields(page, `settings/${VIEWER.uid}`, {}, [
      'followSuggestionsDismissedAt',
    ]);
    await removeFollow(page);
  });

  test.afterEach(async ({ page }) => {
    await removeFollow(page);
  });

  test('a user who follows nobody follows a suggested person from home', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await loginAsTestUser(page, VIEWER);
    await completeOnboardingIfNeeded(page, VIEWER);
    await dismissCoachMarks(page);

    const card = page.getByTestId('home-follow-suggestions');
    const suggestion = card.locator(
      `[data-testid="follow-suggestion"][data-user-id="${CREATOR.uid}"]`,
    );

    await expect(suggestion).toBeVisible({ timeout: 20_000 });
    await expect(card.locator(`[data-user-id="${VIEWER.uid}"]`)).toHaveCount(0);

    await suggestion.getByTestId('follow-suggestion-follow').click();

    await expect(page.getByTestId('follow-suggestions')).toHaveCount(0);
    await expectFirestoreDocument(
      page,
      `users/${VIEWER.uid}/following/${CREATOR.uid}`,
      { followerUid: VIEWER.uid, followedUid: CREATOR.uid },
    );
    await expectFirestoreDocument(
      page,
      `users/${CREATOR.uid}/followers/${VIEWER.uid}`,
      { followerUid: VIEWER.uid, followedUid: CREATOR.uid },
    );

    const profile = new ProfilePage(page);
    await profile.openMyProfileFromMenu();
    await profile.openSocialList('Following');
    await expect(profile.socialListUser('Super Mario')).toBeVisible();
  });
});
