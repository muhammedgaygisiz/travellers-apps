import { expect, Page, test } from '@playwright/test';
import { ProfilePage } from '../pages/profile.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  expectFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const ME = TEST_USERS.default.uid;

/** A public account the test user has nothing to do with yet. */
async function seedStranger(
  page: Page,
  user: { id: string; displayName: string },
): Promise<void> {
  await seedFirestoreDocument(page, `users/${user.id}`, {
    userId: { stringValue: user.id },
    displayName: { stringValue: user.displayName },
    fullName: { stringValue: '' },
    email: { stringValue: `${user.id}@example.test` },
    photoUrl: { stringValue: '' },
    about: { stringValue: 'Definitely the real one.' },
    public: { booleanValue: true },
    biteCount: { integerValue: '0' },
    subscriptionTier: { integerValue: '0' },
  });
}

/** GitHub issue #1829. */
test.describe('Report a profile', () => {
  test('reports an account from its profile, once', async ({ page }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const other = {
      id: `reported-${runId}`,
      displayName: `Reportable ${runId}`,
    };

    await seedStranger(page, other);
    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    await page.goto(`/profile/${other.id}`);
    const profile = new ProfilePage(page);
    await expect(profile.displayName).toHaveText(other.displayName);

    await profile.reportProfile(
      other.displayName,
      'Pretending to be someone else',
    );

    await expect(page.locator('ion-toast')).toContainText(
      'Thanks. We will look at this profile.',
    );
    await expectFirestoreDocument(page, `userReports/${other.id}_${ME}`, {
      reportedUid: other.id,
      reporterUid: ME,
      reason: 'impersonation',
      status: 'open',
    });
    // Nothing on the reported profile records the report.
    await expectFirestoreDocument(page, `users/${other.id}`, {
      about: 'Definitely the real one.',
    });

    // A second report is refused, and the reporter is told why.
    await profile.reportProfile(other.displayName, 'Spam or advertising');

    await expect(page.locator('ion-toast').last()).toContainText(
      'You have already reported this profile.',
    );
    await expectFirestoreDocument(page, `userReports/${other.id}_${ME}`, {
      reason: 'impersonation',
    });
  });

  test('does not offer a report on the user’s own profile', async ({
    page,
  }) => {
    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    await page.goto(`/profile/${ME}`);
    const profile = new ProfilePage(page);
    await expect(profile.displayName).toBeVisible();

    await expect(profile.actionsMenu).toHaveCount(0);
  });
});
