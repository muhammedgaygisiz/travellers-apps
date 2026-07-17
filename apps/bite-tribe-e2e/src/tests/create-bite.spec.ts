import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { CreateBitePage } from '../pages/create-bite.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

test.describe('Create bite', () => {
  test('creates a bite and returns to home with a success toast', async ({
    page,
  }) => {
    await loginAsTestUser(page);
    await dismissCoachMarks(page);

    // Unique per run: the emulator persists created bites for the session, so a
    // fixed restaurant name would become an exact match on the next run and hide
    // the "Use: ..." custom option. A unique name keeps the custom path deterministic.
    const restaurant = `Trattoria da Playwright ${Date.now()}`;

    const createBite = new CreateBitePage(page);
    await createBite.open();

    await createBite.uploadImage(IMAGE_FIXTURE);
    await createBite.fillName('Margherita Pizza');
    await createBite.chooseCustomRestaurant(restaurant);
    await createBite.fillPrice('12.50');
    await createBite.useGpsPosition();

    // The post button stays disabled until the form is valid.
    await expect(createBite.post).toBeEnabled();
    await createBite.submit();

    await page.waitForURL('**/home');
    await expect(page.getByText('Bite created successfully!')).toBeVisible();
  });
});
