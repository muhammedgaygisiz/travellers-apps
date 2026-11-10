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

type StoredItem = { name: string; price: number; variants?: StoredItem[] };
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
  await expect(editMenu.categoryTitle).toHaveValue('Pizza');

  return editMenu;
};

/**
 * Menu editing in the business app (issue #1377): the category title and the
 * item name save when the owner says so, and not on a pause in typing.
 *
 * Before the fix, a title saved itself 500 ms after the last keystroke and the
 * save took the owner out of the editor mid-word, a cleared title refilled
 * itself so `required` never showed, and a renamed item was never saved at all.
 * A save now keeps the owner in the editor and reports itself with a toast.
 */
test.describe('Edit a menu in the business app', () => {
  const seeded: string[] = [];

  test.afterEach(async ({ page }) => {
    const paths = seeded.splice(0);

    await Promise.all(paths.map((path) => deleteFirestoreDocument(page, path)));
  });

  test('renames a category only when the owner saves it', async ({ page }) => {
    test.setTimeout(90_000);

    const fixture = await seedMenu(page, Date.now());
    seeded.push(
      `restaurants/${fixture.restaurantId}`,
      `menus/${fixture.menuId}`,
    );

    await loginAsBusinessUser(page);
    const editMenu = await openEditor(page, fixture);

    // Opening a category without a subtitle no longer saves and leaves.
    await editMenu.expectStaysOpen(
      fixture.restaurantId,
      fixture.menuId,
      LONGER_THAN_THE_OLD_AUTOSAVE,
    );

    // Typing and pausing saves nothing and stays in the editor.
    await editMenu.categoryTitle.fill('Pizz');
    await editMenu.expectStaysOpen(
      fixture.restaurantId,
      fixture.menuId,
      LONGER_THAN_THE_OLD_AUTOSAVE,
    );
    expect((await storedCategory(page, fixture.menuId))?.title).toBe('Pizza');

    // A cleared title stays cleared, and cannot be saved.
    await editMenu.categoryTitle.fill('');
    await editMenu.expectStaysOpen(
      fixture.restaurantId,
      fixture.menuId,
      LONGER_THAN_THE_OLD_AUTOSAVE,
    );
    await expect(editMenu.categoryTitle).toHaveValue('');
    await editMenu.expectDisabled(editMenu.saveCategoryTitle);

    await editMenu.categoryTitle.fill('Pizze napoletane');
    await editMenu.expectEnabled(editMenu.saveCategoryTitle);
    await editMenu.saveCategoryTitle.click();

    await editMenu.expectSaved(
      fixture.restaurantId,
      fixture.menuId,
      editMenu.saveCategoryTitle,
    );
    await expect(editMenu.categoryTitle).toHaveValue('Pizze napoletane');
    await expect
      .poll(async () => (await storedCategory(page, fixture.menuId))?.title, {
        timeout: 15_000,
      })
      .toBe('Pizze napoletane');
  });

  test('saves a renamed item, and its variant with it', async ({ page }) => {
    test.setTimeout(90_000);

    const fixture = await seedMenu(page, Date.now());
    seeded.push(
      `restaurants/${fixture.restaurantId}`,
      `menus/${fixture.menuId}`,
    );

    await loginAsBusinessUser(page);
    const editMenu = await openEditor(page, fixture);
    await expect(editMenu.itemName).toHaveValue('Margherita');

    await editMenu.itemName.fill('');
    await editMenu.expectDisabled(editMenu.saveItemName);

    await editMenu.itemName.fill('Pizza Margherita');
    await editMenu.expectEnabled(editMenu.saveItemName);
    await editMenu.saveItemName.click();

    await editMenu.expectSaved(
      fixture.restaurantId,
      fixture.menuId,
      editMenu.saveItemName,
    );
    await expect
      .poll(
        async () => {
          const item = (await storedCategory(page, fixture.menuId))?.items[0];

          return [item?.name, item?.variants?.[0]?.name];
        },
        { timeout: 15_000 },
      )
      .toEqual(['Pizza Margherita', 'Pizza Margherita']);
  });

  test('refuses an empty or zero price and saves a real one', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const fixture = await seedMenu(page, Date.now());
    seeded.push(
      `restaurants/${fixture.restaurantId}`,
      `menus/${fixture.menuId}`,
    );

    await loginAsBusinessUser(page);
    const editMenu = await openEditor(page, fixture);
    const price = editMenu.itemPrice();
    const save = editMenu.saveItemDetails();

    await expect(price).toHaveValue('9.5');

    await price.fill('0');
    await editMenu.expectDisabled(save);

    await price.fill('');
    await editMenu.expectDisabled(save);

    await price.fill('12.5');
    await editMenu.expectEnabled(save);
    await save.click();

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId, save);
    await expect(price).toHaveValue('12.5');
    await expect
      .poll(
        async () =>
          (await storedCategory(page, fixture.menuId))?.items[0]?.price,
        { timeout: 15_000 },
      )
      .toBe(12.5);
  });
});
