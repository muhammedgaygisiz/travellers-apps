import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { CreateBitePage } from '../pages/create-bite.page';
import { MenuPage } from '../pages/menu.page';
import { RestaurantPage } from '../pages/restaurant.page';
import { SearchPage } from '../pages/search.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  queryDocumentsByStringField,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };
const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');

/**
 * Regression cover for GitHub issue #1233: the draft a menu item prefills was
 * cached in the store, and only a successful save ever cleared it. Cancelling
 * the flow left it behind, so the next Create Bite — from Home, or from another
 * menu item — opened carrying the abandoned Restaurant and dish.
 *
 * The suite exercised the create form only from Home, so nothing covered a
 * creation session that was seeded and then abandoned.
 */
test.describe('Create a Bite from a Restaurant menu item', () => {
  test('prefills per creation session and forgets a cancelled draft', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    // The ids deliberately carry the word "menu". Deciding routes by searching
    // the URL text used to read them as a menu route, so the Restaurant was
    // never loaded on its own page and this journey could not run at all.
    const restaurantId = `menu-draft-restaurant-${runId}`;
    const restaurantName = `Menu Draft Bistro ${runId}`;
    const menuId = `menu-draft-menu-${runId}`;
    const biteId = `menu-draft-bite-${runId}`;
    const firstDish = `Amok Trey ${runId}`;
    const secondDish = `Lok Lak ${runId}`;

    await Promise.all([
      seedFirestoreDocument(page, `restaurants/${restaurantId}`, {
        id: { stringValue: restaurantId },
        name: { stringValue: restaurantName },
        description: { stringValue: 'A verified restaurant with a menu.' },
        menuId: { stringValue: menuId },
        biteIds: {
          arrayValue: { values: [{ stringValue: biteId }] },
        },
        position: {
          mapValue: {
            fields: {
              latitude: { doubleValue: POSITION.latitude },
              longitude: { doubleValue: POSITION.longitude },
            },
          },
        },
      }),
      seedFirestoreDocument(page, `menus/${menuId}`, {
        id: { stringValue: menuId },
        categories: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    title: { stringValue: 'Mains' },
                    items: {
                      arrayValue: {
                        values: [
                          {
                            mapValue: {
                              fields: {
                                name: { stringValue: firstDish },
                                description: {
                                  stringValue: 'Steamed fish curry.',
                                },
                                price: { doubleValue: 8.5 },
                              },
                            },
                          },
                          {
                            mapValue: {
                              fields: {
                                name: { stringValue: secondDish },
                                description: {
                                  stringValue: 'Pepper beef with rice.',
                                },
                                price: { doubleValue: 9.5 },
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
      seedFirestoreDocument(page, `bites/${biteId}`, {
        id: { stringValue: biteId },
        name: { stringValue: `Menu Draft Starter ${runId}` },
        place: { stringValue: restaurantName },
        restaurantId: { stringValue: restaurantId },
        price: { stringValue: '12.00' },
        currency: { stringValue: 'EUR' },
        rating: { integerValue: '4' },
        position: {
          mapValue: {
            fields: {
              latitude: { doubleValue: POSITION.latitude },
              longitude: { doubleValue: POSITION.longitude },
            },
          },
        },
        geohash: {
          stringValue: geohashForLocation([
            POSITION.latitude,
            POSITION.longitude,
          ]),
        },
        userId: { stringValue: TEST_USERS.organisation.uid },
        createdAt: { stringValue: new Date().toISOString() },
        createdAtTimestamp: { integerValue: String(runId) },
      }),
    ]);

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const search = new SearchPage(page);
    const restaurant = new RestaurantPage(page);
    const menu = new MenuPage(page);
    const createBite = new CreateBitePage(page);

    const openMenuFromHome = async (): Promise<void> => {
      await search.open();
      await search.selectCategory('Restaurant');
      await search.search(restaurantName);
      await search.expectResult(restaurantName);
      await search.openResult(restaurantName);
      await page.waitForURL(
        new RegExp(`/bite/[^/]+/restaurant/${restaurantId}$`),
      );
      await restaurant.openMenu();
    };

    /** Home → search → restaurant → menu, unwound one page at a time. */
    const returnToHome = async (): Promise<void> => {
      // Each step uses the back button of the page that is actually on top and
      // waits for that step's own URL. Ionic keeps the pages it navigated away
      // from in the DOM and animates every pop, so neither an unscoped back
      // button nor a run of `page.goBack()` lands reliably.
      const backFrom = async (
        page$: string,
        target: string | RegExp,
      ): Promise<void> => {
        await page.locator(`${page$}:visible ion-back-button`).click();
        await page.waitForURL(target);
      };

      await backFrom(
        'menu-page',
        new RegExp(`/bite/[^/]+/restaurant/${restaurantId}$`),
      );
      await backFrom('restaurant', '**/search');
      await backFrom('search-page', '**/home');
    };

    await openMenuFromHome();
    await menu.expectItem(firstDish);

    // The supported flow: the menu item seeds this creation session.
    await menu.createBiteFrom(firstDish);
    await createBite.expectPrefilledWith({
      name: firstDish,
      place: restaurantName,
      price: '8.5',
    });

    // Cancelling ends that session, and the generic Home action starts a new one
    // that inherits nothing from it. This is the defect the spec exists for: the
    // form used to open holding the abandoned Restaurant and dish.
    await createBite.cancel();
    await returnToHome();
    await createBite.open();
    await createBite.expectCleanForm();
    await createBite.cancel();
    await page.waitForURL('**/home');

    // The same for another menu item: it prefills its own dish and price rather
    // than the cancelled ones.
    await openMenuFromHome();
    await menu.createBiteFrom(secondDish);
    await createBite.expectPrefilledWith({
      name: secondDish,
      place: restaurantName,
      price: '9.5',
    });

    // A menu-derived Bite that is actually posted keeps its Restaurant and dish.
    await createBite.uploadImage(IMAGE_FIXTURE);
    await expect(createBite.post).toBeEnabled();
    await createBite.submit();

    await page.waitForURL('**/home');
    await expect(page.getByText('Bite created successfully!')).toBeVisible();

    await expect
      .poll(
        () => queryDocumentsByStringField(page, 'bites', 'name', secondDish),
        { timeout: 15_000 },
      )
      .toMatchObject([
        {
          fields: {
            name: secondDish,
            place: restaurantName,
            restaurantId,
          },
        },
      ]);

    const [savedBite] = await queryDocumentsByStringField(
      page,
      'bites',
      'name',
      secondDish,
    );

    await deleteFirestoreDocument(page, savedBite.path);
    await deleteFirestoreDocument(page, `bites/${biteId}`);
    await deleteFirestoreDocument(page, `menus/${menuId}`);
    await deleteFirestoreDocument(page, `restaurants/${restaurantId}`);
  });
});
