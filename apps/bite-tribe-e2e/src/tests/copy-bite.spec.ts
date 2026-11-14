import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { CreateBitePage } from '../pages/create-bite.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  getFirestoreDocument,
  queryDocumentsByStringField,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');
const POSITION = { latitude: 48.137154, longitude: 11.576124 };

/**
 * GitHub issue #2018: copying another member's Bite.
 *
 * Covers the two places the unit tests mock, where the copy meets Firestore:
 * the Bite the form writes, and the tried-out tick the post leaves on the
 * poster's bucket list, which has to pass the security rules for real.
 */
test.describe('Copy another member’s Bite', () => {
  test('posts the copy in its own currency and ticks the source off the bucket list', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const runId = Date.now();
    const sourceId = `copy-source-${runId}`;
    const dishName = `Hibiscus Ice Tea ${runId}`;
    const bucketListId = `copy-list-${runId}`;

    // A Bite of another member, old enough for the price to be dated, and in
    // a currency neither the Munich position nor the settings fallback would
    // pick - so the posted currency can only have come from the copy.
    await seedFirestoreDocument(page, `bites/${sourceId}`, {
      userId: { stringValue: TEST_USERS.fresh.uid },
      name: { stringValue: dishName },
      imageStatus: { stringValue: 'uploaded' },
      place: { stringValue: `Copy Café ${runId}` },
      price: { stringValue: '4.5' },
      currency: { stringValue: 'USD' },
      rating: { integerValue: '4' },
      position: {
        mapValue: {
          fields: {
            latitude: { doubleValue: POSITION.latitude },
            longitude: { doubleValue: POSITION.longitude },
          },
        },
      },
      createdAt: { stringValue: '2026-01-16T12:00:00.000Z' },
      createdAtTimestamp: { integerValue: '1768564800000' },
    });

    await seedFirestoreDocument(page, `bucketlists/${bucketListId}`, {
      userId: { stringValue: TEST_USERS.default.uid },
      name: { stringValue: `Copy Favorites ${runId}` },
      biteIds: { arrayValue: { values: [{ stringValue: sourceId }] } },
      createdAt: { stringValue: new Date().toISOString() },
      createdAtTimestamp: { integerValue: String(Date.now()) },
    });

    // The location's currency (EUR for Munich) used to replace the copied one
    // whenever its lookup answered after the draft was in the form - the
    // order a real network gives. Holding the answer back makes this run take
    // that order every time instead of only sometimes.
    await page.route('**/getCurrencyByPosition', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await route.continue();
    });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    await page.goto(`/bite/${sourceId}`);
    const details = new BiteDetailsPage(page);
    await dismissCoachMarks(page);
    const currencyLookup = page.waitForResponse('**/getCurrencyByPosition');
    await details.copyButton.click();
    await page.waitForURL('**/new-bite');

    const createBite = new CreateBitePage(page);
    await createBite.expectPrefilledWith({
      name: dishName,
      place: `Copy Café ${runId}`,
      price: '4.5',
    });
    await expect(createBite.copiedPriceHint).toContainText('January 2026');

    // Only post once the location's currency has had its chance to replace
    // the copied one.
    await currencyLookup;
    await createBite.uploadImage(IMAGE_FIXTURE);
    await expect(createBite.post).toBeEnabled();
    await createBite.submit();
    await page.waitForURL('**/home');

    // The copy is the default user's Bite of the same dish, in the source's
    // currency, and carries nothing that points back at the source.
    let copyPath = '';
    await expect
      .poll(
        async () => {
          const copies = (
            await queryDocumentsByStringField(page, 'bites', 'name', dishName)
          ).filter((bite) => bite.fields['userId'] === TEST_USERS.default.uid);
          copyPath = copies[0]?.path ?? '';
          return copies.map((bite) => bite.fields);
        },
        { timeout: 15_000 },
      )
      .toEqual([
        expect.objectContaining({
          name: dishName,
          currency: 'USD',
          rating: 0,
        }),
      ]);

    const copy = await getFirestoreDocument(page, copyPath);
    expect(copy).not.toHaveProperty('copiedFrom');

    // The post ticked the source off the poster's bucket list.
    await expect
      .poll(
        async () => {
          const list = await getFirestoreDocument(
            page,
            `bucketlists/${bucketListId}`,
          );
          return (
            (list?.['triedOutBites'] as { biteId: string }[] | undefined) ?? []
          ).map((tried) => tried.biteId);
        },
        { timeout: 15_000 },
      )
      .toEqual([sourceId]);

    await deleteFirestoreDocument(page, copyPath);
    await deleteFirestoreDocument(page, `bucketlists/${bucketListId}`);
    await deleteFirestoreDocument(page, `bites/${sourceId}`);
  });
});
