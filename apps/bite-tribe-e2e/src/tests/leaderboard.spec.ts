import { Page, expect, test } from '@playwright/test';
import { LeaderboardPage } from '../pages/leaderboard.page';
import { ProfilePage } from '../pages/profile.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  getFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
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
 * the document is missing or an entry holds a field the leaderboard no longer
 * publishes, so seeding it in the current shape - no `email`, issue #1611 - is
 * what makes the ranking deterministic here. The rebuild itself hangs off the Bite create/delete triggers and is
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
    await leaderboard.showAllTime();

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
    await leaderboard.showAllTime();

    await leaderboard.expectEmpty();
  });

  test('ranks this week by the Bites created since Monday, and dates last week', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    // Weekly counts the seeded Bites beat on their own, whatever the shared
    // emulator already holds for this week from other specs.
    const leader: RankedUser = {
      id: `week-leader-${runId}`,
      displayName: `Week Leader ${runId}`,
      city: 'Sarajevo',
      biteCount: 6,
    };
    const runnerUp: RankedUser = {
      id: `week-runner-${runId}`,
      displayName: `Week Runner ${runId}`,
      city: 'Mostar',
      biteCount: 5,
    };
    const biteIds: string[] = [];

    await Promise.all([
      seedRankedUser(page, { ...leader, biteCount: 1 }),
      seedRankedUser(page, { ...runnerUp, biteCount: 900 }),
    ]);

    // Ranked by this week's Bites, not by the all-time count on the user
    // document: the runner-up's 900 must not put them first.
    for (const user of [leader, runnerUp]) {
      for (let i = 0; i < user.biteCount; i++) {
        const biteId = `${user.id}-bite-${i}`;
        biteIds.push(biteId);
        await seedFirestoreDocument(page, `bites/${biteId}`, {
          userId: { stringValue: user.id },
          name: { stringValue: `Weekly Bite ${i} ${runId}` },
          place: { stringValue: `Weekly Kitchen ${runId}` },
          price: { stringValue: '5.00' },
          currency: { stringValue: 'BAM' },
          createdAt: { stringValue: new Date().toISOString() },
          createdAtTimestamp: { integerValue: String(Date.now()) },
        });
      }
    }

    // The board is rebuilt by the Bite create trigger, asynchronously.
    await expect
      .poll(
        async () => {
          const board = await getFirestoreDocument(
            page,
            'meta/leaderboardWeekly',
          );
          const users = (board?.['users'] ?? []) as { userId: string }[];

          return [leader.id, runnerUp.id].every((id) =>
            users.some((user) => user.userId === id),
          );
        },
        { timeout: 60_000 },
      )
      .toBe(true);

    try {
      await loginAsTestUser(page);
      await completeOnboardingIfNeeded(page);
      await dismissCoachMarks(page);

      const leaderboard = new LeaderboardPage(page);
      await leaderboard.open();
      await dismissCoachMarks(page);

      await expect(leaderboard.weekEnds).toContainText('Week ends in');

      const leaderRow = leaderboard.rowFor(leader.displayName);
      const runnerRow = leaderboard.rowFor(runnerUp.displayName);

      await expect(leaderRow.locator('.bite-count')).toHaveText('6 Bites');
      await expect(runnerRow.locator('.bite-count')).toHaveText('5 Bites');

      const leaderRank = Number(
        await leaderRow.locator('.rank-badge').textContent(),
      );
      const runnerRank = Number(
        await runnerRow.locator('.rank-badge').textContent(),
      );
      expect(leaderRank).toBeLessThan(runnerRank);

      await leaderboard.showLastWeek();
      await expect(leaderboard.finalStandings).toContainText('Final standings');
      await expect(leaderboard.weekEnds).toHaveCount(0);
      await expect(leaderboard.rowFor(leader.displayName)).toHaveCount(0);
    } finally {
      // The emulator keeps every write for the run; hand the Bites back so
      // they do not sit in later specs' feeds.
      for (const biteId of biteIds) {
        await deleteFirestoreDocument(page, `bites/${biteId}`);
      }
    }
  });
});
