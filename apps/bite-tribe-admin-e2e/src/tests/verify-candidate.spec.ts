import { expect, test } from '@playwright/test';
import { join } from 'path';
import { loginAsOperator } from '../support/auth';
import {
  deleteCandidate,
  deleteRestaurant,
  findRestaurantsByName,
  listStorageObjects,
  readCandidate,
  seedPendingCandidate,
} from '../support/emulators';
import { NewRestaurantPage } from '../pages/new-restaurant.page';

const PHOTO = join(__dirname, '..', 'fixtures', 'restaurant.jpg');

/**
 * Verifying a candidate with a photo (GitHub issue #1504). The photo used to
 * be uploaded after the verification transaction had committed, by a client
 * write to the restaurant: a failed upload left a verified candidate and a
 * restaurant without it. It is now uploaded first, keyed by the candidate id,
 * and its URL is written by `verifyRestaurantCandidate` itself.
 */
test.describe('Verify a restaurant candidate', () => {
  const candidateId = `e2e-candidate-${Date.now()}`;
  const name = `E2E Candidate Trattoria ${Date.now()}`;
  let restaurantId: string | undefined;

  test.afterEach(async ({ page }) => {
    await deleteCandidate(page, candidateId);
    if (restaurantId) {
      await deleteRestaurant(page, restaurantId);
    }
  });

  test('writes the photo inside the verification', async ({ page }) => {
    await loginAsOperator(page);
    await seedPendingCandidate(page, candidateId, name);

    await page.goto('/restaurant-candidates');
    await page.getByText(name).click();
    await expect(page).toHaveURL(/\/new-restaurant$/);

    const newRestaurant = new NewRestaurantPage(page);
    await expect(newRestaurant.name).toHaveValue(name);
    await newRestaurant.choosePhoto(PHOTO);
    await newRestaurant.save.click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect
      .poll(async () => (await readCandidate(page, candidateId)).status)
      .toBe('verified');
    const candidate = await readCandidate(page, candidateId);
    restaurantId = candidate.verifiedRestaurantId;

    const [restaurant] = await findRestaurantsByName(page, name);
    expect(restaurant.id).toBe(restaurantId);
    expect(restaurant.fieldNames).not.toContain('restaurantCandidateId');
    expect(restaurant.imagePath).toContain(
      encodeURIComponent(`images/restaurants/${candidateId}/`),
    );

    const objects = await listStorageObjects(
      page,
      restaurant.imagePath as string,
      `images/restaurants/${candidateId}/`,
    );
    expect(objects).toHaveLength(1);
  });
});
