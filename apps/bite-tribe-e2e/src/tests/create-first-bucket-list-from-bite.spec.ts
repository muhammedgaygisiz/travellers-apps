import { expect, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { BucketListsPage } from '../pages/bucket-lists.page';
import { HomePage } from '../pages/home.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  deleteFirestoreDocument,
  queryDocumentsByStringField,
  seedFirestoreDocument,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.137154, longitude: 11.576124 };
const USER = TEST_USERS.fresh;

/**
 * The account this journey needs owns nothing, so the empty add dialog is the
 * one it actually gets. Other specs seed lists onto the shared default user,
 * hence the dedicated account — and the sweep, because the emulator keeps every
 * write for the whole run and a retry would otherwise start with the list this
 * test just created.
 */
const clearBucketLists = async (
  page: Parameters<typeof queryDocumentsByStringField>[0],
): Promise<void> => {
  const lists = await queryDocumentsByStringField(
    page,
    'bucketlists',
    'userId',
    USER.uid,
  );

  await Promise.all(
    lists.map((list) => deleteFirestoreDocument(page, list.path)),
  );
};

/**
 * Regression cover for GitHub issue #1231: on an account with no lists at all,
 * creating the first one from a Bite's add dialog reported success and
 * persisted nothing — no list, no membership, no error. The suite only ever
 * exercised selecting a list that had been seeded beforehand, so nothing
 * touched the inline create-and-add path.
 */
test.describe('Create the first bucket list from a Bite', () => {
  test('creates the list, adds the Bite once, and shows the membership', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `first-list-bite-${runId}`;
    const biteName = `First List Ramen ${runId}`;
    const bucketListName = `First List Favorites ${runId}`;

    await clearBucketLists(page);

    await seedFirestoreDocument(page, `bites/${biteId}`, {
      name: { stringValue: biteName },
      place: { stringValue: `First List Kitchen ${runId}` },
      price: { stringValue: '12.00' },
      currency: { stringValue: 'EUR' },
      rating: { integerValue: '5' },
      position: {
        mapValue: {
          fields: {
            latitude: { doubleValue: POSITION.latitude },
            longitude: { doubleValue: POSITION.longitude },
          },
        },
      },
      geohash: {
        stringValue: geohashForLocation([
          POSITION.latitude,
          POSITION.longitude,
        ]),
      },
      createdAt: { stringValue: new Date().toISOString() },
      createdAtTimestamp: { integerValue: String(runId) },
    });

    await loginAsTestUser(page, USER);
    await completeOnboardingIfNeeded(page, USER);
    await dismissCoachMarks(page);

    const home = new HomePage(page);
    await expect(home.biteCard(biteName)).toBeVisible();
    await home.openBite(biteName);
    await dismissCoachMarks(page);

    const details = new BiteDetailsPage(page);
    await details.expectBucketListMembership(false);

    // The empty state: the add dialog offers list creation and nothing else.
    await details.bucketListButton.click();
    await expect(details.bucketListPopoverItems).toHaveCount(1);
    await expect(details.newBucketListItem).toBeVisible();

    // A name of only whitespace is not a list. The prompt has to stay open
    // rather than close as though something had been saved.
    await details.openNewBucketListPrompt();
    await details.submitNewBucketListName('   ');
    await expect(details.newBucketListAlert).toBeVisible();
    expect(
      await queryDocumentsByStringField(
        page,
        'bucketlists',
        'userId',
        USER.uid,
      ),
    ).toHaveLength(0);

    await details.submitNewBucketListName(bucketListName);

    // Confirmation belongs to the settled write, not to the prompt closing.
    await expect(page.locator('ion-toast')).toContainText(
      'Bucket list created and Bite added!',
    );

    // Exactly one list, holding exactly this Bite.
    await expect
      .poll(
        () =>
          queryDocumentsByStringField(page, 'bucketlists', 'userId', USER.uid),
        { timeout: 15_000 },
      )
      .toMatchObject([
        {
          fields: {
            userId: USER.uid,
            name: bucketListName,
            biteIds: [biteId],
          },
        },
      ]);

    await details.expectBucketListMembership(true);

    // Reopening the dialog offers the new list instead of the empty state.
    await details.bucketListButton.click();
    await expect(details.bucketListPopoverItems).toHaveCount(2);
    await expect(
      details.bucketListPopoverItems.filter({ hasText: bucketListName }),
    ).toBeVisible();
    await details.dismissBucketListPopover();

    // Bite details runs without the header menu, so My Bucket Lists is reached
    // from Home.
    await page.goBack();
    await page.waitForURL('**/home');

    const bucketLists = new BucketListsPage(page);
    await bucketLists.open();
    await dismissCoachMarks(page);
    await bucketLists.expectList({ name: bucketListName, biteCount: 1 });

    await clearBucketLists(page);
    await deleteFirestoreDocument(page, `bites/${biteId}`);
  });
});
