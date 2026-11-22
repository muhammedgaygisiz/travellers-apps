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

/** The one extra the seed gives a category, when asked to (issue #2258). */
const EXTRA_ID = 'extra-mozzarella';

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
const seedMenu = async (
  page: Page,
  runId: string,
  { derivedFromBites = false, withExtras = false } = {},
): Promise<MenuFixture> => {
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
    ...(derivedFromBites
      ? {
          derivedFromBites: { booleanValue: true },
          currency: { stringValue: 'CHF' },
        }
      : {}),
    categories: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                id: { stringValue: `category-${runId}` },
                title: { stringValue: 'Pizza' },
                ...(withExtras
                  ? {
                      extrasBlock: {
                        mapValue: {
                          fields: {
                            description: { stringValue: 'Add to any pizza' },
                            extras: {
                              arrayValue: {
                                values: [
                                  {
                                    mapValue: {
                                      fields: {
                                        id: { stringValue: EXTRA_ID },
                                        name: {
                                          stringValue: 'Extra mozzarella',
                                        },
                                        price: { doubleValue: 2 },
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      },
                    }
                  : {}),
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
type StoredCategory = {
  title: string;
  items: StoredItem[];
  extrasBlock?: { extras: { name: string; price: number }[] };
};

const storedCategories = async (
  page: Page,
  menuId: string,
): Promise<StoredCategory[] | undefined> => {
  const menu = await getFirestoreDocument(page, `menus/${menuId}`);

  return menu?.['categories'] as StoredCategory[] | undefined;
};

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
    options: { derivedFromBites?: boolean; withExtras?: boolean } = {},
  ): Promise<{
    fixture: MenuFixture;
    editMenu: EditMenuPage;
  }> => {
    // Unique per test, not per millisecond: the tests in this file run in
    // parallel and each deletes its menu afterwards, so two tests that start
    // in the same millisecond would share a menu and delete it under each
    // other (seen while adding the delete tests, issue #2181).
    const fixture = await seedMenu(
      page,
      `${Date.now()}-${test.info().parallelIndex}`,
      options,
    );
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
   * An extra is saved with its category, like every other menu change, and
   * Cancel throws an edit away (GitHub issue #2258). It used to save itself
   * the moment a field was left.
   */
  test('saves an edited extra only with the category', async ({ page }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page, { withExtras: true });
    const storedExtraPrice = async (): Promise<number | undefined> =>
      (await storedCategory(page, fixture.menuId))?.extrasBlock?.extras[0]
        ?.price;

    await editMenu.openCategory(fixture.categoryId);
    await expect(editMenu.extraPrice(EXTRA_ID)).toHaveValue('2.00');
    await editMenu.expectDisabled(editMenu.saveCategory);

    // Leaving the field saves nothing, and offers the category's Save.
    await editMenu.extraPrice(EXTRA_ID).fill('2.2');
    await editMenu.extraPrice(EXTRA_ID).blur();
    await editMenu.expectEnabled(editMenu.saveCategory);
    await editMenu.expectStaysOpen(LONGER_THAN_THE_OLD_AUTOSAVE);
    expect(await storedExtraPrice()).toBe(2);

    await editMenu.saveCategory.click();

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect.poll(storedExtraPrice, { timeout: 15_000 }).toBe(2.2);
  });

  /**
   * The last extra removed leaves no extras field at all: a field written as
   * `undefined` is refused by Firestore, and the whole menu save with it.
   */
  test('removes the last extra with the category', async ({ page }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page, { withExtras: true });

    await editMenu.openCategory(fixture.categoryId);
    await page.getByTestId(`category-extra-remove-${EXTRA_ID}`).click();
    await editMenu.expectEnabled(editMenu.saveCategory);
    await editMenu.saveCategory.click();

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect
      .poll(
        async () =>
          (await storedCategory(page, fixture.menuId))?.extrasBlock ?? null,
        { timeout: 15_000 },
      )
      .toBeNull();
  });

  test('throws an edited extra away on Cancel', async ({ page }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page, { withExtras: true });

    await editMenu.openCategory(fixture.categoryId);
    await editMenu.extraPrice(EXTRA_ID).fill('3');
    await editMenu.extraPrice(EXTRA_ID).blur();
    await editMenu.expectEnabled(editMenu.saveCategory);

    await editMenu.cancelCategory.click();
    await expect(editMenu.editorPanel).toHaveCount(0);
    expect(
      (await storedCategory(page, fixture.menuId))?.extrasBlock?.extras[0]
        ?.price,
    ).toBe(2);

    await editMenu.openCategory(fixture.categoryId);
    await expect(editMenu.extraPrice(EXTRA_ID)).toHaveValue('2.00');
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

  /** Variants keep the order the owner gives them (GitHub issue #2256). */
  test('saves the variants in the order the owner moved them to', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page);

    await editMenu.openDish(fixture.itemId);
    await editMenu.variantName(0).fill('Regular');
    await editMenu.moveVariantDown(0).click();
    await expect(editMenu.variantName(0)).toHaveValue('Large');
    await expect(editMenu.variantName(1)).toHaveValue('Regular');
    await editMenu.saveDish.click();

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect
      .poll(
        async () =>
          (await storedCategory(page, fixture.menuId))?.items[0]?.variants?.map(
            ({ name, price }) => [name, price],
          ),
        { timeout: 15_000 },
      )
      .toEqual([
        ['Large', 14],
        ['Regular', 9.5],
      ]);

    await page.reload();
    await editMenu.openDish(fixture.itemId);
    await expect(editMenu.variantName(0)).toHaveValue('Large');
    await expect(editMenu.variantName(1)).toHaveValue('Regular');
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

  /** See GitHub issue #2181. */
  /**
   * The restaurant's name above the menu, opened by URL (issue #2231): a
   * reload of the editor and Guest Bites opened directly both used to lose it,
   * because only navigating from the overview had put the restaurant in the
   * store.
   */
  test('shows the restaurant name on the menu pages after a reload', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { fixture } = await start(page);
    const name = page.getByTestId('menu-restaurant-name');

    await expect(name).toHaveText(fixture.restaurantName);

    await page.reload();
    await expect(name).toHaveText(fixture.restaurantName, { timeout: 20_000 });

    await page.goto(
      `/restaurant/${fixture.restaurantId}/menu/${fixture.menuId}/guest-bites`,
    );
    await expect(name).toHaveText(fixture.restaurantName, { timeout: 20_000 });
  });

  test('deletes a dish after asking, and it stays deleted after a reload', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { fixture, editMenu } = await start(page);

    await editMenu.openDish(fixture.plainItemId);
    await editMenu.deleteOpen('dish');

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect
      .poll(
        async () =>
          (await storedCategory(page, fixture.menuId))?.items.map(
            (item) => item.name,
          ),
        { timeout: 15_000 },
      )
      .toEqual(['Margherita']);

    // The reloaded page reads the stored menu again: the kept dish is back,
    // the deleted one is not.
    await page.reload();
    await expect(page.getByTestId(`menu-dish-${fixture.itemId}`)).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByTestId(`menu-dish-${fixture.plainItemId}`),
    ).toHaveCount(0);
  });

  test('deletes a category with its dishes after asking', async ({ page }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page);

    await editMenu.openCategory(fixture.categoryId);
    await editMenu.deleteOpen('category');

    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect
      .poll(async () => await storedCategories(page, fixture.menuId), {
        timeout: 15_000,
      })
      .toEqual([]);
  });

  /** See GitHub issue #2214. */
  test('takes a menu built from Bites as the restaurant’s only when the owner confirms it', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const { fixture, editMenu } = await start(page, { derivedFromBites: true });
    const notice = page.getByTestId('menu-derived-notice');
    await expect(notice).toBeVisible();

    // A save is not the confirmation.
    await editMenu.openCategory(fixture.categoryId);
    await editMenu.categoryTitle.fill('Pizze');
    await editMenu.saveCategory.click();
    await editMenu.expectSaved(fixture.restaurantId, fixture.menuId);
    await expect
      .poll(async () => (await storedCategory(page, fixture.menuId))?.title, {
        timeout: 15_000,
      })
      .toBe('Pizze');
    expect(
      (await getFirestoreDocument(page, `menus/${fixture.menuId}`))?.[
        'derivedFromBites'
      ],
    ).toBe(true);
    await expect(notice).toBeVisible();

    await editMenu.confirmOwnMenu();

    await expect(notice).toBeHidden();
    const menu = await getFirestoreDocument(page, `menus/${fixture.menuId}`);
    expect(menu?.['derivedFromBites']).toBeUndefined();
    expect(menu?.['currency']).toBe('CHF');
    expect((menu?.['categories'] as StoredCategory[])[0].items).toHaveLength(2);
  });
});
