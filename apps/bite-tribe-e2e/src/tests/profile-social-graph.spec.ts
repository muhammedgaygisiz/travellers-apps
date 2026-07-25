import { expect, Page, test } from '@playwright/test';
import { ProfilePage } from '../pages/profile.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  expectFirestoreDocument,
  getFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

// Follower/following counts are aggregates maintained by a Firestore trigger, so
// they update asynchronously after a follow/unfollow (or a seeded relationship)
// write. Give those count assertions a generous timeout to absorb trigger
// propagation lag instead of racing the default expect timeout.
const AGGREGATE_PROPAGATION_TIMEOUT_MS = 15_000;

async function seedPublicFollower(
  page: Page,
  user: { id: string; displayName: string },
): Promise<void> {
  await seedFirestoreDocument(page, `users/${user.id}`, {
    userId: { stringValue: user.id },
    displayName: { stringValue: user.displayName },
    fullName: { stringValue: 'Playwright Food Friend' },
    email: { stringValue: `${user.id}@example.test` },
    photoUrl: { stringValue: '' },
    city: { stringValue: 'Lisbon' },
    about: { stringValue: 'Always looking for the next memorable Bite.' },
    public: { booleanValue: true },
    biteCount: { integerValue: '0' },
    subscriptionTier: { integerValue: '0' },
  });

  const relationship = {
    createdAt: { stringValue: new Date().toISOString() },
    followerUid: { stringValue: user.id },
    followedUid: { stringValue: TEST_USERS.default.uid },
  };
  await seedFirestoreDocument(
    page,
    `users/${TEST_USERS.default.uid}/followers/${user.id}`,
    relationship,
  );
  await seedFirestoreDocument(
    page,
    `users/${user.id}/following/${TEST_USERS.default.uid}`,
    relationship,
  );
}

test.describe('Manage Profile and Social Graph', () => {
  test('edits the profile and manages a follow relationship through both social lists', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const otherUser = {
      id: `profile-social-${runId}`,
      displayName: `Food Friend ${runId}`,
    };
    const city = `Profile City ${runId}`;
    const about = `Profile identity updated by Playwright ${runId}.`;

    await seedPublicFollower(page, otherUser);
    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const profile = new ProfilePage(page);
    await profile.openMyProfileFromMenu();
    await profile.editIdentity(city, about);

    await expect(profile.city).toContainText(city);
    await expect(profile.about).toHaveText(about);
    await expectFirestoreDocument(page, `users/${TEST_USERS.default.uid}`, {
      city,
      about,
    });

    await expect(profile.socialCount('Followers')).not.toHaveText('0', {
      timeout: AGGREGATE_PROPAGATION_TIMEOUT_MS,
    });
    await profile.openSocialList('Followers');
    const otherUserRow = profile.socialListUser(otherUser.displayName);
    await expect(otherUserRow).toBeVisible();
    await otherUserRow.click();
    await page.waitForURL(`**/profile/${otherUser.id}`);

    await expect(profile.displayName).toHaveText(otherUser.displayName);
    await expect(profile.city).toContainText('Lisbon');
    await expect(profile.about).toHaveText(
      'Always looking for the next memorable Bite.',
    );
    await expect(profile.socialCount('Followers')).toHaveText('0', {
      timeout: AGGREGATE_PROPAGATION_TIMEOUT_MS,
    });
    await expect(profile.socialCount('Following')).toHaveText('1', {
      timeout: AGGREGATE_PROPAGATION_TIMEOUT_MS,
    });

    await profile.follow.click();
    await expect(profile.stopFollowing).toBeVisible();
    await expect(profile.socialCount('Followers')).toHaveText('1', {
      timeout: AGGREGATE_PROPAGATION_TIMEOUT_MS,
    });
    await expectFirestoreDocument(
      page,
      `users/${otherUser.id}/followers/${TEST_USERS.default.uid}`,
      {
        followerUid: TEST_USERS.default.uid,
        followedUid: otherUser.id,
      },
    );
    await expectFirestoreDocument(
      page,
      `users/${TEST_USERS.default.uid}/following/${otherUser.id}`,
      {
        followerUid: TEST_USERS.default.uid,
        followedUid: otherUser.id,
      },
    );

    await profile.openSocialList('Following');
    await expect(profile.socialListUser('Super Mario')).toBeVisible();
    await profile.goBackToProfile(otherUser.id);

    await profile.openSocialList('Followers');
    await expect(profile.socialListUser('Super Mario')).toBeVisible();
    await profile.goBackToProfile(otherUser.id);

    await profile.confirmUnfollow();
    await expect(profile.follow).toBeVisible();
    await expect(profile.socialCount('Followers')).toHaveText('0', {
      timeout: AGGREGATE_PROPAGATION_TIMEOUT_MS,
    });
    await expect
      .poll(() =>
        getFirestoreDocument(
          page,
          `users/${otherUser.id}/followers/${TEST_USERS.default.uid}`,
        ),
      )
      .toBeUndefined();
    await expect
      .poll(() =>
        getFirestoreDocument(
          page,
          `users/${TEST_USERS.default.uid}/following/${otherUser.id}`,
        ),
      )
      .toBeUndefined();
  });
});
