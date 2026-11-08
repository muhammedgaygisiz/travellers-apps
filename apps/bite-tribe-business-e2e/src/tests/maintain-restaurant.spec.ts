import { expect, test } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';
import { EditRestaurantPage } from '../pages/edit-restaurant.page';
import { FloorPlanPage } from '../pages/floor-plan.page';
import { loginAsBusinessUser } from '../support/auth';
import {
  deleteFirestoreDocument,
  expectFirestoreDocument,
  getFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { TEST_USERS } from '../support/test-users';

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

  // The emulator keeps every write for the whole run, and a fixture assigned
  // to the suite's account stays on its list, so hand them back after each
  // test.
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
    // The restaurant is assigned to the account the suite signs in as. Since
    // issue #1078 the Firestore rules authorise a restaurant write from
    // `ownerUserId`, so an unassigned fixture is refused rather than saved -
    // which is the same refusal a real unassigned restaurant now gets.
    await seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
      id: { stringValue: restaurantId },
      name: { stringValue: restaurantName },
      description: { stringValue: '' },
      ownerUserId: { stringValue: TEST_USERS.organisation.uid },
      claimStatus: { stringValue: 'claimed' },
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
    await dashboard.openRestaurants();
    await dashboard.expectRestaurant(restaurantName);
    await dashboard.openRestaurant(restaurantName, restaurantId);

    const editRestaurant = new EditRestaurantPage(page);
    await editRestaurant.expectRestaurantName(restaurantName);

    await editRestaurant.fillDescription(description);
    await editRestaurant.expectSavedToast(
      'About the restaurant saved successfully!',
    );

    await editRestaurant.fillAddress(address);
    await editRestaurant.expectSavedToast('Address saved successfully!');

    await expectFirestoreDocument(page, `restaurants/${restaurantId}`, {
      name: restaurantName,
      description,
      address,
    });
  });

  /**
   * The gender-neutral restroom (issue #1830): an answer survives a reload,
   * and "Not stated" removes the field rather than writing `false` - which
   * the consumer page would show as "No gender-neutral restroom".
   */
  test('states the gender-neutral restroom and takes the answer back', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const restaurantId = `business-facilities-${runId}`;
    const restaurantName = `Facilities Bistro ${runId}`;

    seededRestaurantIds.push(restaurantId);
    await seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
      id: { stringValue: restaurantId },
      name: { stringValue: restaurantName },
      ownerUserId: { stringValue: TEST_USERS.organisation.uid },
      claimStatus: { stringValue: 'claimed' },
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
    await dashboard.openRestaurants();
    await dashboard.openRestaurant(restaurantName, restaurantId);

    const editRestaurant = new EditRestaurantPage(page);
    await editRestaurant.expectRestaurantName(restaurantName);
    // A restaurant written before the field existed has not said.
    await editRestaurant.expectGenderNeutralRestroom('not-stated');

    await editRestaurant.chooseGenderNeutralRestroom('Yes');
    await editRestaurant.expectSavedToast('Facilities saved');
    await expectFirestoreDocument(page, `restaurants/${restaurantId}`, {
      facilities: { genderNeutralRestroom: true },
    });

    await page.reload();
    await editRestaurant.expectRestaurantName(restaurantName);
    await editRestaurant.expectGenderNeutralRestroom('yes');

    await editRestaurant.chooseGenderNeutralRestroom('Not stated');
    await editRestaurant.expectSavedToast('Facilities saved');
    await expect
      .poll(
        async () => {
          const restaurant = await getFirestoreDocument(
            page,
            `restaurants/${restaurantId}`,
          );
          const facilities = restaurant?.['facilities'] as
            Record<string, unknown> | undefined;

          return !!facilities && 'genderNeutralRestroom' in facilities;
        },
        { timeout: 15_000 },
      )
      .toBe(false);
  });

  /**
   * The other half of the ownership boundary: [[UC - Own And Claim Restaurants]].
   *
   * Every scenario above proves the allow path incidentally, by needing a save
   * to land. This one proves that a restaurant assigned to another account is
   * both absent from the list and refused by direct URL, which is what issue
   * #1079 is for - before it, this account was shown the restaurant and could
   * open its edit form.
   *
   * The URL is typed rather than clicked on purpose. Scoping the list only
   * hides the route; a bookmark, a shared link or a revocation that happened
   * mid-session all arrive at the route directly, and only the guard answers
   * those. The earlier version of this test drove the *save* and asserted the
   * failure toast issue #1078's rules produce; that deny case now lives in
   * `firestore-rules.emulator-spec.ts`, which can reach the write without a
   * form to reach it through.
   */
  /**
   * Ownership as a set (epic #1614, issue #1751): a restaurant held only
   * through `ownerUserIds` - the shape the `restaurant-owner-ids` migration
   * leaves - is on the dashboard of every account in the set, and each of
   * them can save it and open its owner routes.
   */
  test('lists and saves a restaurant held only through the owner set', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const restaurantId = `set-held-restaurant-${runId}`;
    const restaurantName = `Shared Bistro ${runId}`;
    const description = `Run by two people since ${runId}.`;

    seededRestaurantIds.push(restaurantId);
    await seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
      id: { stringValue: restaurantId },
      name: { stringValue: restaurantName },
      description: { stringValue: '' },
      ownerUserIds: {
        arrayValue: {
          values: [
            { stringValue: 'another-business-account-uid' },
            { stringValue: TEST_USERS.organisation.uid },
          ],
        },
      },
      claimStatus: { stringValue: 'claimed' },
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
    await dashboard.openRestaurants();
    await dashboard.expectRestaurant(restaurantName);
    await dashboard.openRestaurant(restaurantName, restaurantId);

    const editRestaurant = new EditRestaurantPage(page);
    await editRestaurant.expectRestaurantName(restaurantName);
    await editRestaurant.fillDescription(description);
    await editRestaurant.expectSavedToast(
      'About the restaurant saved successfully!',
    );

    await expectFirestoreDocument(page, `restaurants/${restaurantId}`, {
      description,
    });

    // The floor-plan route sits behind the same owner guard as the editor,
    // and its empty state renders only once the guard has let the account in.
    const floorPlan = new FloorPlanPage(page);
    await floorPlan.goto(restaurantId);
    await expect(floorPlan.empty).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(
      new RegExp(`/restaurant/${restaurantId}/floor-plan$`),
    );
  });

  test('hides a restaurant assigned to another account and refuses it by direct URL', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const restaurantId = `foreign-restaurant-${runId}`;
    const restaurantName = `Someone Elses Bistro ${runId}`;

    seededRestaurantIds.push(restaurantId);
    await seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
      id: { stringValue: restaurantId },
      name: { stringValue: restaurantName },
      description: { stringValue: '' },
      ownerUserId: { stringValue: 'another-business-account-uid' },
      claimStatus: { stringValue: 'claimed' },
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
    await dashboard.openRestaurants();
    // Nothing else is assigned to this account, so the list is not merely
    // missing one row - it is the empty state that says who to contact, which
    // is what the helper waits for before judging the row absent.
    await dashboard.expectRestaurantMissing(restaurantName);

    await page.goto(`/restaurant/${restaurantId}`);

    await expect(page).toHaveURL(/\/restaurants$/, { timeout: 20_000 });
    await expect(
      page
        .locator('ion-toast')
        .getByText('That restaurant is not assigned to this account.', {
          exact: true,
        }),
    ).toBeVisible();
  });
});
