import { expect, Page, test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TablePlanPage } from '../pages/table-plan.page';
import {
  deleteFirestoreDocument,
  seedFirestoreDocument,
} from '../support/firestore';
import { deleteFloorPlan, seedPublishedPlan } from '../support/floor-plan';
import { TEST_USERS } from '../support/test-users';

const DINING = { id: 'dining-room', name: 'Main dining room' } as const;

const TABLES = [
  { id: 'table-1', label: '1', roomId: DINING.id, seats: 4 },
  { id: 'table-2', label: '2', roomId: DINING.id, seats: 2 },
] as const;

/**
 * What a staff account may reach, and where it starts:
 * [[UC - Manage Tables During Service]], issue \#1097.
 *
 * Every other business journey signs in as the organisation account, which
 * holds `business` and owns its restaurants. This one signs in as the narrowed
 * role, and the narrowing is almost entirely made of refusals - so most of what
 * is below is a deny case, and the allow case is the single thing the role
 * exists for.
 *
 * The account is seeded with `{"roles":["staff"]}` and **not** `business`. The
 * claim alone reaches nothing: `worksAt()` in `firestore.rules` wants the claim
 * *and* the association naming this restaurant, which is why the association is
 * written per run and deleted at the end of the revocation case rather than
 * exported alongside the account.
 */
test.describe('Staff entry and permissions', () => {
  /**
   * Serial, because the association is one document named by the account's uid
   * and there is one staff account.
   *
   * That is not a limitation of the fixture, it is the feature: issue #1537
   * fixed one restaurant per staff account, and `/restaurantStaff/{uid}` is
   * how. Two of these running at once would be two restaurants for one waiter,
   * which the product refuses - so they queue instead.
   */
  test.describe.configure({ mode: 'serial' });

  /** The restaurant this run seeded its published plan under. */
  let restaurantId: string | undefined;

  test.afterEach(async ({ page }) => {
    const seeded = restaurantId;

    restaurantId = undefined;

    await deleteFirestoreDocument(
      page,
      `restaurantStaff/${TEST_USERS.staff.uid}`,
    ).catch(() => undefined);

    if (seeded) {
      await deleteFloorPlan(page, seeded);
    }
  });

  /**
   * The acceptance criterion: one step after sign-in, and the step is not a
   * link a waiter has to be told about.
   *
   * `AFTER_LOGIN_PAGE` sends every account to `/dashboard`, which lists
   * restaurants by `Restaurant.ownerUserId` and therefore showed this account
   * an empty page. The assertion is on the URL the browser settles at, so a
   * dashboard that rendered first and redirected afterwards would still pass -
   * which is fine, because what the criterion is about is where the account
   * ends up, and the `expect` that follows proves the room actually drew.
   */
  test('lands a staff account in the room it works in', async ({ page }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    restaurantId = `staff-entry-restaurant-${runId}`;

    await seedPlan(page, restaurantId, `Staff Bistro ${runId}`);
    await seedStaffAssociation(page, restaurantId);

    await signInAsStaff(page);

    await expect(page).toHaveURL(
      new RegExp(`/restaurant/${restaurantId}/tables$`),
    );

    const tables = new TablePlanPage(page);
    await expect(tables.live).toContainText('Live');
    await expect(tables.table('table-1')).toBeVisible();
  });

  /**
   * The other half of the same criterion. An account that works nowhere has no
   * room to be sent to, so it is left on the page it asked for rather than
   * redirected into a refusal - the entry guard decides where to go, never
   * whether to allow.
   */
  test('leaves a staff account with no restaurant on the dashboard', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await signInAsStaff(page);

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  /**
   * "Denied by the security rules, not only by hidden UI": the editor, the QR
   * sheet, the menu and the staff list are the owner's, and a staff account
   * reaching them by URL is refused rather than shown an empty page.
   *
   * The refusal is `ownedRestaurantGuard`, which reads
   * `Restaurant.ownerUserId`. The data-layer half of the same boundary is in
   * `firestore-rules.emulator-spec.ts`, where the write itself is refused.
   */
  test('refuses the owner routes by direct URL', async ({ page }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    restaurantId = `staff-denied-restaurant-${runId}`;

    await seedPlan(page, restaurantId, `Staff Bistro ${runId}`);
    await seedStaffAssociation(page, restaurantId);

    await signInAsStaff(page);
    await expect(page).toHaveURL(
      new RegExp(`/restaurant/${restaurantId}/tables$`),
    );

    for (const path of [
      `/restaurant/${restaurantId}/floor-plan`,
      `/restaurant/${restaurantId}/floor-plan/qr-codes`,
      `/restaurant/${restaurantId}/staff`,
    ]) {
      await page.goto(path);

      await expect(page).not.toHaveURL(new RegExp(`${path}$`));
    }
  });

  /**
   * "Revoking a staff member ends their access within one token refresh", and
   * at the routing layer it does not even take that long.
   *
   * The session is untouched here: the ID token still carries `staff`, exactly
   * as it would for the up-to-an-hour window before it refreshes. What is gone
   * is the association, and both `restaurantAccessGuard` and `worksAt()` in
   * the rules want both halves - so the very next navigation is refused.
   */
  test('ends access as soon as the association is removed', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    restaurantId = `staff-revoked-restaurant-${runId}`;

    await seedPlan(page, restaurantId, `Staff Bistro ${runId}`);
    await seedStaffAssociation(page, restaurantId);

    await signInAsStaff(page);
    await expect(page).toHaveURL(
      new RegExp(`/restaurant/${restaurantId}/tables$`),
    );

    await deleteFirestoreDocument(
      page,
      `restaurantStaff/${TEST_USERS.staff.uid}`,
    );

    await page.goto(`/restaurant/${restaurantId}/tables`);

    await expect(page).not.toHaveURL(
      new RegExp(`/restaurant/${restaurantId}/tables$`),
    );
  });
});

const signInAsStaff = async (page: Page): Promise<void> => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(TEST_USERS.staff.email, TEST_USERS.staff.password);
};

/**
 * The restaurant is owned by the **organisation** account, not by the staff
 * one. That is the whole point: a staff account never appears on
 * `Restaurant.ownerUserId`, and everything it reaches, it reaches through the
 * association instead.
 */
const seedPlan = (
  page: Page,
  restaurantId: string,
  restaurantName: string,
): Promise<void> =>
  seedPublishedPlan(page, {
    restaurantId,
    restaurantName,
    ownerUserId: TEST_USERS.organisation.uid,
    rooms: [DINING],
    tables: TABLES,
  });

/**
 * Written straight to the emulator rather than through `addRestaurantStaff`,
 * because the callable also writes the custom claim and the claim is already in
 * the seeded auth export. Going through it would mint a second identical claim
 * and make every run depend on the functions emulator for a fixture.
 */
const seedStaffAssociation = (
  page: Page,
  restaurantId: string,
): Promise<void> =>
  seedFirestoreDocument(page, `restaurantStaff/${TEST_USERS.staff.uid}`, {
    userId: { stringValue: TEST_USERS.staff.uid },
    restaurantId: { stringValue: restaurantId },
    addedBy: { stringValue: TEST_USERS.organisation.uid },
    addedAt: { stringValue: new Date().toISOString() },
    addedAtTimestamp: { integerValue: String(Date.now()) },
  });
