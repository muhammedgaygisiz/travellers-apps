import { expect, test } from '@playwright/test';
import { loginAs } from '../support/auth';
import {
  deleteDocument,
  findBiteTrailsByName,
  seedBite,
} from '../support/emulators';
import { TEST_USERS } from '../support/test-users';

/**
 * Creating a BiteTrail in the Bite Creator app (GitHub issue #2130).
 *
 * Signed in with an account holding no role, because creating a BiteTrail
 * needs none (`RD-UR-4`); and again with a `business` account, which keeps the
 * ability it had in the business app, through this surface.
 */
for (const [label, user] of [
  ['an account holding no role', TEST_USERS.withoutRoles],
  ['a business account', TEST_USERS.business],
] as const) {
  test.describe(`Create BiteTrail as ${label}`, () => {
    const stamp = `${Date.now()}-${user.uid.slice(0, 6)}`;
    const biteId = `e2e-creator-bite-${stamp}`;
    const biteName = `E2E Creator Bite ${stamp}`;
    const trailName = `E2E Creator Trail ${stamp}`;
    let trailId: string | undefined;

    test.beforeEach(async ({ page }) => {
      await seedBite(page, biteId, user.uid, biteName);
    });

    test.afterEach(async ({ page }) => {
      await deleteDocument(page, `bites/${biteId}`);
      if (trailId) {
        await deleteDocument(page, `biteTrails/${trailId}`);
      }
    });

    test('creates a BiteTrail from its own Bite and lists it', async ({
      page,
    }) => {
      await loginAs(page, user);

      await page.getByTestId('create-bite-trail').click();
      await expect(page).toHaveURL(/\/create-bite-trail$/);

      await page
        .locator('ion-input[formcontrolname="name"] input')
        .fill(trailName);
      await page
        .locator('create-bite-trail-page ion-item', { hasText: biteName })
        .click();

      // The button enables on the next render after the Bite is ticked, and a
      // click on a disabled `ion-button` is swallowed without an error. Scoped
      // to the form: Ionic keeps the list page, and its own Create button, in
      // the DOM underneath.
      const create = page.locator('create-bite-trail-page ion-button', {
        hasText: 'Create Bite Trail',
      });
      await expect(create).not.toHaveAttribute('disabled');
      await create.click();

      // Back on the list once the write has landed.
      await expect(page).toHaveURL(/\/bite-trails$/, { timeout: 30_000 });
      await expect(page.getByTestId('bite-trails-list')).toContainText(
        trailName,
      );

      const [trail] = await findBiteTrailsByName(page, trailName);
      trailId = trail?.id;

      // The document shape the business app wrote, owned by the signed-in
      // account.
      expect(trail.ownerId).toBe(user.uid);
      expect(trail.biteIds).toEqual([biteId]);
      expect(trail.fieldNames).toEqual(
        expect.arrayContaining([
          'ownerId',
          'ownerName',
          'name',
          'biteIds',
          'price',
          'currency',
          'createdAtTimestamp',
        ]),
      );
    });
  });
}
