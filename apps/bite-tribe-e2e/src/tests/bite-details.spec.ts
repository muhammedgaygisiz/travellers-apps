import { expect, Page, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { HomePage } from '../pages/home.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import {
  expectFirestoreDocument,
  FIRESTORE_EMULATOR_URL,
  getDocumentByStringField,
} from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const POSITION = { latitude: 48.147154, longitude: 11.576124 };

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

async function seedDocument(
  page: Page,
  documentPath: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/${documentPath}`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: { fields },
    },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
}

test.describe('Inspect Bite details', () => {
  test('shows contextual details and supports share, directions, review, bucket list, and creator navigation', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const runId = Date.now();
    const biteId = `details-bite-${runId}`;
    const biteName = `Details Dumplings ${runId}`;
    const restaurant = `Details Kitchen ${runId}`;
    const creatorId = `details-creator-${runId}`;
    const creatorName = `Details Creator ${runId}`;
    const bucketListId = `details-list-${runId}`;
    const bucketListName = `Details Favorites ${runId}`;
    const review = `A detailed review from Playwright ${runId}`;
    const sharedUrl = `https://bite-tribe.web.app/s/bite/${biteId}`;

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData): Promise<void> => {
          (window as typeof window & { __lastShare?: ShareData }).__lastShare =
            data;
        },
      });
    });

    await Promise.all([
      seedDocument(page, `users/${creatorId}`, {
        userId: { stringValue: creatorId },
        displayName: { stringValue: creatorName },
        public: { booleanValue: true },
        about: { stringValue: 'Creator profile used by the details E2E test.' },
      }),
      seedDocument(page, `settings/${TEST_USERS.default.uid}`, {
        currency: { stringValue: 'USD' },
      }),
      seedDocument(page, 'meta/exchangeRates', {
        EUR: { doubleValue: 1 },
        USD: { doubleValue: 2 },
      }),
      seedDocument(page, `bucketlists/${bucketListId}`, {
        userId: { stringValue: TEST_USERS.default.uid },
        name: { stringValue: bucketListName },
        biteIds: { arrayValue: { values: [] } },
        createdAt: { stringValue: new Date().toISOString() },
        createdAtTimestamp: { integerValue: String(Date.now()) },
      }),
    ]);

    await seedDocument(page, `bites/${biteId}`, {
      name: { stringValue: biteName },
      place: { stringValue: restaurant },
      description: {
        stringValue: 'Hand-folded dumplings with a deeply savory filling.',
      },
      price: { stringValue: '10.00' },
      currency: { stringValue: 'EUR' },
      rating: { integerValue: '4' },
      tags: {
        arrayValue: {
          values: [{ stringValue: 'dumplings' }, { stringValue: 'savory' }],
        },
      },
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
      userId: { stringValue: creatorId },
      city: { stringValue: 'Munich' },
      country: { stringValue: 'Germany' },
      addressStatus: { stringValue: 'resolved' },
      createdAt: { stringValue: new Date().toISOString() },
      createdAtTimestamp: { integerValue: String(Date.now()) },
    });

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const home = new HomePage(page);
    await expect(home.biteCard(biteName)).toBeVisible();
    await home.openBite(biteName);
    await dismissCoachMarks(page);

    const details = new BiteDetailsPage(page);
    await details.expectBite({
      name: biteName,
      restaurant,
      description: 'Hand-folded dumplings with a deeply savory filling.',
      tags: ['dumplings', 'savory'],
      rating: 4,
    });
    await expect(
      details.root.getByText(creatorName, { exact: true }),
    ).toBeVisible();
    await expect(details.root.locator('.restaurant-distance')).toContainText(
      'km',
    );
    await expect(
      details.root.getByText('$20.00', { exact: true }),
    ).toBeVisible();
    await expect(
      details.root.getByText('€10.00', { exact: true }),
    ).toBeVisible();

    await details.shareButton.click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as typeof window & { __lastShare?: ShareData }).__lastShare,
        ),
      )
      .toEqual({
        title: `${biteName} @ ${restaurant}`,
        text: `EUR 10.00 · ⭐️ 4\n${sharedUrl}`,
        url: sharedUrl,
      });

    await page.context().route('https://www.google.com/maps/dir/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<title>Directions</title>',
      }),
    );
    const [directionsPage] = await Promise.all([
      page.waitForEvent('popup'),
      details.navigationButton.click(),
    ]);
    await directionsPage.waitForLoadState('domcontentloaded');
    expect(directionsPage.url()).toContain(
      `google.com/maps/dir/?api=1&destination=${POSITION.latitude},${POSITION.longitude}`,
    );
    await directionsPage.close();

    await details.submitReview(review);
    await expect
      .poll(() => getDocumentByStringField(page, 'reviews', 'review', review), {
        timeout: 15_000,
      })
      .toMatchObject({
        review,
        biteId: `/bites/${biteId}`,
        authorId: TEST_USERS.default.uid,
      });

    await details.saveToBucketList(bucketListName);
    await expectFirestoreDocument(page, `bucketlists/${bucketListId}`, {
      biteIds: [biteId],
    });

    await details.root.getByText(creatorName, { exact: true }).click();
    await page.waitForURL(`**/profile/${creatorId}`);
  });
});
