import { join } from 'node:path';
import { test } from '@playwright/test';
import { CreateBitePage } from '../pages/create-bite.page';
import { SearchPage } from '../pages/search.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import { completeOnboardingIfNeeded } from '../support/onboarding';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

test.describe('Search', () => {
  test('finds a created bite by bite and restaurant categories', async ({
    page,
  }) => {
    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const runId = Date.now();
    const biteName = `Searchable Kofte ${runId}`;
    const restaurant = `Search Tavern ${runId}`;

    const createBite = new CreateBitePage(page);
    await createBite.open();
    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName(biteName);
    await createBite.chooseCustomRestaurant(restaurant);
    await createBite.fillPrice('9.90');
    await createBite.useGpsPosition();
    await createBite.submit();

    // Ensure the bite was actually created (back on home) before searching, so a
    // creation failure surfaces here rather than as a confusing search timeout.
    await page.waitForURL('**/home');

    const search = new SearchPage(page);
    await search.open();

    await search.selectCategory('Bite');
    await search.search(biteName);
    await search.expectResult(biteName);

    await search.selectCategory('Restaurant');
    await search.search(restaurant);
    await search.expectResult(restaurant);
  });
});
