import { test } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';
import { EditRestaurantPage } from '../pages/edit-restaurant.page';
import { loginAsBusinessUser } from '../support/auth';
import {
  deleteFirestoreDocument,
  expectFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

/**
 * First business-app journey: [[UC - Maintain Restaurants In The Business App]].
 *
 * It walks the spine every other business scenario builds on — sign in, land on
 * the dashboard, pick a Restaurant, change its context, and have the change
 * persist — so a break in auth, routing, the dashboard collection reads, or the
 * restaurant write path shows up here first.
 */
test.describe('Maintain restaurants in the business app', () => {
  const seededRestaurantIds: string[] = [];

  // The emulator keeps every write for the whole run and the dashboard lists
  // every restaurant, so hand the fixtures back after each test.
  test.afterEach(async ({ page }) => {
    const ids = seededRestaurantIds.splice(0);

    await Promise.all(
      ids.map((id) => deleteFirestoreDocument(page, `restaurants/${id}`)),
    );
  });

  test('opens a restaurant from the dashboard and persists its About text and address', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const restaurantId = `business-restaurant-${runId}`;
    const restaurantName = `Business Bistro ${runId}`;
    const description = `Family-run since ${runId}, known for its seasonal Bites.`;
    const address = {
      street: '12 Flavor Street',
      postcode: '80331',
      city: 'Munich',
      country: 'Germany',
    };

    seededRestaurantIds.push(restaurantId);
    await seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
      id: { stringValue: restaurantId },
      name: { stringValue: restaurantName },
      description: { stringValue: '' },
      position: {
        mapValue: {
          fields: {
            latitude: { doubleValue: POSITION.latitude },
            longitude: { doubleValue: POSITION.longitude },
          },
        },
      },
    });

    await loginAsBusinessUser(page);

    const dashboard = new DashboardPage(page);
    await dashboard.expectRestaurant(restaurantName);
    await dashboard.openRestaurant(restaurantName, restaurantId);

    const editRestaurant = new EditRestaurantPage(page);
    await editRestaurant.expectRestaurantName(restaurantName);

    await editRestaurant.fillDescription(description);
    await editRestaurant.expectSavedToast(
      'About restaurant saved successfully.',
    );

    await editRestaurant.fillAddress(address);
    await editRestaurant.expectSavedToast('Address saved successfully.');

    await expectFirestoreDocument(page, `restaurants/${restaurantId}`, {
      name: restaurantName,
      description,
      address,
    });
  });
});
