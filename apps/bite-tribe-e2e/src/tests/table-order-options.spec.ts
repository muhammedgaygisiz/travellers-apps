import { expect, test } from '@playwright/test';
import { listFirestoreCollection } from '../support/firestore';
import {
  TABLE_OPTIONS_FIXTURE,
  deleteOrderableTable,
  seedOrderableTable,
} from '../support/table-order-fixture';
import { TableOrderPage } from '../pages/table-order.page';

/**
 * Ordering a dish with an option, such as how hot it should be
 * (GitHub issue #2254).
 *
 * The unit and emulator specs prove each half: the row withholds its add
 * button, and the backend refuses a line without the required choice and
 * records the one it got. Only this level proves the guest's path between
 * them - the choice made on the menu is the one the kitchen receives.
 */

const FIXTURE = TABLE_OPTIONS_FIXTURE;

const ORDERS_PATH = `restaurants/${FIXTURE.restaurantId}/visits/${FIXTURE.visitId}/orders`;

test.describe.configure({ mode: 'serial' });

test.describe('ordering a dish with an option', () => {
  test.beforeEach(async ({ page }) => {
    await seedOrderableTable(page, FIXTURE);
  });

  test.afterEach(async ({ page }) => {
    await deleteOrderableTable(page, FIXTURE);
  });

  test('asks for the required choice, and sends it to the kitchen', async ({
    page,
  }) => {
    const order = new TableOrderPage(page);
    const dish = page
      .locator('menu-item')
      .filter({ hasText: FIXTURE.dishName });

    await order.scan(FIXTURE.token);
    await order.sitDown();
    await order.openMenu();

    await expect(
      dish.locator('[data-testid="menu-item-option-hint"]'),
    ).toBeVisible();
    await expect(
      dish.locator('[data-testid="menu-item-add-to-cart"]'),
    ).toHaveAttribute('aria-disabled', 'true');

    await dish
      .locator('[data-testid="menu-item-option-choice-e2e-heat-hot"]')
      .click();
    await expect(
      dish.locator('[data-testid="menu-item-option-hint"]'),
    ).toHaveCount(0);

    await order.addToCart(FIXTURE.dishName);
    await expect(page.locator('[data-testid="cart-line"]')).toContainText(
      `${FIXTURE.dishName} (Hot)`,
    );

    await order.send();
    await expect(order.confirmation).toBeVisible();
    await expect(order.orders.first()).toContainText(
      `${FIXTURE.dishName} (Hot)`,
    );

    const [placed] = await listFirestoreCollection(page, ORDERS_PATH);
    const [line] = placed['lines'] as Record<string, unknown>[];

    expect(line['options']).toEqual([
      {
        groupId: 'e2e-option-heat',
        groupName: 'How hot',
        choiceId: 'e2e-heat-hot',
        choiceName: 'Hot',
      },
    ]);
  });
});
