import { expect, test } from '@playwright/test';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import { seedFirestoreDocument } from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

test.describe('Tick a Bite off a bucket list', () => {
  test('shows the tried-out state right after the swipe, without leaving the list', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `tick-bite-${runId}`;
    const biteName = `Tick Tacos ${runId}`;
    const bucketListId = `tick-list-${runId}`;
    const bucketListName = `Tick Favorites ${runId}`;

    await seedFirestoreDocument(page, `bites/${biteId}`, {
      name: { stringValue: biteName },
      place: { stringValue: `Tick Kitchen ${runId}` },
      price: { stringValue: '10.00' },
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
      createdAt: { stringValue: new Date().toISOString() },
      createdAtTimestamp: { integerValue: String(Date.now()) },
    });

    await seedFirestoreDocument(page, `bucketlists/${bucketListId}`, {
      userId: { stringValue: TEST_USERS.default.uid },
      name: { stringValue: bucketListName },
      biteIds: { arrayValue: { values: [{ stringValue: biteId }] } },
      createdAt: { stringValue: new Date().toISOString() },
      createdAtTimestamp: { integerValue: String(Date.now()) },
    });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    // The bucket list routes sit behind the auth guard, which bounces a direct
    // navigation back to Home. Walk in through the header menu instead.
    await page.getByTestId('btn-menu').click();
    await page
      .locator('ion-item')
      .filter({ hasText: 'Bucket' })
      .first()
      .click();
    await page.waitForURL(/my-bucketlists$/);
    await dismissCoachMarks(page);

    await page
      .locator('ion-item')
      .filter({ hasText: bucketListName })
      .first()
      .click();
    await page.waitForURL(new RegExp(`my-bucketlists/${bucketListId}$`));
    await dismissCoachMarks(page);

    const slidingItem = page.locator('ion-item-sliding').first();
    const badge = page.locator('.tried-out-badge');

    await expect(slidingItem).toBeVisible();
    await expect(badge).toHaveCount(0);

    // Confirming closes the item with an animation. Ionic keeps the sliding
    // wrapper over the options while it plays, so a second swipe has to wait
    // for it to settle instead of clicking through the closing item.
    const waitUntilClosed = async (): Promise<void> => {
      await expect(slidingItem).not.toHaveClass(/item-sliding-active-slide/);
    };

    const confirmSwipe = async (): Promise<void> => {
      await waitUntilClosed();
      // `open` is what a completed swipe gesture ends in; the option tap after
      // it is the same handler the full swipe fires.
      await slidingItem.evaluate(
        (item: HTMLElement & { open(side: string): Promise<void> }) =>
          item.open('end'),
      );
      await page.locator('ion-item-option').first().click();
    };

    await confirmSwipe();

    // Has to land on this screen. The bug this guards was the tick only
    // showing up after navigating away and back.
    await expect(badge).toHaveCount(1);

    await confirmSwipe();

    await expect(badge).toHaveCount(0);
  });
});
