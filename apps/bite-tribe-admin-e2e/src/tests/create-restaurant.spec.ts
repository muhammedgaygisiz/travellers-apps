import { expect, test } from '@playwright/test';
import { join } from 'path';
import { loginAsOperator } from '../support/auth';
import {
  deleteRestaurant,
  findRestaurantsByName,
  listStorageObjects,
} from '../support/emulators';
import { NewRestaurantPage } from '../pages/new-restaurant.page';

const PHOTO = join(__dirname, '..', 'fixtures', 'restaurant.jpg');

/**
 * Creating a restaurant from a blank Create Restaurant page, without a
 * candidate (GitHub issue #1952). On the web it used to write nothing: the
 * page sent `restaurantCandidateId: undefined`, the Firestore SDK refused the
 * document, and a dropped promise let the page navigate back as if it had
 * saved.
 */
test.describe('Create Restaurant', () => {
  const name = `E2E Bistro ${Date.now()}`;
  let createdId: string | undefined;

  test.afterEach(async ({ page }) => {
    if (createdId) {
      await deleteRestaurant(page, createdId);
    }
  });

  test('creates the restaurant, its menu and its photo without a candidate', async ({
    page,
  }) => {
    await loginAsOperator(page);

    const newRestaurant = new NewRestaurantPage(page);
    await newRestaurant.goto();
    await newRestaurant.choosePhoto(PHOTO);
    await newRestaurant.name.fill(name);
    await newRestaurant.placeOnMap();
    await newRestaurant.save.click();

    // Back on the dashboard only once the write has landed.
    await expect(page).toHaveURL(/\/dashboard$/);

    await expect
      .poll(async () => (await findRestaurantsByName(page, name)).length)
      .toBe(1);
    const [restaurant] = await findRestaurantsByName(page, name);
    createdId = restaurant.id;

    expect(restaurant.fieldNames).not.toContain('restaurantCandidateId');
    expect(restaurant.menuId).toBeTruthy();
    expect(restaurant.imagePath).toBeTruthy();

    const objects = await listStorageObjects(
      page,
      restaurant.imagePath as string,
      `images/restaurants/${restaurant.id}/`,
    );
    expect(objects).toHaveLength(1);
  });
});
