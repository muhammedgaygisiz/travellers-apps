import { expect, test } from '@playwright/test';
import {
  getFirestoreDocument,
  listFirestoreCollection,
} from '../support/firestore';
import {
  TABLE_GUEST_FIXTURE,
  deleteOrderableTable,
  seedOrderableTable,
} from '../support/table-order-fixture';
import { OnboardingPage } from '../pages/onboarding.page';
import { RegistrationPage } from '../pages/registration.page';
import { TableOrderPage } from '../pages/table-order.page';

/**
 * A guest who orders at a table and then registers (GitHub issue #1657).
 *
 * ## What only this level can prove
 *
 * The unit specs prove the client calls `linkWith*` instead of
 * `createUserWithEmailAndPassword` when the session is anonymous, and the
 * callable spec proves a linked account gets the profile its trigger never
 * wrote. Neither can prove the thing the issue is about: that the account the
 * guest ends up with is the account that ordered.
 *
 * That is one uid seen from three sides - the order the kitchen holds, the
 * `/users` document the product reads, and the screen the guest is looking at -
 * and only a real browser against a real emulator has all three.
 *
 * ## The claim
 *
 * The meal survives registering. Same uid on the order, a profile that says it
 * is the registered account, and the guest's own order still on their screen
 * afterwards - which is the half `firestore.rules` decides, because a member
 * reads `visits/{visitId}/orders` through `guestUserId == uid()` exactly as
 * the guest did (issue #1565).
 */

const FIXTURE = TABLE_GUEST_FIXTURE;

const ORDERS_PATH = `restaurants/${FIXTURE.restaurantId}/visits/${FIXTURE.visitId}/orders`;

test.describe('registering during a table visit', () => {
  test.beforeEach(async ({ page }) => {
    await seedOrderableTable(page, FIXTURE);
  });

  test.afterEach(async ({ page }) => {
    await deleteOrderableTable(page, FIXTURE);
  });

  test('keeps the meal on the account the guest creates', async ({ page }) => {
    const order = new TableOrderPage(page);
    const registration = new RegistrationPage(page);
    const onboarding = new OnboardingPage(page);

    // The auth emulator keeps accounts for the whole session, so a fixed
    // address would meet an existing account on the second run - which is the
    // *other* issue's case (#1658) rather than this one's.
    const email = `e2e-table-guest-${Date.now()}@test.com`;
    const password = 'Test4711';

    await order.scan(FIXTURE.token);
    await order.sitDown();
    await order.openMenu();
    await order.addToCart(FIXTURE.dishName);
    await order.send();
    await expect(order.confirmation).toBeVisible();

    const placed = await listFirestoreCollection(page, ORDERS_PATH);

    // One, and from this run: the fixture empties the subcollection after each
    // test, so a second order here would mean leftovers rather than a bug in
    // the flow, and every assertion below would be about the wrong meal.
    expect(placed).toHaveLength(1);

    const guestUserId = placed[0]['guestUserId'] as string;

    expect(guestUserId).toBeTruthy();
    expect(await getFirestoreDocument(page, `users/${guestUserId}`)).toBe(
      // A guest leaves no profile behind: `createUserOnAuthCreate` skips an
      // anonymous sign-up, which is what makes the callable necessary below.
      undefined,
    );

    await registration.goto();
    await registration.register(email, password);
    await onboarding.expectVisible();
    await onboarding.complete();
    await expect(page).toHaveURL(/\/home$/);

    // The uid did not change, so the order the kitchen holds still names the
    // account the guest is now signed into.
    const [afterRegistering] = await listFirestoreCollection(page, ORDERS_PATH);

    expect(afterRegistering['guestUserId']).toBe(guestUserId);

    // And the profile exists under that same uid, written by
    // `upgradeGuestAccount` because linking fires no blocking trigger.
    expect(
      await getFirestoreDocument(page, `users/${guestUserId}`),
    ).toMatchObject({ userId: guestUserId, email });

    // The guest's own screen, read as a member: same session, same order.
    await order.scan(FIXTURE.token);
    await order.sitDown();
    await order.openMenu();
    await expect(order.orders).toHaveCount(1);
  });
});
