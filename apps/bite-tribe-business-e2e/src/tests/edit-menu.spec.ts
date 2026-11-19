import { expect, Page, test } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';
import { EditMenuPage } from '../pages/edit-menu.page';
import { EditRestaurantPage } from '../pages/edit-restaurant.page';
import { loginAsBusinessUser } from '../support/auth';
import {
  deleteFirestoreDocument,
  getFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };

/**
 * Longer than the 500 ms the title and name fields used to wait before saving
 * on their own: the window {@link EditMenuPage.expectStaysOpen} gives the old
 * behaviour to show itself in.
 */
const LONGER_THAN_THE_OLD_AUTOSAVE = 1_200;

interface MenuFixture {
  restaurantId: string;
  restaurantName: string;
  menuId: string;
  categoryId: string;
  itemId: string;
  variantId: string;
  plainItemId: string;
}

/**
 * One restaurant held by the suite's account, with a menu of one category
 * and one item. The category has **no subtitle** on purpose: before issue
 * #1377, opening such a category made the editor save the menu on load and
 * leave, because the stored `undefined` differed from the form's `''`.
 */
const seedMenu = async (page: Page, runId: number): Promise<MenuFixture> => {
  const fixture = {
    restaurantId: `menu-restaurant-${runId}`,
    restaurantName: `Menu Bistro ${runId}`,
    menuId: `menu-${runId}`,
    categoryId: `category-${runId}`,
    itemId: `item-${runId}`,
    variantId: `variant-${runId}`,
    plainItemId: `marinara-${runId}`,
  };

  await seedFirestoreDocument(page, `menus/${fixture.menuId}`, {
    id: { stringValue: fixture.menuId },
    restaurantId: { stringValue: fixture.restaurantId },
    categories: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                id: { stringValue: `category-${runId}` },
                title: { stringValue: 'Pizza' },
                items: {
                  arrayValue: {
                    values: [
                      {
                        mapValue: {
                          fields: {
                            id: { stringValue: `item-${runId}` },
                            name: { stringValue: 'Margherita' },
                            description: { stringValue: 'Tomato, mozzarella' },
                            price: { doubleValue: 9.5 },
                            variants: {
                              arrayValue: {
                                values: [
                                  {
                                    mapValue: {
                                      fields: {
                                        id: { stringValue: `variant-${runId}` },
                                        name: { stringValue: 'Margherita' },
                                        description: { stringValue: 'Large' },
                                        price: { doubleValue: 14 },
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      },
                      {
                        mapValue: {
                          fields: {
                            id: { stringValue: `marinara-${runId}` },
                            name: { stringValue: 'Marinara' },
                            description: { stringValue: 'Tomato, garlic' },
                            price: { doubleValue: 8 },
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
    id: { stringValue: fixture.restaurantId },
    name: { stringValue: fixture.restaurantName },
    description: { stringValue: '' },
    menuId: { stringValue: fixture.menuId },
    ownerUserIds: {
      arrayValue: { values: [{ stringValue: TEST_USERS.organisation.uid }] },
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

  return fixture;
};

type StoredItem = {
  name: string;
  price: number;
  isAvailable?: boolean;
  variants?: StoredItem[];
};
type StoredCategory = { title: string; items: StoredItem[] };

const storedCategory = async (
  page: Page,
  menuId: string,
): Promise<StoredCategory | undefined> => {
  const menu = await getFirestoreDocument(page, `menus/${menuId}`);
  const categories = menu?.['categories'] as StoredCategory[] | undefined;

  return categories?.[0];
};

const openEditor = async (
  page: Page,
  fixture: MenuFixture,
): Promise<EditMenuPage> => {
  const dashboard = new DashboardPage(page);
  await dashboard.openRestaurants();
  await dashboard.openRestaurant(fixture.restaurantName, fixture.restaurantId);
  await new EditRestaurantPage(page).expectRestaurantName(
    fixture.restaurantName,
  );

  const editMenu = new EditMenuPage(page);
  await editMenu.open(fixture.restaurantId, fixture.menuId);
  await expect(page.getByTestId(`menu-dish-${fixture.itemId}`)).toBeVisible();

  return editMenu;
};

/**
 * Menu editing in the business app: the menu is a list, and a dish or a
 * category opens its own editor that saves when the owner says so (issues
 * #1377 and #2182).
 */
test.describe('Edit a menu in the business app', () => {
  const seeded: string[] = [];

  test.afterEach(async ({ page }) => {
    const paths = seeded.splice(0);

    await Promise.all(paths.map((path) => deleteFirestoreDocument(page, path)));
  });

  const start = async (
    page: Page,
  ): Promise<{
    fixture: MenuFixture;
    editMenu: EditMenuPage;
  }> => {
    const fixture = await seedMenu(page, Date.now());
    seeded.push(
      `restaurants/${fixture.restaurantId}`,
      `menus/${fixture.menuId}`,
    );

    await loginAsBusinessUser(page);

    return { fixture, editMenu: await openEditor(page, fixture) };
  };

  test('renames a category only when the owner saves it', async ({ page }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page);

    await editMenu.openCategory(fixture.categoryId);
    await expect(editMenu.categoryTitle).toHaveValue('Pizza');

    // Typing and pausing saves nothing and keeps the editor open.
    await editMenu.categoryTitle.fill('Pizz');
    await editMenu.expectStaysOpen(LONGER_THAN_THE_OLD_AUTOSAVE);
    expect((await storedCategory(page, fixture.menuId))?.title).toBe('Pizza');

    // A cleared title stays cleared, and cannot be saved.
    await editMenu.categoryTitle.fill('');
    await expect(editMenu.categoryTitle).toHaveValue('');
    await editMenu.expectDisabled(editMenu.saveCategory);

    await editMenu.categoryTitle.fill('Pizze napoletane');
    await editMenu.expectEnabled(editMenu.saveCategory);
    await editMenu.saveCategory.click();

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect
      .poll(async () => (await storedCategory(page, fixture.menuId))?.title, {
        timeout: 15_000,
      })
      .toBe('Pizze napoletane');
  });

  /**
   * A dish written before variants had names: its own price becomes a first
   * variant the owner names, and its variant's description becomes its name.
   */
  test('names the variants of an older dish and saves them', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page);

    await editMenu.openDish(fixture.itemId);
    await expect(editMenu.dishName).toHaveValue('Margherita');
    await expect(editMenu.variantName(0)).toHaveValue('');
    await expect(editMenu.variantPrice(0)).toHaveValue('9.5');
    await expect(editMenu.variantName(1)).toHaveValue('Large');
    await expect(editMenu.variantPrice(1)).toHaveValue('14');
    await editMenu.expectDisabled(editMenu.saveDish);

    await editMenu.variantName(0).fill('Regular');
    await editMenu.expectEnabled(editMenu.saveDish);
    await editMenu.saveDish.click();

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect
      .poll(
        async () => {
          const item = (await storedCategory(page, fixture.menuId))?.items[0];

          return {
            price: item?.price,
            variants: item?.variants?.map(({ name, price }) => [name, price]),
          };
        },
        { timeout: 15_000 },
      )
      .toEqual({
        price: 0,
        variants: [
          ['Regular', 9.5],
          ['Large', 14],
        ],
      });
  });

  test('refuses an empty or zero price and saves a real one', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page);

    await editMenu.openDish(fixture.plainItemId);
    await expect(editMenu.dishPrice).toHaveValue('8');

    await editMenu.dishPrice.fill('0');
    await editMenu.expectDisabled(editMenu.saveDish);

    await editMenu.dishPrice.fill('');
    await editMenu.expectDisabled(editMenu.saveDish);

    await editMenu.dishPrice.fill('12.5');
    await editMenu.expectEnabled(editMenu.saveDish);
    await editMenu.saveDish.click();

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect
      .poll(
        async () =>
          (await storedCategory(page, fixture.menuId))?.items[1]?.price,
        { timeout: 15_000 },
      )
      .toBe(12.5);
  });

  test('switches a variant off from the list', async ({ page }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page);

    await editMenu.variantToggle(fixture.variantId).click();

    await expect
      .poll(
        async () =>
          (await storedCategory(page, fixture.menuId))?.items[0]?.variants?.[0]
            ?.isAvailable,
        { timeout: 15_000 },
      )
      .toBe(false);
  });
});
