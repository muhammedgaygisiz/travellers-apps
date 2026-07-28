import { Page, expect, test } from '@playwright/test';
import { LeaderboardPage } from '../pages/leaderboard.page';
import { ProfilePage } from '../pages/profile.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import { seedFirestoreDocument } from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';

interface RankedUser {
  id: string;
  displayName: string;
  city: string;
  biteCount: number;
}

async function seedRankedUser(page: Page, user: RankedUser): Promise<void> {
  await seedFirestoreDocument(page, `users/${user.id}`, {
    userId: { stringValue: user.id },
    displayName: { stringValue: user.displayName },
    email: { stringValue: `${user.id}@example.test` },
    photoUrl: { stringValue: '' },
    city: { stringValue: user.city },
    about: { stringValue: 'Collects Bites for sport.' },
    public: { booleanValue: true },
    biteCount: { integerValue: String(user.biteCount) },
    subscriptionTier: { integerValue: '0' },
  });
}

/**
 * The callable serves `meta/leaderboard` as it stands and only rebuilds it when
 * the document is missing, so seeding it is what makes the ranking deterministic
 * here. The rebuild itself hangs off the Bite create/delete triggers and is
 * covered by the functions unit tests; this journey is about the screen.
 */
async function seedLeaderboard(page: Page, users: RankedUser[]): Promise<void> {
  await seedFirestoreDocument(page, 'meta/leaderboard', {
    users: {
      arrayValue: {
        values: users.map((user) => ({
          mapValue: {
            fields: {
              userId: { stringValue: user.id },
              displayName: { stringValue: user.displayName },
              email: { stringValue: `${user.id}@example.test` },
              photoUrl: { stringValue: '' },
              city: { stringValue: user.city },
              public: { booleanValue: true },
              biteCount: { integerValue: String(user.biteCount) },
            },
          },
        })),
      },
    },
  });
}

test.describe('Use gamification signals', () => {
  test('ranks contributors and opens a public profile from a leaderboard row', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const leader: RankedUser = {
      id: `leader-${runId}`,
      displayName: `Bite Champion ${runId}`,
      city: 'Munich',
      biteCount: 42,
    };
    const runnerUp: RankedUser = {
      id: `runner-up-${runId}`,
      displayName: `Second Helping ${runId}`,
      city: 'Vienna',
      biteCount: 17,
    };

    await Promise.all([
      seedRankedUser(page, leader),
      seedRankedUser(page, runnerUp),
    ]);
    await seedLeaderboard(page, [leader, runnerUp]);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const leaderboard = new LeaderboardPage(page);
    await leaderboard.open();
    await dismissCoachMarks(page);

    await expect(leaderboard.rows).toHaveCount(2);
    await leaderboard.expectRankedUser(1, leader);
    await leaderboard.expectRankedUser(2, runnerUp);

    // The rank badge has to follow the stored order, not the Bite count on its
    // own row, so the ranking is only proven with both rows in place.
    await leaderboard.openProfile(1, leader.id);

    const profile = new ProfilePage(page);
    await expect(profile.displayName).toHaveText(leader.displayName);
  });

  test('shows the empty state when nobody is ranked yet', async ({ page }) => {
    test.setTimeout(90_000);

    // An empty ranking is a stored state, not a missing one: the callable only
    // rebuilds when the document is absent, so an empty array stays empty.
    await seedLeaderboard(page, []);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const leaderboard = new LeaderboardPage(page);
    await leaderboard.open();
    await dismissCoachMarks(page);

    await leaderboard.expectEmpty();
  });
});
