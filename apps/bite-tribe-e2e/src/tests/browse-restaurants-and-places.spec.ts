import { expect, Page, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { HomePage } from '../pages/home.page';
import { RestaurantPage } from '../pages/restaurant.page';
import { SearchPage } from '../pages/search.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import { seedFirestoreDocument } from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

interface RestaurantBiteFixture {
  id: string;
  name: string;
  place: string;
  rating: number;
  tags: string[];
  restaurantId?: string;
  latitudeOffset?: number;
}

async function seedRestaurantBite(
  page: Page,
  fixture: RestaurantBiteFixture,
): Promise<void> {
  const position = {
    latitude: POSITION.latitude + (fixture.latitudeOffset ?? 0),
    longitude: POSITION.longitude,
  };

  await seedFirestoreDocument(page, `bites/${fixture.id}`, {
    id: { stringValue: fixture.id },
    name: { stringValue: fixture.name },
    place: { stringValue: fixture.place },
    description: { stringValue: `A Bite served by ${fixture.place}.` },
    price: { stringValue: '12.00' },
    currency: { stringValue: 'EUR' },
    rating: { integerValue: String(fixture.rating) },
    tags: {
      arrayValue: {
        values: fixture.tags.map((tag) => ({ stringValue: tag })),
      },
    },
    position: {
      mapValue: {
        fields: {
          latitude: { doubleValue: position.latitude },
          longitude: { doubleValue: position.longitude },
        },
      },
    },
    geohash: {
      stringValue: geohashForLocation([position.latitude, position.longitude]),
    },
    userId: { stringValue: TEST_USERS.organisation.uid },
    ...(fixture.restaurantId
      ? { restaurantId: { stringValue: fixture.restaurantId } }
      : {}),
    createdAt: { stringValue: new Date().toISOString() },
    createdAtTimestamp: { integerValue: String(Date.now()) },
  });
}

async function loginAndOpenRestaurantSearch(page: Page): Promise<SearchPage> {
  await loginAsTestUser(page);
  await completeOnboardingIfNeeded(page);
  await dismissCoachMarks(page);

  const search = new SearchPage(page);
  await search.open();
  await search.selectCategory('Restaurant');
  return search;
}

test.describe('Browse Restaurants and Places', () => {
  test('finds a verified restaurant, inspects its context, and browses its Bites', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const restaurantId = `browse-restaurant-${runId}`;
    const restaurantName = `Browse Bistro ${runId}`;
    const firstBite = {
      id: `browse-bite-one-${runId}`,
      name: `Truffle Gnocchi ${runId}`,
    };
    const secondBite = {
      id: `browse-bite-two-${runId}`,
      name: `Lemon Risotto ${runId}`,
    };

    await Promise.all([
      seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
        id: { stringValue: restaurantId },
        name: { stringValue: restaurantName },
        description: {
          stringValue:
            'A verified neighborhood restaurant for memorable Bites.',
        },
        biteIds: {
          arrayValue: {
            values: [
              { stringValue: firstBite.id },
              { stringValue: secondBite.id },
            ],
          },
        },
        position: {
          mapValue: {
            fields: {
              latitude: { doubleValue: POSITION.latitude },
              longitude: { doubleValue: POSITION.longitude },
            },
          },
        },
        address: {
          mapValue: {
            fields: {
              street: { stringValue: '12 Flavor Street' },
              postcode: { stringValue: '80331' },
              city: { stringValue: 'Munich' },
              country: { stringValue: 'Germany' },
            },
          },
        },
        openingHours: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    day: { stringValue: 'monday' },
                    isOpen: { booleanValue: true },
                    timeRanges: {
                      arrayValue: {
                        values: [
                          {
                            mapValue: {
                              fields: {
                                from: { stringValue: '11:30' },
                                to: { stringValue: '22:00' },
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
      }),
      seedRestaurantBite(page, {
        ...firstBite,
        place: restaurantName,
        rating: 4,
        tags: ['italian', 'truffle'],
        restaurantId,
      }),
      seedRestaurantBite(page, {
        ...secondBite,
        place: restaurantName,
        rating: 5,
        tags: ['italian', 'vegetarian'],
        restaurantId,
        latitudeOffset: 0.0001,
      }),
    ]);

    const search = await loginAndOpenRestaurantSearch(page);
    await search.search(restaurantName);
    await search.expectResult(restaurantName);
    await search.openResult(restaurantName);
    await page.waitForURL(
      new RegExp(`/bite/[^/]+/restaurant/${restaurantId}$`),
    );

    const restaurant = new RestaurantPage(page);
    await restaurant.expectVerifiedRestaurant({
      name: restaurantName,
      description: 'A verified neighborhood restaurant for memorable Bites.',
      street: '12 Flavor Street',
      cityLine: '80331 Munich',
      country: 'Germany',
      rating: '4.5',
      ratingCount: 2,
      tags: ['italian', 'truffle', 'vegetarian'],
    });
    await restaurant.openBites();

    const home = new HomePage(page);
    await expect(home.biteCard(firstBite.name)).toBeVisible();
    await expect(home.biteCard(secondBite.name)).toBeVisible();
    await home.openBite(secondBite.name);
    await expect(
      page.getByRole('heading', { name: secondBite.name, exact: true }),
    ).toBeVisible();
  });

  test('shows an empty search state, then opens an unverified place and its Bites', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const place = `Hidden Gem ${runId}`;
    const firstBite = {
      id: `place-bite-one-${runId}`,
      name: `Secret Sandwich ${runId}`,
    };
    const secondBite = {
      id: `place-bite-two-${runId}`,
      name: `Mystery Soup ${runId}`,
    };

    await Promise.all([
      seedRestaurantBite(page, {
        ...firstBite,
        place,
        rating: 3,
        tags: ['local', 'sandwich'],
      }),
      seedRestaurantBite(page, {
        ...secondBite,
        place,
        rating: 5,
        tags: ['local', 'soup'],
        latitudeOffset: 0.0001,
      }),
    ]);

    const search = await loginAndOpenRestaurantSearch(page);
    await search.search(`No Such Place ${runId}`);
    await search.expectEmpty();

    await search.search(place);
    await search.expectResult(place);
    await expect(search.result(place)).toContainText(
      'This restaurant is not verified on BiteTribe yet.',
    );
    await search.openResult(place);
    await page.waitForURL(/\/bite\/[^/]+\/restaurant\/place\//);

    const restaurant = new RestaurantPage(page);
    await restaurant.expectUnverifiedPlace({
      name: place,
      rating: '4',
      ratingCount: 2,
      tags: ['local', 'sandwich', 'soup'],
    });
    await restaurant.openBites();

    const home = new HomePage(page);
    await expect(home.biteCard(firstBite.name)).toBeVisible();
    await expect(home.biteCard(secondBite.name)).toBeVisible();
  });
});
