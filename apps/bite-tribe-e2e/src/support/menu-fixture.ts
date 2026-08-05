import { Page } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { deleteFirestoreDocument, seedFirestoreDocument } from './firestore';
import { TEST_USERS } from './test-users';

/** Roughly central Munich, matching the geolocation pinned in playwright.config. */
export const MENU_FIXTURE_POSITION = {
  latitude: 48.137154,
  longitude: 11.576124,
};

export interface MenuFixtureDish {
  name: string;
  description: string;
  price: number;
}

/**
 * A verified Restaurant with a menu, plus the one Bite that makes it reachable:
 * search results open a Restaurant through a Bite of that Restaurant, so a
 * Restaurant with no Bites cannot be navigated to the way a user does it.
 */
export interface MenuFixture {
  restaurantId: string;
  restaurantName: string;
  menuId: string;
  biteId: string;
  biteName: string;
  dishes: MenuFixtureDish[];
}

const position = {
  mapValue: {
    fields: {
      latitude: { doubleValue: MENU_FIXTURE_POSITION.latitude },
      longitude: { doubleValue: MENU_FIXTURE_POSITION.longitude },
    },
  },
};

const toMenuItem = (dish: MenuFixtureDish): Record<string, unknown> => ({
  mapValue: {
    fields: {
      name: { stringValue: dish.name },
      description: { stringValue: dish.description },
      price: { doubleValue: dish.price },
    },
  },
});

export const seedRestaurantWithMenu = async (
  page: Page,
  fixture: MenuFixture,
): Promise<void> => {
  await Promise.all([
    seedFirestoreDocument(page, `restaurants/${fixture.restaurantId}`, {
      id: { stringValue: fixture.restaurantId },
      name: { stringValue: fixture.restaurantName },
      description: { stringValue: 'A verified restaurant with a menu.' },
      menuId: { stringValue: fixture.menuId },
      biteIds: {
        arrayValue: { values: [{ stringValue: fixture.biteId }] },
      },
      position,
    }),
    seedFirestoreDocument(page, `menus/${fixture.menuId}`, {
      id: { stringValue: fixture.menuId },
      categories: {
        arrayValue: {
          values: [
            {
              mapValue: {
                fields: {
                  title: { stringValue: 'Mains' },
                  items: {
                    arrayValue: { values: fixture.dishes.map(toMenuItem) },
                  },
                },
              },
            },
          ],
        },
      },
    }),
    seedFirestoreDocument(page, `bites/${fixture.biteId}`, {
      id: { stringValue: fixture.biteId },
      name: { stringValue: fixture.biteName },
      place: { stringValue: fixture.restaurantName },
      restaurantId: { stringValue: fixture.restaurantId },
      price: { stringValue: '12.00' },
      currency: { stringValue: 'EUR' },
      rating: { integerValue: '4' },
      position,
      geohash: {
        stringValue: geohashForLocation([
          MENU_FIXTURE_POSITION.latitude,
          MENU_FIXTURE_POSITION.longitude,
        ]),
      },
      userId: { stringValue: TEST_USERS.organisation.uid },
      createdAt: { stringValue: new Date().toISOString() },
      createdAtTimestamp: { integerValue: String(Date.now()) },
    }),
  ]);
};

export const deleteRestaurantWithMenu = async (
  page: Page,
  fixture: MenuFixture,
): Promise<void> => {
  await deleteFirestoreDocument(page, `bites/${fixture.biteId}`);
  await deleteFirestoreDocument(page, `menus/${fixture.menuId}`);
  await deleteFirestoreDocument(page, `restaurants/${fixture.restaurantId}`);
};
