import { expect, test } from '@playwright/test';
import {
  getFirestoreDocument,
  listFirestoreCollection,
} from '../support/firestore';
import {
  TABLE_CLAIM_FIXTURE,
  deleteOrderableTable,
  seedOrderableTable,
} from '../support/table-order-fixture';
import { RegistrationPage } from '../pages/registration.page';
import { TableOrderPage } from '../pages/table-order.page';
import { TEST_USERS } from '../support/test-users';

/**
 * A guest who ordered anonymously and turns out to have an account already
 * (GitHub issue #1658).
 *
 * ## What only this level can prove
 *
 * The emulator spec proves the documents move, and the unit specs prove the
 * phone takes the anonymous token before it signs in. Neither can prove the
 * path a guest actually walks: tapping "create an account" with the address
 * they signed up with years ago, being offered the sign-in instead, and
 * finding the dinner they just ordered still on the screen afterwards.
 *
 * The refusal in the middle is Firebase's own - `credential-already-in-use`,
 * raised by `linkWithEmailAndPassword` against an address that belongs to
 * another account - which is not something a spec can fake convincingly.
 *
 * ## The claim
 *
 * Signing in costs the guest nothing. The order they placed as a stranger is
 * on their account, under a session named after it, and the anonymous session
 * it came from is gone.
 */

const FIXTURE = TABLE_CLAIM_FIXTURE;

const ORDERS_PATH = `restaurants/${FIXTURE.restaurantId}/visits/${FIXTURE.visitId}/orders`;
const SESSIONS_PATH = `restaurants/${FIXTURE.restaurantId}/tableSessions`;

const sessionId = (uid: string): string =>
  `${FIXTURE.tableId.length}_${FIXTURE.tableId}_${uid}`;

test.describe.configure({ mode: 'serial' });

test.describe('signing into an account you already had, mid-meal', () => {
  test.beforeEach(async ({ page }) => {
    await seedOrderableTable(page, FIXTURE);
  });

  test.afterEach(async ({ page }) => {
    await deleteOrderableTable(page, FIXTURE);
  });

  test('brings the anonymous order onto the account', async ({ page }) => {
    const order = new TableOrderPage(page);
    const registration = new RegistrationPage(page);
    const member = TEST_USERS.default;

    await order.scan(FIXTURE.token);
    await order.sitDown();
    await order.openMenu();
    await order.addToCart(FIXTURE.dishName);
    await order.send();
    await expect(order.confirmation).toBeVisible();

    const placed = await listFirestoreCollection(page, ORDERS_PATH);

    expect(placed).toHaveLength(1);

    const guestUserId = placed[0]['guestUserId'] as string;

    expect(guestUserId).not.toBe(member.uid);

    // The address of an account that already exists, which is what turns the
    // registration into the offer.
    await registration.goto();
    await registration.register(member.email, member.password);

    // The offer, rather than a dead end: the account exists, so the link
    // Firebase refused becomes a sign-in that brings the meal along.
    await page
      .locator('ion-alert button', { hasText: 'Sign in' })
      .click({ timeout: 15_000 });

    await expect(page).toHaveURL(new RegExp(`/t/${FIXTURE.token}/order$`, 'i'));

    const [moved] = await listFirestoreCollection(page, ORDERS_PATH);

    expect(moved).toMatchObject({
      guestUserId: member.uid,
      sessionId: sessionId(member.uid),
      // Nothing the guest agreed to changed with the ownership.
      total: 12,
      currency: 'EUR',
    });

    expect(
      await getFirestoreDocument(
        page,
        `${SESSIONS_PATH}/${sessionId(member.uid)}`,
      ),
    ).toMatchObject({ guestUserId: member.uid, isAnonymousGuest: false });

    expect(
      await getFirestoreDocument(
        page,
        `${SESSIONS_PATH}/${sessionId(guestUserId)}`,
      ),
    ).toBeUndefined();

    // And the guest is looking at their own order on the account they signed
    // into, which is the rules half: `guestUserId == uid()` (issue #1565).
    await expect(order.orders).toHaveCount(1);
  });
});
