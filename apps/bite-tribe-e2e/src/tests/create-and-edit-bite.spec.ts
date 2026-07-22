import { join } from 'node:path';
import { expect, Page, Route, test } from '@playwright/test';
import { geohashForLocation } from 'geofire-common';
import { BiteDetailsPage } from '../pages/bite-details.page';
import { CreateBitePage } from '../pages/create-bite.page';
import { HomePage } from '../pages/home.page';
import { loginAsTestUser } from '../support/auth';
import { dismissCoachMarks } from '../support/coach-marks';
import { expectBiteFields, FIRESTORE_EMULATOR_URL } from '../support/firestore';
import { completeOnboardingIfNeeded } from '../support/onboarding';
import { TEST_USERS } from '../support/test-users';

const IMAGE_FIXTURE = join(__dirname, '..', 'fixtures', 'bite.jpg');
const POSITION = { latitude: 48.137154, longitude: 11.576124 };
const GOOGLE_POSITION = { latitude: 48.227154, longitude: 11.676124 };

async function expectPositionMarkerInsideMap(page: Page): Promise<void> {
  const map = page.locator('position bt-map .leaflet-container');
  const marker = map.locator('.leaflet-marker-icon');
  await map.scrollIntoViewIfNeeded();
  await expect(marker).toHaveCount(1);
  await expect
    .poll(async () => {
      const [mapBox, markerBox] = await Promise.all([
        map.boundingBox(),
        marker.boundingBox(),
      ]);
      if (!mapBox || !markerBox) return false;

      const markerCenter = {
        x: markerBox.x + markerBox.width / 2,
        y: markerBox.y + markerBox.height / 2,
      };
      return (
        markerCenter.x >= mapBox.x &&
        markerCenter.x <= mapBox.x + mapBox.width &&
        markerCenter.y >= mapBox.y &&
        markerCenter.y <= mapBox.y + mapBox.height
      );
    })
    .toBe(true);
}

async function mockCallable(
  page: Page,
  name: string,
  result: unknown,
  assertRequest?: (data: unknown) => void,
): Promise<void> {
  await page.route(`**/${name}`, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-headers': 'authorization,content-type',
          'access-control-allow-methods': 'POST',
          'access-control-allow-origin': '*',
        },
      });
      return;
    }

    assertRequest?.(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ result }),
    });
  });
}

async function seedVerifiedRestaurantBite(
  page: Page,
  options: { documentId: string; restaurantId: string; restaurantName: string },
): Promise<void> {
  const response = await page.request.patch(
    `${FIRESTORE_EMULATOR_URL}/bites/${options.documentId}`,
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        fields: {
          name: { stringValue: 'Verified restaurant seed' },
          place: { stringValue: options.restaurantName },
          restaurantId: { stringValue: options.restaurantId },
          userId: { stringValue: TEST_USERS.organisation.uid },
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
          price: { stringValue: '10.00' },
          currency: { stringValue: 'EUR' },
          createdAt: { stringValue: new Date().toISOString() },
          createdAtTimestamp: { integerValue: String(Date.now()) },
          addressStatus: { stringValue: 'pending' },
        },
      },
    },
  );

  expect(response.ok(), await response.text()).toBeTruthy();
}

test.describe('Create and maintain personal bites', () => {
  test.setTimeout(90_000);

  test('creates a rich Bite and later edits it with a verified restaurant', async ({
    page,
  }) => {
    const runId = Date.now();
    const originalName = `Crispy Tofu ${runId}`;
    const editedName = `Extra Crispy Tofu ${runId}`;
    const googleSearch = `Playwright Google Kitchen ${runId}`;
    const googleRestaurant = `Google Kitchen ${runId}`;
    const verifiedRestaurant = `Verified Kitchen ${runId}`;
    const restaurantId = `verified-restaurant-${runId}`;

    await seedVerifiedRestaurantBite(page, {
      documentId: `verified-restaurant-seed-${runId}`,
      restaurantId,
      restaurantName: verifiedRestaurant,
    });
    await mockCallable(page, 'getCurrencyByPosition', { currency: 'EUR' });
    await mockCallable(
      page,
      'searchPlaces',
      [
        {
          placeId: `google-place-${runId}`,
          name: googleRestaurant,
          address: '1 Playwright Way, Munich',
          position: GOOGLE_POSITION,
        },
      ],
      (data) =>
        expect(data).toEqual({
          data: { searchText: googleSearch, position: POSITION },
        }),
    );

    await loginAsTestUser(page);
    await completeOnboardingIfNeeded(page);
    await dismissCoachMarks(page);

    const biteForm = new CreateBitePage(page);
    await biteForm.open();
    await biteForm.uploadImage(IMAGE_FIXTURE);
    await biteForm.fillName(originalName);
    await biteForm.chooseGoogleRestaurant(googleSearch, googleRestaurant);
    await expectPositionMarkerInsideMap(page);
    await biteForm.fillPrice('14.50');
    await biteForm.chooseRating(4);
    await biteForm.fillDescription('Crispy tofu with chili and lime.');
    await biteForm.addTag('crispy');
    await biteForm.addTag('spicy');
    await biteForm.expectPostEnabled();
    await biteForm.submit();

    await page.waitForURL('**/home');
    await expectBiteFields(page, originalName, {
      place: googleRestaurant,
      restaurantId: '',
      position: GOOGLE_POSITION,
      price: '14.50',
      rating: 4,
      description: 'Crispy tofu with chili and lime.',
      tags: ['crispy', 'spicy'],
      imageStatus: 'uploaded',
    });

    const home = new HomePage(page);
    await expect(home.biteCard(originalName)).toBeVisible();
    await home.openBite(originalName);

    const details = new BiteDetailsPage(page);
    await details.expectBite({
      name: originalName,
      restaurant: googleRestaurant,
      description: 'Crispy tofu with chili and lime.',
      tags: ['crispy', 'spicy'],
      rating: 4,
    });
    await details.openEdit();

    await biteForm.fillName(editedName);
    await biteForm.fillPrice('16.75');
    await biteForm.chooseRating(5);
    await biteForm.fillDescription(
      'Even crispier tofu with chili, lime, and sesame.',
    );
    await biteForm.addTag('sesame');
    await biteForm.chooseLocalRestaurant(verifiedRestaurant);
    await expectPositionMarkerInsideMap(page);
    await biteForm.expectPostEnabled();
    await biteForm.submit();

    await page.waitForURL(/\/bite\/[^/]+$/);
    await expectBiteFields(page, editedName, {
      place: verifiedRestaurant,
      restaurantId,
      position: POSITION,
      price: '16.75',
      rating: 5,
      description: 'Even crispier tofu with chili, lime, and sesame.',
      tags: ['crispy', 'spicy', 'sesame'],
      imageStatus: 'uploaded',
    });
    await details.expectBite({
      name: editedName,
      restaurant: verifiedRestaurant,
      description: 'Even crispier tofu with chili, lime, and sesame.',
      tags: ['crispy', 'spicy', 'sesame'],
      rating: 5,
    });
  });
});
