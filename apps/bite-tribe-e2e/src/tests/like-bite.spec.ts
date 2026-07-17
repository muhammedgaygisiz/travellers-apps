import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { CreateBitePage } from '../pages/create-bite.page';
import { HomePage } from '../pages/home.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

test.describe('Like a bite', () => {
  test('reacts to a bite in the home feed and the like count updates', async ({
    page,
  }) => {
    await loginAsTestUser(page);
    await dismissCoachMarks(page);

    // Create the Bite we are going to like so the feed deterministically has a
    // likeable card at the pinned GPS position, instead of depending on seeded
    // data or another spec's side effects. Unique name keeps the card lookup
    // unambiguous across re-runs (the emulator persists data for the session).
    const runId = Date.now();
    const biteName = `Likeable Pizza ${runId}`;

    const createBite = new CreateBitePage(page);
    await createBite.open();
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(biteName);
    await createBite.chooseCustomRestaurant(`Like Tavern ${runId}`);
    await createBite.fillPrice('11.00');
    await createBite.useGpsPosition();
    await createBite.submit();

    await page.waitForURL('**/home');

    // The store listens to the latest bites in realtime, so the freshly created
    // Bite shows up in the feed shortly after landing on home. Assert the card
    // is present before interacting so a feed-population failure surfaces here
    // rather than as a confusing popover timeout.
    const home = new HomePage(page);
    await expect(home.biteCard(biteName)).toBeVisible({ timeout: 15_000 });

    await home.react(biteName, 'thumbup');

    // The reaction is applied optimistically, so the aggregated count on the
    // card's chip becomes 1.
    await home.expectLikeCount(biteName, '1');
  });
});
