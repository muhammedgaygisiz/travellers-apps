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
 *
 * Since GitHub issue #2141 the photo is published by the storage trigger once
 * the image check passed it, and the page waits for that verdict before it
 * leaves, so the save takes as long as the trigger does.
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
    // The emulated trigger starts cold on its first upload.
    test.setTimeout(120_000);
    await loginAsOperator(page);

    const newRestaurant = new NewRestaurantPage(page);
    await newRestaurant.goto();
    await newRestaurant.choosePhoto(PHOTO);
    await newRestaurant.name.fill(name);
    await newRestaurant.placeOnMap();
    await newRestaurant.save.click();

    // Back on the dashboard only once the write has landed and the image
    // check has answered.
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });

    await expect
      .poll(async () => (await findRestaurantsByName(page, name)).length)
      .toBe(1);
    createdId = (await findRestaurantsByName(page, name))[0].id;

    // Written by the trigger once the image check passed the photo, never by
    // the page (GitHub issue #2141).
    await expect
      .poll(
        async () => (await findRestaurantsByName(page, name))[0]?.imagePath,
        { timeout: 60_000 },
      )
      .toBeTruthy();
    const [restaurant] = await findRestaurantsByName(page, name);

    expect(restaurant.fieldNames).not.toContain('restaurantCandidateId');
    expect(restaurant.menuId).toBeTruthy();

    const objects = await listStorageObjects(
      page,
      restaurant.imagePath as string,
      `images/restaurants/${restaurant.id}/`,
    );
    expect(objects).toHaveLength(1);
  });
});
