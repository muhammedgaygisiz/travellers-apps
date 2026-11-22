import { expect, Page, test } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';
import { EditRestaurantPage } from '../pages/edit-restaurant.page';
import { loginAsBusinessUser } from '../support/auth';
import {
  deleteFirestoreDocument,
  getFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

interface GuestBitesFixture {
  restaurantId: string;
  restaurantName: string;
  menuId: string;
  itemId: string;
  matchingBiteId: string;
  unmatchedBiteId: string;
  guestLinkedBiteId: string;
}

const text = (value: string): { stringValue: string } => ({
  stringValue: value,
});

/**
 * One restaurant held by the suite's account, a menu with one dish, and three
 * guests' Bites about it: one whose name matches the dish, one that matches
 * nothing, and one the guest already linked from the menu.
 */
const seed = async (page: Page, runId: string): Promise<GuestBitesFixture> => {
  const fixture: GuestBitesFixture = {
    restaurantId: `guest-bites-restaurant-${runId}`,
    restaurantName: `Guest Bites Trattoria ${runId}`,
    menuId: `guest-bites-menu-${runId}`,
    itemId: `guest-bites-item-${runId}`,
    matchingBiteId: `guest-bite-match-${runId}`,
    unmatchedBiteId: `guest-bite-other-${runId}`,
    guestLinkedBiteId: `guest-bite-linked-${runId}`,
  };

  await seedFirestoreDocument(page, `menus/${fixture.menuId}`, {
    id: text(fixture.menuId),
    restaurantId: text(fixture.restaurantId),
    categories: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                id: text(`category-${runId}`),
                title: text('Pasta'),
                items: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            id: text(fixture.itemId),
                            name: text('Spaghetti Carbonara'),
                            description: text(''),
                            price: { doubleValue: 15 },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    },
  });

  await seedFirestoreDocument(page, `restaurants/${fixture.restaurantId}`, {
    id: text(fixture.restaurantId),
    name: text(fixture.restaurantName),
    description: text(''),
    menuId: text(fixture.menuId),
    ownerUserIds: {
      arrayValue: { values: [text(TEST_USERS.organisation.uid)] },
    },
    claimStatus: text('claimed'),
    position: {
      mapValue: {
        fields: {
          latitude: { doubleValue: POSITION.latitude },
          longitude: { doubleValue: POSITION.longitude },
        },
      },
    },
  });

  const bite = (
    id: string,
    name: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> =>
    seedFirestoreDocument(page, `bites/${id}`, {
      id: text(id),
      userId: text('guest-e2e'),
      name: text(name),
      place: text(fixture.restaurantName),
      price: { doubleValue: 15 },
      rating: { integerValue: '4' },
      restaurantId: text(fixture.restaurantId),
      createdAtTimestamp: { integerValue: String(Date.now()) },
      ...extra,
    });

  await bite(fixture.matchingBiteId, 'spaghetti carbonara');
  await bite(fixture.unmatchedBiteId, 'Calzone');
  await bite(fixture.guestLinkedBiteId, 'Spaghetti Carbonara', {
    menuItemId: text(fixture.itemId),
    menuItemLinkedBy: text('guest'),
  });

  return fixture;
};

/**
 * Guest Bites in the business app (GitHub issue #2216): the restaurant's
 * Bites that are linked to no dish, linked by the owner through
 * `linkBiteToMenuItem`, or marked as not on the menu.
 */
test.describe('Link guests’ Bites to dishes in the business app', () => {
  const seeded: string[] = [];

  test.afterEach(async ({ page }) => {
    const paths = seeded.splice(0);

    await Promise.all(paths.map((path) => deleteFirestoreDocument(page, path)));
  });

  test('links a matching Bite, dismisses another, and keeps the guest’s own link', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const fixture = await seed(
      page,
      `${Date.now()}-${test.info().parallelIndex}`,
    );
    seeded.push(
      `restaurants/${fixture.restaurantId}`,
      `menus/${fixture.menuId}`,
      `bites/${fixture.matchingBiteId}`,
      `bites/${fixture.unmatchedBiteId}`,
      `bites/${fixture.guestLinkedBiteId}`,
    );

    await loginAsBusinessUser(page);
    const dashboard = new DashboardPage(page);
    await dashboard.openRestaurants();
    await dashboard.openRestaurant(
      fixture.restaurantName,
      fixture.restaurantId,
    );
    await new EditRestaurantPage(page).expectRestaurantName(
      fixture.restaurantName,
    );

    // The guest's own link does not count: two Bites wait.
    await expect(page.getByTestId('restaurant-guest-bites-count')).toHaveText(
      /2/,
      { timeout: 20_000 },
    );
    await page.getByTestId('restaurant-guest-bites').click();
    await expect(page).toHaveURL(
      new RegExp(
        `/restaurant/${fixture.restaurantId}/menu/${fixture.menuId}/guest-bites$`,
      ),
    );

    const matching = page.getByTestId(`guest-bite-${fixture.matchingBiteId}`);
    const unmatched = page.getByTestId(`guest-bite-${fixture.unmatchedBiteId}`);
    await expect(matching.getByTestId('guest-bite-suggestion')).toContainText(
      'Spaghetti Carbonara',
    );
    await expect(unmatched.getByTestId('guest-bite-link')).toHaveCount(0);
    await expect(
      page.getByTestId(`guest-bite-${fixture.guestLinkedBiteId}`),
    ).toHaveCount(0);

    await matching.getByTestId('guest-bite-link').click();
    await expect(matching).toHaveCount(0);
    await expect
      .poll(
        async () =>
          await getFirestoreDocument(page, `bites/${fixture.matchingBiteId}`),
        { timeout: 15_000 },
      )
      .toMatchObject({
        menuItemId: fixture.itemId,
        menuItemLinkedBy: 'owner',
      });

    await unmatched.getByTestId('guest-bite-not-on-menu').click();
    const alert = page.locator('ion-alert');
    await expect(alert).toBeVisible();
    await alert
      .getByRole('button', { name: 'Not on the menu', exact: true })
      .click();
    await expect(page.getByTestId('guest-bites-empty')).toBeVisible();
    await expect
      .poll(
        async () =>
          await getFirestoreDocument(page, `bites/${fixture.unmatchedBiteId}`),
        { timeout: 15_000 },
      )
      .toMatchObject({ menuLinkDismissed: true });

    // The guest's own link was never touched.
    expect(
      await getFirestoreDocument(page, `bites/${fixture.guestLinkedBiteId}`),
    ).toMatchObject({ menuItemId: fixture.itemId, menuItemLinkedBy: 'guest' });
  });
});
