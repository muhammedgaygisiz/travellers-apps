import { expect, Page, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { HomePage } from '../pages/home.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

/** The location pinned in playwright.config.ts, so a seeded Bite is nearby. */
const POSITION = { latitude: 48.137154, longitude: 11.576124 };

/** A nearby Bite owned by the account the specs sign in as. */
async function seedOwnBite(
  page: Page,
  id: string,
  name: string,
  thumbup: number,
): Promise<void> {
  await seedFirestoreDocument(page, `bites/${id}`, {
    id: { stringValue: id },
    name: { stringValue: name },
    place: { stringValue: `Own Tavern ${id}` },
    price: { stringValue: '11.00' },
    currency: { stringValue: 'EUR' },
    rating: { integerValue: '4' },
    position: {
      mapValue: {
        fields: {
          latitude: { doubleValue: POSITION.latitude },
          longitude: { doubleValue: POSITION.longitude },
        },
      },
    },
    geohash: {
      stringValue: geohashForLocation([POSITION.latitude, POSITION.longitude]),
    },
    thumbup: { integerValue: String(thumbup) },
    userId: { stringValue: TEST_USERS.default.uid },
    createdAt: { stringValue: new Date().toISOString() },
    createdAtTimestamp: { integerValue: String(Date.now()) },
  });
}

test.describe('Like a bite', () => {
  test('reacts to another user’s bite in the home feed and the like count updates', async ({
    page,
  }) => {
    // Owned by the organisation account, not by the account doing the reacting:
    // a creator sees their own Bite's reactions as a read-only label and cannot
    // react to it, which the next test covers. See GitHub issue #1401.
    const runId = Date.now();
    const biteId = `likeable-bite-${runId}`;
    const biteName = `Likeable Pizza ${runId}`;

    await seedFirestoreDocument(page, `bites/${biteId}`, {
      id: { stringValue: biteId },
      name: { stringValue: biteName },
      place: { stringValue: `Like Tavern ${runId}` },
      price: { stringValue: '11.00' },
      currency: { stringValue: 'EUR' },
      rating: { integerValue: '4' },
      position: {
        mapValue: {
          fields: {
            latitude: { doubleValue: POSITION.latitude },
            longitude: { doubleValue: POSITION.longitude },
          },
        },
      },
      geohash: {
        stringValue: geohashForLocation([
          POSITION.latitude,
          POSITION.longitude,
        ]),
      },
      userId: { stringValue: TEST_USERS.organisation.uid },
      createdAt: { stringValue: new Date().toISOString() },
      createdAtTimestamp: { integerValue: String(Date.now()) },
    });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    // Assert the card is present before interacting so a feed-population
    // failure surfaces here rather than as a confusing popover timeout.
    const home = new HomePage(page);
    await expect(home.biteCard(biteName)).toBeVisible({ timeout: 15_000 });

    await home.react(biteName, 'thumbup');

    // The reaction is applied optimistically, so the aggregated count on the
    // card's chip becomes 1.
    await home.expectLikeCount(biteName, '1');

    // The emulator keeps every write for the whole run, so hand the fixture
    // back rather than leaving it in the shared nearby feed.
    await deleteFirestoreDocument(page, `bites/${biteId}`);
  });

  test('shows the creator their own bite’s reactions as a read-only chip', async ({
    page,
  }) => {
    const runId = Date.now();
    const likedId = `own-liked-bite-${runId}`;
    const likedName = `Own Liked Pizza ${runId}`;
    const quietId = `own-quiet-bite-${runId}`;
    const quietName = `Own Quiet Pizza ${runId}`;

    // Both owned by the account that signs in below. The first already carries
    // reactions, the second has none, which are the two states the read-only
    // chip distinguishes. See GitHub issue #1401.
    await Promise.all([
      seedOwnBite(page, likedId, likedName, 2),
      seedOwnBite(page, quietId, quietName, 0),
    ]);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const home = new HomePage(page);
    await expect(home.biteCard(likedName)).toBeVisible({ timeout: 15_000 });

    // The creator still sees how their Bite was received.
    await expect(home.likeChip(likedName)).toBeVisible();
    await home.expectLikeCount(likedName, '2');

    // But the chip is a label, not a control: it refuses pointer input, and a
    // tap landing on it opens no reaction popover.
    await expect(home.likeChip(likedName)).toHaveCSS('pointer-events', 'none');
    await home.tapLikeChipDirectly(likedName);
    await expect(page.getByTestId('like-option-thumbup')).toHaveCount(0);

    // With nothing to report the chip is left out entirely, rather than
    // offering a thumbs-up that cannot be tapped.
    await expect(home.likeChip(quietName)).toHaveCount(0);

    await Promise.all([
      deleteFirestoreDocument(page, `bites/${likedId}`),
      deleteFirestoreDocument(page, `bites/${quietId}`),
    ]);
  });
});
