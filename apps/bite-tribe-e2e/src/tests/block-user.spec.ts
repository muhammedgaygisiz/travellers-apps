import { expect, Page, test } from '@playwright/test';
import { ProfilePage } from '../pages/profile.page';
import { SearchPage } from '../pages/search.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  expectFirestoreDocument,
  getFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const ME = TEST_USERS.default.uid;

// `searchUsers` reads the whole users collection, and its first call in a run
// pays the functions emulator's cold start on top of that.
const SEARCH_TIMEOUT_MS = 30_000;

/** A public account that follows the test user and is followed back. */
async function seedMutualFollower(
  page: Page,
  user: { id: string; displayName: string },
): Promise<void> {
  await seedFirestoreDocument(page, `users/${user.id}`, {
    userId: { stringValue: user.id },
    displayName: { stringValue: user.displayName },
    fullName: { stringValue: '' },
    email: { stringValue: `${user.id}@example.test` },
    photoUrl: { stringValue: '' },
    about: { stringValue: 'Posts things you would rather not see.' },
    public: { booleanValue: true },
    biteCount: { integerValue: '0' },
    subscriptionTier: { integerValue: '0' },
  });

  const edge = (
    followerUid: string,
    followedUid: string,
  ): Record<string, unknown> => ({
    createdAt: { stringValue: new Date().toISOString() },
    followerUid: { stringValue: followerUid },
    followedUid: { stringValue: followedUid },
  });

  await seedFirestoreDocument(
    page,
    `users/${ME}/followers/${user.id}`,
    edge(user.id, ME),
  );
  await seedFirestoreDocument(
    page,
    `users/${user.id}/following/${ME}`,
    edge(user.id, ME),
  );
  await seedFirestoreDocument(
    page,
    `users/${user.id}/followers/${ME}`,
    edge(ME, user.id),
  );
  await seedFirestoreDocument(
    page,
    `users/${ME}/following/${user.id}`,
    edge(ME, user.id),
  );
}

/** GitHub issue #1609. */
test.describe('Block another user', () => {
  test('blocks an account from its profile, hides it from search, and unblocks it', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const other = {
      id: `blocked-${runId}`,
      displayName: `Blockable ${runId}`,
    };

    await seedMutualFollower(page, other);
    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const search = new SearchPage(page);
    await search.open();
    await search.selectCategory('User');
    await search.search(other.displayName);
    await expect(search.result(other.displayName)).toBeVisible({
      timeout: SEARCH_TIMEOUT_MS,
    });
    await search.openResult(other.displayName);
    await page.waitForURL(`**/profile/${other.id}`);

    const profile = new ProfilePage(page);
    await expect(profile.displayName).toHaveText(other.displayName);

    await profile.confirmBlock(other.displayName);

    await expect(profile.blockedMessage).toBeVisible();
    await expect(profile.unblock).toBeVisible();
    await expect(profile.about).toHaveCount(0);
    await expectFirestoreDocument(page, `users/${ME}/blocked/${other.id}`, {
      blockerUid: ME,
      blockedUid: other.id,
    });

    // Blocking removed the follow relation in both directions.
    for (const path of [
      `users/${ME}/following/${other.id}`,
      `users/${other.id}/followers/${ME}`,
      `users/${other.id}/following/${ME}`,
      `users/${ME}/followers/${other.id}`,
    ]) {
      await expect.poll(() => getFirestoreDocument(page, path)).toBeUndefined();
    }

    // The results still on screen from before the block drop the account.
    await page.goBack();
    await page.waitForURL('**/search');
    await search.expectEmpty();

    // And a fresh search no longer offers it either.
    await search.search(`${other.displayName.slice(0, -1)}`);
    await expect(page.getByTestId('search-empty')).toBeVisible({
      timeout: SEARCH_TIMEOUT_MS,
    });
    await expect(search.result(other.displayName)).toHaveCount(0);

    // Opened directly, the profile still offers the way back.
    await page.goto(`/profile/${other.id}`);
    await expect(profile.blockedMessage).toBeVisible();
    await profile.unblock.click();

    await expect(profile.follow).toBeVisible();
    await expect(profile.about).toHaveText(
      'Posts things you would rather not see.',
    );
    await expect
      .poll(() => getFirestoreDocument(page, `users/${ME}/blocked/${other.id}`))
      .toBeUndefined();
  });
});
