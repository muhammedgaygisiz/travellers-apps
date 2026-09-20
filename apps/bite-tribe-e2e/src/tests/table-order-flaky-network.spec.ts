import { expect, Page, test } from '@playwright/test';
import { listFirestoreCollection } from '../support/firestore';
import {
  TABLE_ORDER_FIXTURE,
  deleteOrderableTable,
  seedOrderableTable,
} from '../support/table-order-fixture';
import { TableOrderPage } from '../pages/table-order.page';

/**
 * A guest ordering over a restaurant's wifi (GitHub issue #1108).
 *
 * ## What only this level can prove
 *
 * The emulator spec proves the backend answers one key with one order, and the
 * unit specs prove the phone sends the same key every time. Neither can prove
 * the thing the issue is actually about, which is what happens when a request
 * *arrives* and the answer does not come back - because that failure lives in
 * the wire between them.
 *
 * So the wire is where it is injected. Playwright forwards each submission to
 * the real callable and then fails the client's fetch, which is exactly the
 * shape of a restaurant's wifi dropping a response: the kitchen has the order
 * and the phone has nothing.
 *
 * ## The two claims
 *
 * **No duplicate reaches the restaurant.** Three automatic attempts and one the
 * guest makes by hand, every one of them delivered to the backend, and one
 * order under the visit at the end of it.
 *
 * **The guest is never left unsure.** The screen says it could not confirm the
 * order rather than pretending either way, the way out is a button, and the
 * answer tells a retry that found its own order apart from a fresh send.
 */

const FIXTURE = TABLE_ORDER_FIXTURE;

const ORDERS_PATH = `restaurants/${FIXTURE.restaurantId}/visits/${FIXTURE.visitId}/orders`;

/**
 * Lets a submission reach the backend and drops the answer on the way home.
 *
 * `route.fetch()` performs the request for real, and the abort after it is what
 * the guest's phone sees. Calling it a network failure rather than refusing the
 * request is the whole point: an order that never arrived is a case the key
 * does not have to solve.
 */
const swallowTheAnswer = (page: Page, delivered: () => void): Promise<void> =>
  page.route('**/submitTableOrder*', async (route) => {
    await route.fetch();
    delivered();
    await route.abort('failed');
  });

/**
 * Both tests seat a party at the same table, and the fixture is torn down after
 * each - so they cannot run at the same time: one test's cleanup deletes the
 * restaurant the other is ordering from, and the screen it lands on says the
 * restaurant is no longer on BiteTribe. Playwright runs a file's tests in
 * parallel by default, which made that a matter of how many workers were free.
 */
test.describe.configure({ mode: 'serial' });

test.describe('ordering at a table over a network that drops answers', () => {
  let order: TableOrderPage;

  test.beforeEach(async ({ page }) => {
    await seedOrderableTable(page);
    order = new TableOrderPage(page);
  });

  test.afterEach(async ({ page }) => {
    await deleteOrderableTable(page);
  });

  test('a lost answer is recovered without ordering twice', async ({
    page,
  }) => {
    let delivered = 0;

    await swallowTheAnswer(page, () => (delivered += 1));

    await order.scan(FIXTURE.token);
    await order.sitDown();
    await order.openMenu();
    await order.addToCart(FIXTURE.dishName);
    await order.send();

    // The phone gives up saying, rather than saying the wrong thing. Every
    // attempt reached the restaurant, and the guest is told the screen cannot
    // tell whether it did.
    await expect(order.unconfirmed).toBeVisible();
    await expect(order.unconfirmed).toContainText(FIXTURE.restaurantName);
    expect(delivered).toBeGreaterThan(1);

    // The wifi comes back, and the guest asks. The tap sends the same key, so
    // it is a question rather than a second dinner.
    await page.unroute('**/submitTableOrder*');
    await order.send();

    await expect(order.confirmation).toBeVisible();
    await expect(order.alreadyPlaced).toBeVisible();
    await expect(order.orders).toHaveCount(1);

    expect(await listFirestoreCollection(page, ORDERS_PATH)).toHaveLength(1);
  });

  /**
   * The cart is the other half of "recoverable without rebuilding it". A guest
   * whose tab was dropped mid-meal comes back to the dishes they chose rather
   * than to an empty screen and a menu to walk again.
   */
  test('a cart built before a reload is still there afterwards', async ({
    page,
  }) => {
    await order.scan(FIXTURE.token);
    await order.sitDown();
    await order.openMenu();
    await order.addToCart(FIXTURE.dishName);

    await page.reload();

    await expect(page.locator('[data-testid="cart-line"]')).toContainText(
      FIXTURE.dishName,
    );
  });
});
